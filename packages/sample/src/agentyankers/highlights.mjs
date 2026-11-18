/**
 * Local highlight picker.
 *
 * Published rule: score improvised exchanges funny, then interesting; keep one
 * strong exchange from each call; fill remaining slots; never select the
 * recording disclosure. Lexical bonuses stay in the core selector.
 */

import { AgentYankersError } from "./guardrails.mjs"
import { validateHighlight, validateSession } from "./schema.mjs"

export function selectHighlights(sessions, marks, limit = 3) {
    if (!Number.isInteger(limit) || limit < 1)
        throw new AgentYankersError("limit must be at least 1", {
            code: "invalid",
        })
    const parsedSessions = (sessions || []).map((session) =>
        validateSession(session)
    )
    const names = new Map(
        (marks || []).map((mark) => [mark.mark_id, mark.display_name])
    )
    const grouped = new Map()
    for (const session of parsedSessions) {
        grouped.set(session.session_id, scoreExchanges(session, names))
    }
    const chosen = []
    const perSession = []
    for (const session of parsedSessions) {
        const pool = grouped.get(session.session_id) || []
        if (pool.length) perSession.push(best(pool))
    }
    perSession.sort((a, b) => rank(b) - rank(a) || tie(a, b))
    for (const item of perSession) {
        if (chosen.length >= limit) break
        chosen.push(item)
    }
    if (chosen.length < limit) {
        const chosenKeys = new Set(
            chosen.map((item) => `${item.session_id}:${item.start}`)
        )
        const rest = []
        for (const pool of grouped.values()) {
            for (const item of pool) {
                if (!chosenKeys.has(`${item.session_id}:${item.start}`))
                    rest.push(item)
            }
        }
        rest.sort((a, b) => rank(b) - rank(a) || tie(a, b))
        for (const item of rest) {
            if (chosen.length >= limit) break
            chosen.push(item)
        }
    }
    const order = new Map(
        parsedSessions.map((session, index) => [session.session_id, index])
    )
    chosen.sort(
        (a, b) =>
            order.get(a.session_id) - order.get(b.session_id) ||
            a.start - b.start
    )
    return chosen.map((item, index) =>
        validateHighlight({
            schema_version: "agentyankers/v1",
            clip_id: `clip-${String(index + 1).padStart(2, "0")}`,
            session_id: item.session_id,
            mark_id: item.mark_id,
            agent_name: item.agent_name,
            mark_name: item.mark_name,
            start_seconds: item.start,
            end_seconds: item.end,
            transcript_excerpt: item.excerpt,
            score: item.score,
            reason: item.reason,
            recording_ref_id: item.recording_ref_id,
        })
    )
}

function scoreExchanges(session, names) {
    const recording = callRecording(session)
    const turns = session.transcript
    const exchanges = []
    for (let index = 0; index < turns.length; index++) {
        const turn = turns[index]
        if (turn.speaker_role !== "mark") continue
        let agent = null
        let follow = index + 1
        while (follow < turns.length && turns[follow].speaker_role !== "mark") {
            if (
                turns[follow].speaker_role === "agent" &&
                turns[follow].improvised
            ) {
                agent = turns[follow]
                break
            }
            follow++
        }
        if (!agent) continue
        const start = turn.start_seconds
        const end = agent.end_seconds
        if (overlapsDisclosure(turns, start, end)) continue
        const tags = uniqueTags([...turn.tags, ...agent.tags])
        let score = 0
        if (tags.includes("funny")) score += 5
        if (tags.includes("interesting")) score += 3
        if (agent.improvised) score += 1
        const duration = end - start
        if (duration >= 0.5 && duration <= 20) score += 1
        const labels = []
        if (tags.includes("funny")) labels.push("funny")
        if (tags.includes("interesting")) labels.push("interesting")
        exchanges.push({
            session_id: session.session_id,
            mark_id: session.mark_id,
            agent_name: session.agent_name,
            mark_name: names.get(session.mark_id) || turn.speaker_name,
            start,
            end,
            excerpt: `${turn.speaker_name}: ${turn.text} ${agent.speaker_name}: ${agent.text}`,
            score,
            reason: labels.length ? labels.join(" and ") : "improvised exchange",
            recording_ref_id: recording.ref_id,
        })
    }
    return exchanges
}

function overlapsDisclosure(turns, start, end) {
    return turns.some(
        (turn) =>
            turn.speaker_role === "disclosure" &&
            turn.start_seconds < end &&
            start < turn.end_seconds
    )
}

function callRecording(session) {
    const recording = session.recordings.find((item) => item.kind === "call")
    if (!recording) {
        throw new AgentYankersError(
            `${session.session_id} has no call recording`,
            { code: "missing_recording" }
        )
    }
    return recording
}

function best(pool) {
    return pool.reduce((winner, item) =>
        rank(item) > rank(winner) ||
        (rank(item) === rank(winner) && tie(item, winner) < 0)
            ? item
            : winner
    )
}

function rank(item) {
    return item.score
}

function tie(a, b) {
    return a.start - b.start || a.session_id.localeCompare(b.session_id)
}

function uniqueTags(tags) {
    const cleaned = []
    for (const tag of tags) {
        if (!cleaned.includes(tag)) cleaned.push(tag)
    }
    return cleaned
}
