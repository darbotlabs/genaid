/**
 * Validators for the published agentyankers/v1 JSON shape.
 * Field names match genaid_audio.agentyankers export_json_schemas().
 */

import {
    ENV,
    ID,
    PRODUCER,
    RECORDING_DISCLOSURE,
    SAMPLE_RATE,
    SCHEMA_VERSION,
    SHOW_NAME,
} from "./constants.mjs"
import { AgentYankersError, assertNoPhoneNumbers } from "./guardrails.mjs"

const LIBRARIES = ["genaid-voices", "dlm-voicemapper", "personaplex-prompt"]
const VOICE_PROVIDERS = ["vibevoice", "personaplex"]
const ROLES = ["host", "caller"]
const SCOPES = ["none", "call", "publish", "call_and_publish"]
const KINDS = ["agent", "person"]
const SPEAKER_ROLES = ["agent", "mark", "disclosure"]
const RECORDING_KINDS = [
    "call",
    "highlight",
    "voiceover",
    "sfx",
    "music",
    "episode",
]
const SESSION_STATUS = ["prepared", "recorded", "refused", "failed"]
const COMMENTARY_KINDS = ["intro", "setup", "button", "outro", "disclosure"]

const str = (name, opts = {}) => ({ name, type: "string", ...opts })
const num = (name, opts = {}) => ({ name, type: "number", ...opts })
const int = (name, opts = {}) => ({ name, type: "int", ...opts })
const bool = (name, opts = {}) => ({ name, type: "bool", ...opts })
const enm = (name, values, opts = {}) => ({
    name,
    type: "enum",
    values,
    ...opts,
})
const arr = (name, of, opts = {}) => ({ name, type: "array", of, ...opts })
const model = (name, modelName, opts = {}) => ({
    name,
    type: "model",
    model: modelName,
    ...opts,
})

