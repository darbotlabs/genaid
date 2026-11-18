/**
 * Writing-room drafts. Outputs are agentyankers/v1 objects the core loaders accept.
 * The disclosure sentence is copied, never rewritten.
 */

import {
    ID,
    PRODUCER,
    RECORDING_DISCLOSURE,
    SCHEMA_VERSION,
    SHOW_NAME,
    WRITING_PROVIDERS,
} from "./constants.mjs"
import {
    AgentYankersError,
    assertNoPhoneNumbers,
    assertPublishableSession,
} from "./guardrails.mjs"
import { selectHighlights } from "./highlights.mjs"
import { loadCoreAdapter } from "./adapter.mjs"
import {
    jsonSchema,
    validateCommentaryLine,
    validateHighlight,
    validatePersonaCast,
    validatePremise,
    validateShowNotes,
} from "./schema.mjs"

const DEFAULT_CONSTRAINTS =
    "Beats are an outline, not lines to read. Improvise from the mark's replies. Play the recording disclosure before any improvisation. Marks are opted-in adults. Do not use phone numbers."

export function resolveWritingModel(name = "foundry") {
    const provider = WRITING_PROVIDERS[String(name || "foundry").trim().toLowerCase()]
    if (!provider) {
        throw new AgentYankersError(
            "Writing-room provider must be foundry, copilot, or openwebui.",
            { code: "invalid" }
        )
    }
    return provider
}

export function draftPremise(brief) {
    assertNoPhoneNumbers(brief, "premise brief")
    if (brief && typeof brief === "object" && brief.premise_id && brief.beats) {
        try {
            return validatePremise(brief)
        } catch (error) {
            if (error.code === "phone_number_forbidden") throw error
        }
    }
    const title = clip(brief?.title || brief?.idea || "Untitled premise", 120)
    const logline = clip(
        brief?.logline || brief?.idea || brief?.title || "An improvised call.",
        400
    )
    return validatePremise({
        schema_version: SCHEMA_VERSION,
        premise_id: slugId("prem-", brief?.premise_id || title, ID.premise),
        title,
        logline,
        tone: clip(brief?.tone || "deadpan adult comedy", 80),
        constraints: clip(brief?.constraints || DEFAULT_CONSTRAINTS, 1000),
        target_duration_seconds: duration(brief?.target_duration_seconds),
        beats: normalizeBeats(brief?.beats, logline),
    })
}

export function draftPersonas(brief) {
    assertNoPhoneNumbers(brief, "persona brief")
    if (brief?.personas && !brief.host) {
        try {
            return validatePersonaCast(stampCast(brief))
        } catch (error) {
            if (error.code === "phone_number_forbidden") throw error
        }
    }
    const host = personaFromBrief(brief?.host, "host")
    const callers = (brief?.callers || []).map((caller) =>
        personaFromBrief(caller, "caller")
    )
    if (!host)
        throw new AgentYankersError("persona host is required", {
            code: "invalid",
        })
    return validatePersonaCast({
        schema_version: SCHEMA_VERSION,
        personas: [host, ...callers],
    })
}

export async function draftCommentary(input, options = {}) {
    const packet = publishablePacket(input)
    const core = await resolveCore(options)
    const highlights = core?.selectHighlights
        ? core
              .selectHighlights(packet.sessions, packet.marks, packet.limit)
              .map((clip) => validateHighlight(clip))
        : selectHighlights(packet.sessions, packet.marks, packet.limit)
    const commentary = core?.generateCommentary
        ? core.generateCommentary(packet.premise, packet.host, highlights)
        : localCommentary(packet.premise, packet.host, highlights)
    return {
        schema_version: SCHEMA_VERSION,
        highlights,
        commentary: acceptCommentary(commentary, {
            host: packet.host,
            highlights,
        }),
    }
}

export function generateCommentary(premise, host, clips) {
    return acceptCommentary(localCommentary(premise, host, clips), {
        host,
        highlights: clips,
    })
}

export function draftShowNotes(input, commentary) {
    const packet = publishablePacket(input)
    const highlights =
        commentary?.highlights ||
        selectHighlights(packet.sessions, packet.marks, packet.limit)
    const showNotes = validateShowNotes(buildShowNotes(packet, highlights))
    return {
        json: showNotes,
        markdown: renderShowNotes(showNotes),
    }
}

