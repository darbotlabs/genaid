/**
 * Consent, disclosure, and contact rules for the writing room.
 * Phone matches are never copied into errors.
 */

import { ID, RECORDING_DISCLOSURE } from "./constants.mjs"

const PHONE_PATTERNS = [
    /\+\d[\d\s().-]{7,}\d/,
    /\(\d{3}\)\s*\d{3}[-.\s]\d{4}/,
    /\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/,
    /\b\d{10,15}\b/,
]

export class AgentYankersError extends Error {
    constructor(message, extras = {}) {
        super(message)
        this.name = "AgentYankersError"
        this.code = extras.code || "error"
        this.message = message
        if (extras.mark_id !== undefined) this.mark_id = extras.mark_id
        if (extras.action !== undefined) this.action = extras.action
        if (extras.field !== undefined) this.field = extras.field
    }
}

export class ConsentRefusal extends AgentYankersError {
    constructor(message, extras) {
        super(message, extras)
        this.name = "ConsentRefusal"
    }
}

export class PhoneNumberRefusal extends AgentYankersError {
    constructor(field) {
        super(
            `Refusing ${field}: AgentYankers does not accept phone numbers. Use an agent id or a LiveKit identity.`,
            { code: "phone_number_forbidden", field }
        )
        this.name = "PhoneNumberRefusal"
    }
}

export function recordingDisclosure() {
    return RECORDING_DISCLOSURE
}

export function findPhoneNumbers(value) {
    const found = []
    walkPhones(value, found)
    return found
}

export function assertNoPhoneNumbers(value, field = "payload") {
    if (findPhoneNumbers(value).length)
        throw new PhoneNumberRefusal(field)
}

export function explainConsent(mark) {
    const name = mark?.display_name || mark?.mark_id || "mark"
    if (!mark?.opted_in || !mark?.consent?.opted_in)
        return `${name} has not opted in`
    const scope = mark.consent.scope
    if (scope === "call")
        return `${name} opted in for a call only; publishing is refused`
    if (scope === "publish")
        return `${name} opted in for publication only; a new call is refused`
    if (scope === "call_and_publish")
        return `${name} opted in for calls and publication`
    return `${name} has no usable consent scope`
}

export function requireCallConsent(mark) {
    const name = mark?.display_name || "mark"
    const markId = mark?.mark_id
    if (!mark?.opted_in || !mark?.consent?.opted_in) {
        throw new ConsentRefusal(
            `${name} has not opted in. AgentYankers will not call this mark.`,
            { code: "consent_missing", mark_id: markId, action: "call" }
        )
    }
    if (!["call", "call_and_publish"].includes(mark.consent.scope)) {
        throw new ConsentRefusal(`${name} is not consented for a call.`, {
            code: "consent_scope",
            mark_id: markId,
            action: "call",
        })
    }
    if (!mark.consent.disclosure_accepted) {
        throw new ConsentRefusal(
            `${name} has not accepted the recording disclosure.`,
            {
                code: "disclosure_required",
                mark_id: markId,
                action: "call",
            }
        )
    }
}

export function requirePublishConsent(mark) {
    const name = mark?.display_name || "mark"
    const markId = mark?.mark_id
    if (!mark?.opted_in || !mark?.consent?.opted_in) {
        throw new ConsentRefusal(
            `${name} has not opted in. AgentYankers will not publish this mark.`,
            { code: "consent_missing", mark_id: markId, action: "publish" }
        )
    }
    if (!["publish", "call_and_publish"].includes(mark.consent.scope)) {
        throw new ConsentRefusal(`${explainConsent(mark)}.`, {
            code: "consent_scope",
            mark_id: markId,
            action: "publish",
        })
    }
    if (!mark.consent.disclosure_accepted) {
        throw new ConsentRefusal(
            `${name} has not accepted the recording disclosure.`,
            {
                code: "disclosure_required",
                mark_id: markId,
                action: "publish",
            }
        )
    }
}

/**
 * Same publish gate the episode stitcher applies before voiceover:
 * index consent, the snapshot taken at record time, and the disclosure sentence.
 */
export function assertPublishableSession(session, mark) {
    const markId = session?.mark_id
    if (!mark || mark.mark_id !== markId) {
        throw new ConsentRefusal(
            `${markId || "session"} is not in the episode index.`,
            { code: "consent_missing", mark_id: markId, action: "publish" }
        )
    }
    requirePublishConsent(mark)
    const snapshot = session.consent_snapshot
    if (
        !snapshot?.opted_in ||
        !["publish", "call_and_publish"].includes(snapshot.scope)
    ) {
        throw new ConsentRefusal(
            `${mark.display_name} had not opted in for publication when the call was recorded.`,
            { code: "consent_scope", mark_id: markId, action: "publish" }
        )
    }
    if (
        !snapshot.disclosure_accepted ||
        session.disclosure_played !== true ||
        session.status !== "recorded"
    ) {
        throw new ConsentRefusal(
            `${mark.display_name} cannot be published without a played recording disclosure.`,
            {
                code: "disclosure_required",
                mark_id: markId,
                action: "publish",
            }
        )
    }
    const disclosed = (session.transcript || []).some(
        (turn) =>
            turn.speaker_role === "disclosure" &&
            turn.text === RECORDING_DISCLOSURE
    )
    if (!disclosed) {
        throw new ConsentRefusal(
            `${mark.display_name} call transcript is missing the recording disclosure.`,
            {
                code: "disclosure_required",
                mark_id: markId,
                action: "publish",
            }
        )
    }
}

export function partitionConsent(marks, action) {
    const check =
        action === "call" ? requireCallConsent : requirePublishConsent
    const accepted = []
    const refused = []
    for (const mark of marks || []) {
        try {
            check(mark)
            accepted.push(mark)
        } catch (error) {
            if (!(error instanceof ConsentRefusal)) throw error
            refused.push({
                mark_id: error.mark_id,
                action: error.action,
                code: error.code,
                message: error.message,
            })
        }
    }
    return { accepted, refused }
}

export function assertContactRef(value, field = "contact_ref") {
    if (typeof value !== "string" || !ID.contact.test(value)) {
        throw new AgentYankersError(`invalid ${field}`, {
            code: "invalid",
            field,
        })
    }
    return value
}

function walkPhones(value, found) {
    if (typeof value === "string") {
        for (const pattern of PHONE_PATTERNS) {
            const flags = pattern.flags.includes("g")
                ? pattern.flags
                : pattern.flags + "g"
            const global = new RegExp(pattern.source, flags)
            const matches = value.match(global)
            if (matches) found.push(...matches)
        }
        return
    }
    if (Array.isArray(value)) {
        for (const item of value) walkPhones(item, found)
        return
    }
    if (value && typeof value === "object") {
        for (const item of Object.values(value)) walkPhones(item, found)
    }
}