const MODELS = {
    PremiseBeat: [
        str("beat_id", { pattern: ID.beat }),
        str("outline", { min: 1, max: 400 }),
        str("intent", { min: 1, max: 40 }),
    ],
    PremiseOutline: [
        str("premise_id", { pattern: ID.premise }),
        str("title", { min: 1, max: 120 }),
        str("logline", { min: 1, max: 400 }),
        str("tone", { min: 1, max: 80 }),
        str("constraints", { min: 1, max: 1000 }),
        int("target_duration_seconds", { min: 30, max: 7200 }),
        arr("beats", "PremiseBeat", { min: 1, max: 8 }),
    ],
    VoiceRef: [
        str("voice_id", { pattern: ID.voice }),
        enm("library", LIBRARIES),
        enm("provider", VOICE_PROVIDERS),
        str("relative_path", { required: false }),
    ],
    AgentPersona: [
        str("agent_name", { pattern: ID.agent }),
        enm("role", ROLES),
        str("persona_prompt", { min: 1, max: 2000 }),
        model("voice", "VoiceRef"),
        str("personaplex_speaker", {
            min: 1,
            max: 80,
            default: "NATF2.pt",
        }),
    ],
    PersonaCast: [arr("personas", "AgentPersona", { min: 1, max: 8 })],
    ConsentRecord: [
        bool("opted_in"),
        str("consent_id", { pattern: ID.consent }),
        enm("scope", SCOPES),
        bool("disclosure_accepted"),
        str("consented_at", { required: false, pattern: ID.isoTime }),
    ],
    MarkIndexEntry: [
        str("mark_id", { pattern: ID.mark }),
        str("display_name", { min: 1, max: 80 }),
        enm("kind", KINDS),
        bool("opted_in"),
        model("consent", "ConsentRecord"),
        str("contact_ref", { pattern: ID.contact }),
        str("notes", { min: 0, max: 400, default: "" }),
        arr("tags", "tag", { max: 12, default: [] }),
    ],
    MarkIndex: [
        str("index_id", { pattern: ID.index }),
        arr("marks", "MarkIndexEntry", { min: 1, max: 64 }),
    ],
    TranscriptTurn: [
        str("turn_id", { pattern: ID.turn }),
        enm("speaker_role", SPEAKER_ROLES),
        str("speaker_name", { min: 1, max: 80 }),
        str("text", { min: 1, max: 4000 }),
        num("start_seconds", { min: 0 }),
        num("end_seconds", { min: 0 }),
        arr("tags", "tag", { max: 12, default: [] }),
        bool("improvised", { default: false }),
    ],
    RecordingRef: [
        str("ref_id", { pattern: ID.recording }),
        enm("kind", RECORDING_KINDS),
        str("path", { required: false }),
        int("sample_rate", { default: SAMPLE_RATE }),
        int("channels", { default: 1 }),
        num("duration_seconds", { required: false, min: 0 }),
    ],
    LiveKitBinding: [
        str("room_name", { min: 1, max: 128 }),
        str("room_id", { required: false }),
        str("session_id", { required: false }),
        str("agent_identity", { min: 1, max: 80 }),
        str("mark_identity", { pattern: ID.contact }),
        str("url_env", { default: ENV.LIVEKIT_URL }),
    ],
    PersonaPlexPersonaConfig: [
        str("text_prompt", { min: 1, max: 4000 }),
        str("speaker_name", { min: 1, max: 80 }),
        model("voice", "VoiceRef", { required: false }),
        num("response_tail_seconds", { min: 0, max: 30, default: 1.5 }),
        int("sample_rate", { default: SAMPLE_RATE }),
    ],
    CallSession: [
        str("session_id", { pattern: ID.call }),
        str("premise_id", { pattern: ID.premise }),
        str("agent_name", { pattern: ID.agent }),
        str("mark_id", { pattern: ID.mark }),
        enm("status", SESSION_STATUS),
        model("livekit", "LiveKitBinding"),
        model("personaplex", "PersonaPlexPersonaConfig"),
        arr("transcript", "TranscriptTurn", { default: [] }),
        arr("recordings", "RecordingRef", { default: [] }),
        model("consent_snapshot", "ConsentRecord"),
        bool("disclosure_played", { default: false }),
    ],
    HighlightClip: [
        str("clip_id", { pattern: ID.clip }),
        str("session_id", { pattern: ID.call }),
        str("mark_id", { pattern: ID.mark }),
        str("agent_name", { pattern: ID.agent }),
        str("mark_name", { min: 1, max: 80 }),
        num("start_seconds", { min: 0 }),
        num("end_seconds", { min: 0 }),
        str("transcript_excerpt", { min: 1, max: 4000 }),
        num("score", { min: 0 }),
        str("reason", { min: 1, max: 200 }),
        str("recording_ref_id", { pattern: ID.recording }),
    ],
    CommentaryLine: [
        str("line_id", { pattern: ID.line }),
        str("speaker", { pattern: ID.agent }),
        model("voice", "VoiceRef"),
        str("text", { min: 1, max: 2000 }),
        enm("kind", COMMENTARY_KINDS),
        str("anchor_clip_id", { required: false, pattern: ID.clip }),
    ],
    ChapterMarker: [
        str("chapter_id", { pattern: ID.chapter }),
        str("title", { min: 1, max: 120 }),
        num("start_seconds", { min: 0 }),
        num("end_seconds", { min: 0 }),
    ],
    ShowNotes: [
        str("show_name"),
        str("producer"),
        str("episode_id", { pattern: ID.episode }),
        str("title", { min: 1, max: 120 }),
        str("premise_id", { pattern: ID.premise }),
        str("logline", { min: 1, max: 400 }),
        str("disclosure"),
        arr("marks", "mark_ref"),
        arr("chapters", "ChapterMarker"),
        arr("voices", "VoiceRef"),
    ],
}

const AFTER = {
    PremiseOutline(value) {
        unique(value.beats.map((beat) => beat.beat_id), "duplicate beat_id")
    },
    PersonaCast(value) {
        unique(
            value.personas.map((persona) => persona.agent_name),
            "duplicate agent_name"
        )
        const hosts = value.personas.filter((persona) => persona.role === "host")
        if (hosts.length !== 1)
            invalid("a cast needs exactly one host")
    },
    MarkIndexEntry(value) {
        if (value.opted_in !== value.consent.opted_in)
            invalid("opted_in must match consent.opted_in")
        if (!value.opted_in && value.consent.scope !== "none")
            invalid("a mark who has not opted in must use consent scope none")
        if (value.opted_in && value.consent.scope === "none")
            invalid(
                "an opted-in mark needs a call, publish, or call_and_publish scope"
            )
        if (value.opted_in && !value.consent.disclosure_accepted)
            invalid("opted-in marks must accept the recording disclosure")
    },
    MarkIndex(value) {
        unique(value.marks.map((mark) => mark.mark_id), "duplicate mark_id")
    },
    TranscriptTurn(value) {
        if (value.end_seconds <= value.start_seconds)
            invalid("turn end_seconds must be after start_seconds")
    },
    RecordingRef(value) {
        if (value.sample_rate !== SAMPLE_RATE)
            invalid("recordings use 24000 Hz")
        if (value.channels !== 1) invalid("recordings are mono")
    },
    PersonaPlexPersonaConfig(value) {
        if (value.sample_rate !== SAMPLE_RATE)
            invalid("PersonaPlex calls use 24000 Hz")
    },
    HighlightClip(value) {
        if (value.end_seconds <= value.start_seconds)
            invalid("clip end_seconds must be after start_seconds")
    },
    ChapterMarker(value) {
        if (value.end_seconds <= value.start_seconds)
            invalid("chapter end_seconds must be after start_seconds")
    },
    ShowNotes(value) {
        if (value.show_name !== SHOW_NAME)
            invalid("show_name must be AgentYankers")
        if (value.producer !== PRODUCER)
            invalid("producer must be DarbotLabs")
        if (value.disclosure !== RECORDING_DISCLOSURE)
            invalid("episode disclosure text cannot be replaced")
        for (const mark of value.marks) {
            if (mark.contact_ref !== undefined)
                invalid("show notes omit contact refs")
        }
    },
    VoiceRef(value) {
        if (value.relative_path !== undefined)
            value.relative_path = relativeVoicePath(value.relative_path)
    },
}