export function renderShowNotes(notes) {
    const lines = [
        `# ${notes.show_name}: ${notes.title}`,
        "",
        `Produced by ${notes.producer}.`,
        "",
        notes.logline,
        "",
        "## Recording disclosure",
        "",
        notes.disclosure,
        "",
        "## Chapters",
        "",
    ]
    for (const chapter of notes.chapters) {
        lines.push(`- ${timecode(chapter.start_seconds)} ${chapter.title}`)
    }
    lines.push("", "## Marks", "")
    for (const mark of notes.marks) {
        lines.push(
            `- ${mark.display_name} (${mark.kind}) — consent ${mark.consent_id}`
        )
    }
    lines.push("", "## Voices", "")
    for (const voice of notes.voices) {
        lines.push(`- ${voice.voice_id} (${voice.library}, ${voice.provider})`)
    }
    lines.push("")
    const markdown = lines.join("\n")
    assertNoPhoneNumbers(markdown, "show notes")
    return markdown
}

export function premisePrompt(brief) {
    return [
        "You are the AgentYankers writing room.",
        "Write a premise outline for an adult comedy call. The beats are an outline for improvisation, not lines to read.",
        "Marks are opted-in adults. Do not invent phone numbers, API keys, or LiveKit secrets.",
        `schema_version must be ${SCHEMA_VERSION}.`,
        "Return JSON for one PremiseOutline.",
        "Brief:",
        JSON.stringify(brief),
    ].join("\n")
}

export function personaPrompt(brief) {
    return [
        "You are the AgentYankers writing room.",
        "Write a PersonaCast. Exactly one host. The host voice provider is vibevoice. Caller voice provider is personaplex.",
        "persona_prompt is an improvisation prompt, not a script.",
        "Do not invent phone numbers, API keys, or LiveKit secrets.",
        `schema_version must be ${SCHEMA_VERSION} on the cast, each persona, and each voice.`,
        "Return JSON for one PersonaCast.",
        "Brief:",
        JSON.stringify(brief),
    ].join("\n")
}

export function commentaryPrompt(draft, packet) {
    return [
        "You are the AgentYankers host writer.",
        "Rewrite the intro, setup, button, and outro lines so they sound like a host.",
        "Keep every line_id, kind, speaker, voice, and anchor_clip_id.",
        "The disclosure line must stay exactly this sentence:",
        RECORDING_DISCLOSURE,
        "Do not add phone numbers, contact refs, API keys, or LiveKit secrets.",
        `schema_version must be ${SCHEMA_VERSION}.`,
        'Return JSON: { "commentary": [ CommentaryLine, ... ] }.',
        "Premise logline:",
        packet.premise.logline,
        "Draft:",
        JSON.stringify(draft.commentary),
    ].join("\n")
}

export function showNotesPrompt(draft) {
    return [
        "You are the AgentYankers show-notes editor.",
        "You may tighten the episode title and the chapter titles.",
        "Do not change show_name, producer, episode_id, premise_id, logline, disclosure, marks, voices, or chapter times.",
        "Omit contact refs. Do not add phone numbers or secrets.",
        "The disclosure must stay exactly:",
        RECORDING_DISCLOSURE,
        "Return JSON for one ShowNotes object.",
        "Draft:",
        JSON.stringify(draft.json),
    ].join("\n")
}

export function responseSchema(task) {
    if (task === "premise") return jsonSchema("PremiseOutline")
    if (task === "personas") return jsonSchema("PersonaCast")
    if (task === "commentary") {
        return {
            type: "object",
            additionalProperties: false,
            required: ["commentary"],
            properties: {
                commentary: {
                    type: "array",
                    items: jsonSchema("CommentaryLine"),
                },
            },
        }
    }
    if (task === "show-notes") return jsonSchema("ShowNotes")
    throw new AgentYankersError("unknown writing-room task", { code: "invalid" })
}

