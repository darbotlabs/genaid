#!/usr/bin/env python3
"""Optional bridge to genaid_audio.agentyankers.

This file does not vendor the private pipeline. If the package is not
installed, the process reports that and exits 0. Secrets stay in the
environment; this adapter never prints them.
"""

from __future__ import annotations

import json
import sys


def main() -> int:
    raw = sys.stdin.read()
    try:
        request = json.loads(raw) if raw.strip() else {}
    except json.JSONDecodeError:
        emit({"ok": False, "available": False, "reason": "request"})
        return 0
    if not isinstance(request, dict):
        emit({"ok": False, "available": False, "reason": "request"})
        return 0
    try:
        from genaid_audio.agentyankers import (  # type: ignore
            SCHEMA_VERSION,
            AgentPersona,
            CallSession,
            HighlightClip,
            MarkIndexEntry,
            PremiseOutline,
            export_json_schemas,
            generate_commentary,
            recording_disclosure,
            require_call_consent,
            require_publish_consent,
            select_highlights,
        )
    except Exception:
        emit({"ok": False, "available": False, "reason": "import"})
        return 0

    op = request.get("op") or "ping"
    try:
        result = dispatch(
            op,
            request,
            schema_version=SCHEMA_VERSION,
            AgentPersona=AgentPersona,
            CallSession=CallSession,
            HighlightClip=HighlightClip,
            MarkIndexEntry=MarkIndexEntry,
            PremiseOutline=PremiseOutline,
            export_json_schemas=export_json_schemas,
            generate_commentary=generate_commentary,
            recording_disclosure=recording_disclosure,
            require_call_consent=require_call_consent,
            require_publish_consent=require_publish_consent,
            select_highlights=select_highlights,
        )
    except Exception as exc:
        emit({"ok": False, "available": True, "error": error_payload(exc)})
        return 0
    emit({"ok": True, "available": True, "result": result})
    return 0


def dispatch(op, request, **core):
    if op == "ping":
        return {"schema_version": core["schema_version"]}
    if op == "recording_disclosure":
        return {"text": core["recording_disclosure"]()}
    if op == "export_json_schemas":
        return core["export_json_schemas"]()
    if op == "require_call_consent":
        mark = core["MarkIndexEntry"].model_validate(request.get("mark"))
        core["require_call_consent"](mark)
        return {"mark_id": mark.mark_id, "action": "call"}
    if op == "require_publish_consent":
        mark = core["MarkIndexEntry"].model_validate(request.get("mark"))
        core["require_publish_consent"](mark)
        return {"mark_id": mark.mark_id, "action": "publish"}
    if op == "select_highlights":
        sessions = [
            core["CallSession"].model_validate(item)
            for item in request.get("sessions") or []
        ]
        marks = [
            core["MarkIndexEntry"].model_validate(item)
            for item in request.get("marks") or []
        ]
        raw_limit = request.get("limit", 3)
        limit = 3 if raw_limit is None else int(raw_limit)
        clips = core["select_highlights"](sessions, marks, limit=limit)
        return [clip.model_dump(mode="json") for clip in clips]
    if op == "generate_commentary":
        premise = core["PremiseOutline"].model_validate(request.get("premise"))
        host = core["AgentPersona"].model_validate(request.get("host"))
        clips = [
            core["HighlightClip"].model_validate(item)
            for item in request.get("clips") or []
        ]
        lines = core["generate_commentary"](premise, host, clips)
        return [line.model_dump(mode="json") for line in lines]
    raise ValueError("unknown adapter op")


def error_payload(exc: Exception) -> dict:
    name = type(exc).__name__
    if name == "ValidationError":
        return {"code": "invalid", "message": "invalid AgentYankers payload"}
    code = getattr(exc, "code", "error")
    message = getattr(exc, "message", None) or "AgentYankers core refused the payload."
    if looks_like_phone(str(message)):
        message = (
            "Refusing payload: AgentYankers does not accept phone numbers. "
            "Use an agent id or a LiveKit identity."
        )
        code = "phone_number_forbidden"
    body = {"code": code, "message": str(message)}
    for key in ("mark_id", "action", "field"):
        value = getattr(exc, key, None)
        if value:
            body[key] = value
    return body


def looks_like_phone(value: str) -> bool:
    import re

    patterns = (
        re.compile(r"\+\d[\d\s().-]{7,}\d"),
        re.compile(r"\(\d{3}\)\s*\d{3}[-.\s]\d{4}"),
        re.compile(r"\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b"),
        re.compile(r"\b\d{10,15}\b"),
    )
    return any(pattern.search(value) for pattern in patterns)


def emit(payload: dict) -> None:
    sys.stdout.write(json.dumps(payload, ensure_ascii=False))
    sys.stdout.write("\n")


if __name__ == "__main__":
    raise SystemExit(main())
