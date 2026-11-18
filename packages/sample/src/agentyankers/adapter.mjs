/**
 * Optional import of genaid_audio.agentyankers.
 * A missing package returns null. The local drafts stay in charge.
 */

import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { AgentYankersError, ConsentRefusal, PhoneNumberRefusal } from "./guardrails.mjs"

const SCRIPT = fileURLToPath(new URL("./adapter.py", import.meta.url))

let probeCache

export function probeCore(options = {}) {
    if (probeCache && !options.force) return probeCache
    probeCache = runCore({ op: "ping" }, options)
    return probeCache
}

export function loadCoreAdapter(options = {}) {
    const probe = probeCore(options)
    if (!probe?.available) return null
    return {
        available: true,
        schemaVersion: probe.result?.schema_version,
        recordingDisclosure() {
            return call("recording_disclosure", {}, options).text
        },
        exportJsonSchemas() {
            return call("export_json_schemas", {}, options)
        },
        requireCallConsent(mark) {
            return call("require_call_consent", { mark }, options)
        },
        requirePublishConsent(mark) {
            return call("require_publish_consent", { mark }, options)
        },
        selectHighlights(sessions, marks, limit = 3) {
            return call(
                "select_highlights",
                { sessions, marks, limit },
                options
            )
        },
        generateCommentary(premise, host, clips) {
            return call(
                "generate_commentary",
                { premise, host, clips },
                options
            )
        },
    }
}

function call(op, payload, options) {
    const response = runCore({ op, ...payload }, options)
    if (!response.ok) throw errorFrom(response)
    return response.result
}

function runCore(payload, options = {}) {
    const python = options.python || process.env.AGENTYANKERS_PYTHON || "python3"
    const result = spawnSync(python, [SCRIPT], {
        input: JSON.stringify(payload),
        encoding: "utf8",
        timeout: options.timeout ?? 20000,
        env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
    })
    if (result.error) {
        return {
            ok: false,
            available: false,
            reason: result.error.code === "ENOENT" ? "python" : "python",
        }
    }
    const text = String(result.stdout || "").trim()
    if (!text) return { ok: false, available: false, reason: "python" }
    try {
        return JSON.parse(text)
    } catch {
        return { ok: false, available: false, reason: "python" }
    }
}

function errorFrom(response) {
    const body = response.error || {}
    const message = body.message || "AgentYankers core refused the payload."
    if (body.code === "phone_number_forbidden")
        return new PhoneNumberRefusal(body.field || "payload")
    if (
        body.code === "consent_missing" ||
        body.code === "consent_scope" ||
        body.code === "disclosure_required"
    ) {
        return new ConsentRefusal(message, {
            code: body.code,
            mark_id: body.mark_id,
            action: body.action,
        })
    }
    return new AgentYankersError(message, {
        code: body.code || "error",
        mark_id: body.mark_id,
        action: body.action,
        field: body.field,
    })
}