export async function writeTask(task, input, options = {}) {
    const provider = resolveWritingModel(options.provider || "foundry")
    if (options.offline)
        return seal(task, await offlineDraft(task, input, options))
    if (typeof options.complete !== "function") {
        throw new AgentYankersError(
            "An online writing-room task needs a model complete() callback.",
            { code: "invalid" }
        )
    }
    if (task === "premise") {
        const raw = await options.complete({
            task,
            provider,
            prompt: premisePrompt(input),
            schema: responseSchema(task),
        })
        return seal(task, { json: acceptPremise(raw) })
    }
    if (task === "personas") {
        const raw = await options.complete({
            task,
            provider,
            prompt: personaPrompt(input),
            schema: responseSchema(task),
        })
        return seal(task, { json: acceptPersonas(raw) })
    }
    if (task === "commentary") {
        const draft = await draftCommentary(input, options)
        const raw = await options.complete({
            task,
            provider,
            prompt: commentaryPrompt(draft, publishablePacket(input)),
            schema: responseSchema(task),
        })
        const commentary = acceptCommentary(unwrap(raw, "commentary"), {
            host: hostFrom(input),
            highlights: draft.highlights,
        })
        return seal(task, {
            json: {
                schema_version: SCHEMA_VERSION,
                highlights: draft.highlights,
                commentary,
            },
        })
    }
    if (task === "show-notes") {
        const commentary = await draftCommentary(input, options)
        const draft = draftShowNotes(input, commentary)
        const raw = await options.complete({
            task,
            provider,
            prompt: showNotesPrompt(draft),
            schema: responseSchema(task),
        })
        return seal(task, acceptShowNotes(raw, draft))
    }
    throw new AgentYankersError("unknown writing-room task", { code: "invalid" })
}

export function acceptPremise(raw) {
    return draftPremise(unwrap(raw, "premise"))
}

export function acceptPersonas(raw) {
    return draftPersonas(unwrap(raw, "personas"))
}

export function acceptCommentary(lines, context) {
    const list = Array.isArray(lines) ? lines : lines?.commentary
    if (!Array.isArray(list) || !list.length) {
        throw new AgentYankersError("commentary is empty", { code: "invalid" })
    }
    const parsed = list.map((item) => validateCommentaryLine(item))
    const host = context.host
    const highlights = context.highlights || []
    if (parsed[0].text !== RECORDING_DISCLOSURE || parsed[0].kind !== "disclosure") {
        throw new AgentYankersError("episode disclosure text cannot be replaced", {
            code: "disclosure_required",
        })
    }
    const expected = [
        "line-disclosure",
        "line-intro",
        ...highlights.flatMap((clip) => [
            `line-setup-${clip.clip_id}`,
            `line-button-${clip.clip_id}`,
        ]),
        "line-outro",
    ]
    if (parsed.map((item) => item.line_id).join("|") !== expected.join("|")) {
        throw new AgentYankersError(
            "commentary line ids must follow the highlight order",
            { code: "invalid" }
        )
    }
    for (const item of parsed) {
        if (item.speaker !== host.agent_name) {
            throw new AgentYankersError("commentary is spoken by the host", {
                code: "invalid",
            })
        }
        if (
            item.voice.voice_id !== host.voice.voice_id ||
            item.voice.provider !== "vibevoice"
        ) {
            throw new AgentYankersError(
                "host commentary uses a vibevoice voice from genaid-voices",
                { code: "invalid" }
            )
        }
    }
    return parsed
}

export function acceptShowNotes(raw, draft) {
    const payload = unwrap(raw, "show_notes")
    const locked = draft.json
    const notes = validateShowNotes({
        ...locked,
        title: clip(payload?.title || locked.title, 120),
        chapters: locked.chapters.map((chapter, index) => ({
            ...chapter,
            title: clip(
                payload?.chapters?.[index]?.title || chapter.title,
                120
            ),
        })),
    })
    return { json: notes, markdown: renderShowNotes(notes) }
}

function seal(task, written) {
    assertNoPhoneNumbers(written.json, task)
    if (written.markdown) assertNoPhoneNumbers(written.markdown, task)
    return written
}

async function offlineDraft(task, input, options) {
    if (task === "premise") return { json: draftPremise(input) }
    if (task === "personas") return { json: draftPersonas(input) }
    if (task === "commentary")
        return { json: await draftCommentary(input, options) }
    if (task === "show-notes") {
        const commentary = await draftCommentary(input, options)
        return draftShowNotes(input, commentary)
    }
    throw new AgentYankersError("unknown writing-room task", { code: "invalid" })
}

async function resolveCore(options) {
    if (options.core) return options.core
    if (options.useCore) return loadCoreAdapter()
    return null
}

function publishablePacket(input) {
    const premise = validatePremise(input?.premise)
    const host = hostFrom(input)
    const marks = input?.marks || []
    const byId = new Map(marks.map((mark) => [mark.mark_id, mark]))
    const sessions = (input?.sessions || []).map((session) => {
        assertPublishableSession(session, byId.get(session.mark_id))
        return session
    })
    if (!sessions.length) {
        throw new AgentYankersError("commentary needs at least one call", {
            code: "invalid",
        })
    }
    return {
        premise,
        host,
        marks,
        sessions,
        limit: input?.limit || input?.max_highlights || 3,
        episode_id: input?.episode_id,
        title: input?.title || premise.title,
    }
}

