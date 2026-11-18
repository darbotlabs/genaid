/**
 * AgentYankers writing room.
 *
 * This module emits agentyankers/v1 JSON for the private
 * genaid_audio.agentyankers pipeline. It does not vendor that pipeline.
 */

export {
    ENV,
    PRODUCER,
    RECORDING_DISCLOSURE,
    SAMPLE_RATE,
    SCHEMA_VERSION,
    SHOW_NAME,
    WRITING_PROVIDERS,
} from "./constants.mjs"

export {
    AgentYankersError,
    ConsentRefusal,
    PhoneNumberRefusal,
    assertNoPhoneNumbers,
    assertPublishableSession,
    explainConsent,
    findPhoneNumbers,
    partitionConsent,
    recordingDisclosure,
    requireCallConsent,
    requirePublishConsent,
} from "./guardrails.mjs"

export {
    exportJsonSchemas,
    jsonSchema,
    validateCommentaryLine,
    validateHighlight,
    validateMark,
    validateMarkIndex,
    validateModel,
    validatePersonaCast,
    validatePremise,
    validateSession,
    validateShowNotes,
} from "./schema.mjs"

export { selectHighlights } from "./highlights.mjs"

export {
    acceptCommentary,
    acceptPersonas,
    acceptPremise,
    acceptShowNotes,
    commentaryPrompt,
    draftCommentary,
    draftPersonas,
    draftPremise,
    draftShowNotes,
    generateCommentary,
    personaPrompt,
    premisePrompt,
    renderShowNotes,
    resolveWritingModel,
    responseSchema,
    showNotesPrompt,
    writeTask,
} from "./drafts.mjs"

export { loadCoreAdapter, probeCore } from "./adapter.mjs"