export function validateModel(kind, value) {
    assertNoPhoneNumbers(value, kind)
    return checkModel(kind, value)
}

export function validatePremise(value) {
    return validateModel("PremiseOutline", value)
}

export function validatePersonaCast(value) {
    return validateModel("PersonaCast", value)
}

export function validateMark(value) {
    return validateModel("MarkIndexEntry", value)
}

export function validateMarkIndex(value) {
    return validateModel("MarkIndex", value)
}

export function validateSession(value) {
    return validateModel("CallSession", value)
}

export function validateHighlight(value) {
    return validateModel("HighlightClip", value)
}

export function validateCommentaryLine(value) {
    return validateModel("CommentaryLine", value)
}

export function validateShowNotes(value) {
    return validateModel("ShowNotes", value)
}

export function exportJsonSchemas() {
    const schemas = {}
    for (const name of Object.keys(MODELS)) schemas[name] = jsonSchema(name)
    return schemas
}

export function jsonSchema(kind) {
    return {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        title: kind,
        ...objectSchema(kind),
    }
}

function checkModel(kind, value) {
    const fields = MODELS[kind]
    if (!fields) invalid(`unknown model ${kind}`)
    if (!value || typeof value !== "object" || Array.isArray(value))
        invalid(`${kind} must be an object`)
    const allowed = new Set(["schema_version", ...fields.map((field) => field.name)])
    for (const key of Object.keys(value)) {
        if (!allowed.has(key)) invalid(`unexpected ${key} on ${kind}`)
    }
    if (
        value.schema_version !== undefined &&
        value.schema_version !== SCHEMA_VERSION
    )
        invalid(`${kind} schema_version must be ${SCHEMA_VERSION}`)
    const out = { schema_version: SCHEMA_VERSION }
    for (const field of fields) out[field.name] = readField(field, value, kind)
    for (const key of Object.keys(out)) {
        if (out[key] === undefined) delete out[key]
    }
    AFTER[kind]?.(out)
    assertNoPhoneNumbers(out, kind)
    return out
}

function readField(field, value, parent) {
    const present = Object.prototype.hasOwnProperty.call(value, field.name)
    const raw = present ? value[field.name] : undefined
    if (raw === undefined || raw === null) {
        if (field.default !== undefined) return clone(field.default)
        if (field.required === false) return undefined
        invalid(`${parent}.${field.name} is required`)
    }
    if (field.type === "string") return readString(field, raw, parent)
    if (field.type === "number") return readNumber(field, raw, parent)
    if (field.type === "int") return readInt(field, raw, parent)
    if (field.type === "bool") {
        if (typeof raw !== "boolean")
            invalid(`${parent}.${field.name} must be a boolean`)
        return raw
    }
    if (field.type === "enum") {
        if (!field.values.includes(raw))
            invalid(`${parent}.${field.name} is invalid`)
        return raw
    }
    if (field.type === "array") return readArray(field, raw, parent)
    if (field.type === "model") return checkModel(field.model, raw)
    invalid(`${parent}.${field.name} is invalid`)
}

function readString(field, raw, parent) {
    if (typeof raw !== "string")
        invalid(`${parent}.${field.name} must be a string`)
    if (field.min !== undefined && raw.length < field.min)
        invalid(`${parent}.${field.name} is too short`)
    if (field.max !== undefined && raw.length > field.max)
        invalid(`${parent}.${field.name} is too long`)
    if (field.pattern && !field.pattern.test(raw))
        invalid(`invalid ${field.name}`)
    if (field.name === "relative_path") return relativeVoicePath(raw)
    return raw
}

function readNumber(field, raw, parent) {
    if (typeof raw !== "number" || !Number.isFinite(raw))
        invalid(`${parent}.${field.name} must be a number`)
    if (field.min !== undefined && raw < field.min)
        invalid(`${parent}.${field.name} is out of range`)
    if (field.max !== undefined && raw > field.max)
        invalid(`${parent}.${field.name} is out of range`)
    return raw
}