function hostFrom(input) {
    const host = input?.host
        ? input.host
        : validatePersonaCast(input?.cast).personas.find(
              (persona) => persona.role === "host"
          )
    const parsed = validatePersonaCast({
        schema_version: SCHEMA_VERSION,
        personas: [host],
    }).personas[0]
    if (parsed.role !== "host") {
        throw new AgentYankersError("episode host must use role host", {
            code: "invalid",
        })
    }
    if (parsed.voice.provider !== "vibevoice") {
        throw new AgentYankersError(
            "host commentary uses a vibevoice voice from genaid-voices",
            { code: "invalid" }
        )
    }
    return parsed
}

function localCommentary(premise, host, clips) {
    if (host.role !== "host") {
        throw new AgentYankersError("commentary is spoken by the host", {
            code: "invalid",
        })
    }
    if (host.voice?.provider !== "vibevoice") {
        throw new AgentYankersError(
            "host commentary uses a vibevoice voice from genaid-voices",
            { code: "invalid" }
        )
    }
    const lines = [
        line("line-disclosure", host, RECORDING_DISCLOSURE, "disclosure"),
        line(
            "line-intro",
            host,
            `${host.agent_name} here for ${SHOW_NAME}. ${PRODUCER} sent ${callerList(clips)} out with one premise: ${premise.logline}`,
            "intro"
        ),
    ]
    for (const clipItem of clips) {
        lines.push(
            line(
                `line-setup-${clipItem.clip_id}`,
                host,
                `Next call: ${clipItem.agent_name} reached ${clipItem.mark_name}. Listen for the ${clipItem.reason}.`,
                "setup",
                clipItem.clip_id
            )
        )
        lines.push(
            line(
                `line-button-${clipItem.clip_id}`,
                host,
                `That was ${clipItem.mark_name}. ${host.agent_name} is leaving that one in the episode.`,
                "button",
                clipItem.clip_id
            )
        )
    }
    lines.push(
        line(
            "line-outro",
            host,
            `That's the show. ${SHOW_NAME} is produced by ${PRODUCER}. Every mark in these notes opted in, and the recording disclosure played before the improvised calls.`,
            "outro"
        )
    )
    return lines
}

function buildShowNotes(packet, highlights) {
    const byId = new Map(packet.marks.map((mark) => [mark.mark_id, mark]))
    const published = []
    const seen = new Set()
    for (const clipItem of highlights) {
        if (seen.has(clipItem.mark_id)) continue
        seen.add(clipItem.mark_id)
        const mark = byId.get(clipItem.mark_id)
        if (!mark) {
            throw new AgentYankersError(
                `${clipItem.mark_id} is not in the episode index.`,
                { code: "consent_missing", mark_id: clipItem.mark_id }
            )
        }
        published.push({
            mark_id: mark.mark_id,
            display_name: mark.display_name,
            kind: mark.kind,
            consent_id: mark.consent.consent_id,
        })
    }
    const episodeId =
        packet.episode_id || slugId("ep-", packet.title, ID.episode)
    return {
        schema_version: SCHEMA_VERSION,
        show_name: SHOW_NAME,
        producer: PRODUCER,
        episode_id: episodeId,
        title: clip(packet.title, 120),
        premise_id: packet.premise.premise_id,
        logline: packet.premise.logline,
        disclosure: RECORDING_DISCLOSURE,
        marks: published,
        chapters: draftChapters(highlights),
        voices: [packet.host.voice],
    }
}

function draftChapters(highlights) {
    const chapters = [
        {
            schema_version: SCHEMA_VERSION,
            chapter_id: "ch-01",
            title: "Recording disclosure",
            start_seconds: 0,
            end_seconds: 8,
        },
    ]
    let cursor = 8
    highlights.forEach((clipItem, index) => {
        const span = Math.max(1, clipItem.end_seconds - clipItem.start_seconds)
        chapters.push({
            schema_version: SCHEMA_VERSION,
            chapter_id: `ch-${String(index + 2).padStart(2, "0")}`,
            title: `${clipItem.agent_name} calls ${clipItem.mark_name}`.slice(0, 120),
            start_seconds: cursor,
            end_seconds: cursor + span,
        })
        cursor += span
    })
    return chapters
}

