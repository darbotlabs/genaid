/** Published AgentYankers contract. Schema version agentyankers/v1. */

export const SCHEMA_VERSION = "agentyankers/v1"
export const SHOW_NAME = "AgentYankers"
export const PRODUCER = "DarbotLabs"
export const SAMPLE_RATE = 24000

/** Exact sentence. Callers cannot replace it. */
export const RECORDING_DISCLOSURE =
    "This is AgentYankers, an adult comedy podcast from DarbotLabs. This call is being recorded. You are on with an automated agent. Say stop if you want the call to end."

/** Env var names only. Values stay in the process environment. */
export const ENV = Object.freeze({
    LIVEKIT_URL: "LIVEKIT_URL",
    LIVEKIT_API_KEY: "LIVEKIT_API_KEY",
    LIVEKIT_API_SECRET: "LIVEKIT_API_SECRET",
    PERSONAPLEX_MODEL: "GENAID_PERSONAPLEX_MODEL_BASE",
    VIBEVOICE_MODEL: "GENAID_MODEL_BASE",
    VOICES_DIR: "GENAID_VOICES_DIR",
    OPENWEBUI_API_BASE: "OPENWEBUI_API_BASE",
    OPENWEBUI_API_KEY: "OPENWEBUI_API_KEY",
})

export const ID = Object.freeze({
    premise: /^prem-[a-z0-9-]{3,64}$/,
    beat: /^beat-[a-z0-9-]{3,64}$/,
    mark: /^mark-[a-z0-9-]{3,64}$/,
    index: /^idx-[a-z0-9-]{3,64}$/,
    consent: /^cons-[a-z0-9-]{3,64}$/,
    agent: /^[A-Za-z][A-Za-z0-9]{1,31}$/,
    contact: /^(agent|lk-identity|room):[a-z0-9][a-z0-9-]{2,64}$/,
    voice: /^[A-Za-z0-9][A-Za-z0-9._:-]{1,80}$/,
    isoTime: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/,
    tag: /^[a-z][a-z0-9-]{0,24}$/,
    call: /^call-[a-z0-9-]{3,80}$/,
    turn: /^turn-[a-z0-9-]{2,32}$/,
    recording: /^rec-[a-z0-9-]{3,80}$/,
    clip: /^clip-[a-z0-9-]{2,64}$/,
    line: /^line-[a-z0-9-]{2,64}$/,
    cue: /^cue-[a-z0-9-]{2,64}$/,
    segment: /^seg-[a-z0-9-]{2,64}$/,
    chapter: /^ch-[a-z0-9-]{2,64}$/,
    episode: /^ep-[a-z0-9-]{3,64}$/,
})

export const WRITING_PROVIDERS = Object.freeze({
    foundry: Object.freeze({
        id: "foundry",
        model: "foundry",
        label: "Azure Foundry",
    }),
    copilot: Object.freeze({
        id: "copilot",
        model: "copilot",
        label: "GitHub Copilot",
    }),
    openwebui: Object.freeze({
        id: "openwebui",
        model: "openwebui",
        label: "OpenWebUI",
    }),
})