function readInt(field, raw, parent) {
    if (typeof raw !== "number" || !Number.isInteger(raw))
        invalid(`${parent}.${field.name} must be an integer`)
    return readNumber(field, raw, parent)
}

function readArray(field, raw, parent) {
    if (!Array.isArray(raw)) invalid(`${parent}.${field.name} must be an array`)
    if (field.min !== undefined && raw.length < field.min)
        invalid(`${parent}.${field.name} is too short`)
    if (field.max !== undefined && raw.length > field.max)
        invalid(`${parent}.${field.name} is too long`)
    if (field.of === "tag") return cleanTags(raw)
    if (field.of === "mark_ref") return raw.map((item) => markRef(item))
    return raw.map((item) => checkModel(field.of, item))
}

function markRef(value) {
    if (!value || typeof value !== "object" || Array.isArray(value))
        invalid("show note mark must be an object")
    const allowed = ["mark_id", "display_name", "kind", "consent_id"]
    for (const key of Object.keys(value)) {
        if (!allowed.includes(key))
            invalid("show notes omit contact refs")
    }
    for (const key of allowed) {
        if (typeof value[key] !== "string" || !value[key])
            invalid(`show note mark ${key} is required`)
    }
    if (!ID.mark.test(value.mark_id)) invalid("invalid mark_id")
    if (!ID.consent.test(value.consent_id)) invalid("invalid consent_id")
    if (!KINDS.includes(value.kind)) invalid("invalid mark kind")
    if (value.display_name.length > 80) invalid("display_name is too long")
    return {
        mark_id: value.mark_id,
        display_name: value.display_name,
        kind: value.kind,
        consent_id: value.consent_id,
    }
}

function cleanTags(tags) {
    const cleaned = []
    for (const tag of tags) {
        const item = String(tag).trim().toLowerCase()
        if (!ID.tag.test(item)) invalid("invalid tag")
        if (!cleaned.includes(item)) cleaned.push(item)
    }
    return cleaned
}

function relativeVoicePath(value) {
    if (typeof value !== "string" || !value)
        invalid("voice paths must be relative to the voice library root")
    if (
        value.startsWith("/") ||
        value.startsWith("\\") ||
        /^[A-Za-z]:/.test(value) ||
        value.split(/[/\\]/).includes("..")
    )
        invalid("voice paths must be relative to the voice library root")
    return value.split(/[/\\]/).filter(Boolean).join("/")
}

function unique(values, message) {
    if (new Set(values).size !== values.length) invalid(message)
}

function invalid(message) {
    throw new AgentYankersError(message, { code: "invalid" })
}

function clone(value) {
    return JSON.parse(JSON.stringify(value))
}

function objectSchema(kind) {
    const properties = {
        schema_version: { const: SCHEMA_VERSION },
    }
    const required = ["schema_version"]
    for (const field of MODELS[kind]) {
        properties[field.name] = fieldSchema(field)
        if (field.required !== false && field.default === undefined)
            required.push(field.name)
    }
    return {
        type: "object",
        additionalProperties: false,
        properties,
        required,
    }
}

function fieldSchema(field) {
    if (field.type === "string") {
        const schema = { type: "string" }
        if (field.min !== undefined) schema.minLength = field.min
        if (field.max !== undefined) schema.maxLength = field.max
        if (field.pattern) schema.pattern = field.pattern.source
        return schema
    }
    if (field.type === "number" || field.type === "int") {
        const schema = {
            type: field.type === "int" ? "integer" : "number",
        }
        if (field.min !== undefined) schema.minimum = field.min
        if (field.max !== undefined) schema.maximum = field.max
        return schema
    }
    if (field.type === "bool") return { type: "boolean" }
    if (field.type === "enum") return { enum: [...field.values] }
    if (field.type === "array") {
        const schema = { type: "array" }
        if (field.min !== undefined) schema.minItems = field.min
        if (field.max !== undefined) schema.maxItems = field.max
        if (field.of === "tag")
            schema.items = { type: "string", pattern: ID.tag.source }
        else if (field.of === "mark_ref") {
            schema.items = {
                type: "object",
                additionalProperties: false,
                required: ["mark_id", "display_name", "kind", "consent_id"],
                properties: {
                    mark_id: { type: "string", pattern: ID.mark.source },
                    display_name: { type: "string", minLength: 1, maxLength: 80 },
                    kind: { enum: KINDS },
                    consent_id: { type: "string", pattern: ID.consent.source },
                },
            }
        } else schema.items = objectSchema(field.of)
        return schema
    }
    if (field.type === "model") return objectSchema(field.model)
    return {}
}