function line(lineId, host, text, kind, anchor) {
    return validateCommentaryLine({
        schema_version: SCHEMA_VERSION,
        line_id: lineId,
        speaker: host.agent_name,
        voice: host.voice,
        text,
        kind,
        anchor_clip_id: anchor,
    })
}

function callerList(clips) {
    const names = []
    for (const clipItem of clips) {
        if (!names.includes(clipItem.agent_name)) names.push(clipItem.agent_name)
    }
    if (!names.length) return "our callers"
    if (names.length === 1) return names[0]
    return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`
}

function stampCast(brief) {
    return {
        schema_version: SCHEMA_VERSION,
        personas: (brief.personas || []).map((persona) => ({
            schema_version: SCHEMA_VERSION,
            personaplex_speaker: persona.personaplex_speaker || "NATF2.pt",
            ...persona,
            voice: {
                schema_version: SCHEMA_VERSION,
                ...(persona.voice || {}),
            },
        })),
    }
}

function personaFromBrief(brief, role) {
    if (!brief) return undefined
    const agentName = agentNameOf(brief.agent_name)
    const caller = role === "caller"
    const speaker = brief.personaplex_speaker || (caller ? "NATM1.pt" : "NATF2.pt")
    return {
        schema_version: SCHEMA_VERSION,
        agent_name: agentName,
        role,
        persona_prompt: clip(
            brief.persona_prompt ||
                `${agentName} improvises. The prompt is not a script.`,
            2000
        ),
        personaplex_speaker: clip(speaker, 80),
        voice: {
            schema_version: SCHEMA_VERSION,
            voice_id:
                brief.voice_id ||
                brief.voice?.voice_id ||
                `${role}-${agentName}`.toLowerCase(),
            library:
                brief.voice?.library ||
                (caller ? "personaplex-prompt" : "genaid-voices"),
            provider:
                brief.voice?.provider || (caller ? "personaplex" : "vibevoice"),
            relative_path:
                brief.relative_path ||
                brief.voice?.relative_path ||
                (caller ? `prompts/${speaker}` : `hosts/${agentName.toLowerCase()}.wav`),
        },
    }
}

function unwrap(raw, key) {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
        return parsed
    if (key === "personas" && parsed.cast) return parsed.cast
    if (parsed[key]) return parsed[key]
    return parsed
}

function normalizeBeats(beats, logline) {
    const source = Array.isArray(beats) && beats.length ? beats : [logline]
    return source.slice(0, 8).map((beat, index) => {
        if (beat && typeof beat === "object") {
            return {
                schema_version: SCHEMA_VERSION,
                beat_id: slugId(
                    "beat-",
                    beat.beat_id || beat.intent || `item-${index + 1}`,
                    ID.beat
                ),
                intent: clip(beat.intent || "improv", 40),
                outline: clip(beat.outline || beat.text || logline, 400),
            }
        }
        return {
            schema_version: SCHEMA_VERSION,
            beat_id: `beat-${String(index + 1).padStart(3, "0")}`,
            intent: "improv",
            outline: clip(String(beat), 400),
        }
    })
}

function slugId(prefix, text, pattern) {
    const raw = String(text || "")
    if (pattern.test(raw)) return raw
    const body = raw
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 48)
    let id = `${prefix}${body}`.replace(/--+/g, "-").replace(/-+$/g, "")
    if (pattern.test(id)) return id
    const fallback = `${prefix}draft`
    if (!pattern.test(fallback))
        throw new AgentYankersError("invalid id", { code: "invalid" })
    return fallback
}

function agentNameOf(value) {
    if (ID.agent.test(value)) return value
    const cleaned = String(value || "").replace(/[^A-Za-z0-9]/g, "")
    if (!ID.agent.test(cleaned))
        throw new AgentYankersError("invalid agent_name", { code: "invalid" })
    return cleaned
}

function duration(value) {
    if (value === undefined || value === null) return 180
    const number = Number(value)
    if (!Number.isInteger(number) || number < 30 || number > 7200) {
        throw new AgentYankersError("target_duration_seconds is out of range", {
            code: "invalid",
        })
    }
    return number
}

function clip(value, max) {
    const text = String(value ?? "").trim()
    if (!text) throw new AgentYankersError("text is empty", { code: "invalid" })
    return text.length <= max ? text : text.slice(0, max)
}

function timecode(seconds) {
    const total = Math.floor(seconds)
    const minutes = String(Math.floor(total / 60)).padStart(2, "0")
    const remain = String(total % 60).padStart(2, "0")
    return `${minutes}:${remain}`
}
