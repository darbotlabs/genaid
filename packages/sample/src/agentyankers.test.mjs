import { describe, test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { spawnSync } from "node:child_process"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import {
    RECORDING_DISCLOSURE,
    SCHEMA_VERSION,
    assertNoPhoneNumbers,
    draftCommentary,
    draftPersonas,
    draftPremise,
    draftShowNotes,
    exportJsonSchemas,
    partitionConsent,
    probeCore,
    recordingDisclosure,
    requireCallConsent,
    requirePublishConsent,
    resolveWritingModel,
    validatePremise,
    writeTask,
} from "./agentyankers/index.mjs"

const root = dirname(fileURLToPath(import.meta.url))
const fixtures = join(root, "agentyankers", "fixtures")
const scripts = join(root, "..", "genaid", "agentyankers")

const brief = JSON.parse(readFileSync(join(fixtures, "brief.json"), "utf8"))
const castBrief = JSON.parse(
    readFileSync(join(fixtures, "cast-brief.json"), "utf8")
)
const episode = JSON.parse(
    readFileSync(join(fixtures, "episode.json"), "utf8")
)

const PHONE = "555-010-0199"

describe("agentyankers writing room", () => {
    test("disclosure sentence is the published line", () => {
        assert.equal(
            recordingDisclosure(),
            "This is AgentYankers, an adult comedy podcast from DarbotLabs. This call is being recorded. You are on with an automated agent. Say stop if you want the call to end."
        )
        assert.equal(recordingDisclosure(), RECORDING_DISCLOSURE)
    })

    test("premise brief becomes agentyankers/v1", () => {
        const premise = draftPremise(brief)
        assert.equal(premise.schema_version, SCHEMA_VERSION)
        assert.equal(premise.premise_id, "prem-the-last-pretzel")
        assert.equal(premise.beats.length, 3)
        assert.equal(premise.beats[0].beat_id, "beat-001")
        assert.match(premise.constraints, /not lines to read/)
        assert.equal(validatePremise(premise).title, premise.title)
    })

    test("persona brief has one vibevoice host and personaplex callers", () => {
        const cast = draftPersonas(castBrief)
        const hosts = cast.personas.filter((persona) => persona.role === "host")
        assert.equal(hosts.length, 1)
        assert.equal(hosts[0].voice.provider, "vibevoice")
        assert.equal(hosts[0].voice.library, "genaid-voices")
        const callers = cast.personas.filter(
            (persona) => persona.role === "caller"
        )
        assert.equal(callers.length, 2)
        assert.ok(callers.every((persona) => persona.voice.provider === "personaplex"))
    })

    test("highlights prefer funny, keep session order, and skip disclosure", async () => {
        const ranked = await draftCommentary({ ...episode, limit: 1 })
        assert.equal(ranked.highlights.length, 1)
        assert.equal(ranked.highlights[0].session_id, "call-pretzel-nibs")
        assert.match(ranked.highlights[0].reason, /funny/)
        assert.doesNotMatch(ranked.highlights[0].transcript_excerpt, /recorded/)

        const ordered = await draftCommentary(episode)
        assert.deepEqual(
            ordered.highlights.map((clip) => clip.session_id),
            ["call-pretzel-mox", "call-pretzel-nibs"]
        )
        assert.equal(ordered.commentary[0].kind, "disclosure")
        assert.equal(ordered.commentary[0].text, RECORDING_DISCLOSURE)
        assert.equal(ordered.commentary.at(-1).kind, "outro")
        assert.ok(
            ordered.commentary.some((line) => line.line_id === "line-setup-clip-01")
        )
    })

    test("a disclosure overlap is not a highlight", async () => {
        const session = structuredClone(episode.sessions[0])
        session.transcript[1].start_seconds = 1
        session.transcript[1].end_seconds = 2.2
        session.transcript[2].start_seconds = 2.3
        session.transcript[2].end_seconds = 4
        const packet = {
            ...episode,
            sessions: [session],
        }
        const draft = await draftCommentary(packet)
        assert.equal(draft.highlights.length, 0)
        assert.equal(draft.commentary[0].text, RECORDING_DISCLOSURE)
    })

    test("show notes copy the disclosure and omit contact refs", async () => {
        const commentary = await draftCommentary(episode)
        const notes = draftShowNotes(episode, commentary)
        assert.equal(notes.json.schema_version, SCHEMA_VERSION)
        assert.equal(notes.json.disclosure, RECORDING_DISCLOSURE)
        assert.deepEqual(
            notes.json.marks.map((mark) => mark.consent_id),
            ["cons-night-desk", "cons-vending-pal"]
        )
        assert.ok(
            notes.json.marks.every(
                (mark) =>
                    !("contact_ref" in mark) &&
                    Object.keys(mark).join(",") ===
                        "mark_id,display_name,kind,consent_id"
            )
        )
        assert.match(notes.markdown, /Recording disclosure/)
        assert.match(notes.markdown, /cons-vending-pal/)
        assert.doesNotMatch(notes.markdown, /agent:vending-pal/)
        assert.doesNotMatch(notes.markdown, /room:night-desk/)
        assertNoPhoneNumbers(notes.json, "show notes")
    })

    test("publish consent refuses call-only and opted-out marks", () => {
        const glen = episode.marks[2]
        const unlisted = episode.marks[3]
        assert.doesNotThrow(() => requireCallConsent(glen))
        assert.throws(() => requirePublishConsent(glen), (error) => {
            assert.equal(error.code, "consent_scope")
            assert.equal(error.action, "publish")
            return true
        })
        assert.throws(() => requireCallConsent(unlisted), (error) => {
            assert.equal(error.code, "consent_missing")
            return true
        })
        const split = partitionConsent(episode.marks, "publish")
        assert.equal(split.accepted.length, 2)
        assert.deepEqual(
            split.refused.map((item) => item.mark_id),
            ["mark-glen-books", "mark-switchboard"]
        )
    })

    test("a call-only session cannot become commentary", async () => {
        await assert.rejects(
            () =>
                draftCommentary({
                    ...episode,
                    sessions: [
                        {
                            mark_id: "mark-glen-books",
                            status: "recorded",
                            disclosure_played: true,
                        },
                    ],
                }),
            (error) => {
                assert.equal(error.code, "consent_scope")
                return true
            }
        )
    })

    test("missing disclosure refuses the draft", async () => {
        const session = structuredClone(episode.sessions[1])
        session.transcript[0].text = "hello there"
        await assert.rejects(
            () => draftCommentary({ ...episode, sessions: [session] }),
            (error) => {
                assert.equal(error.code, "disclosure_required")
                assert.equal(error.message.includes(PHONE), false)
                return true
            }
        )
    })

    test("phone numbers are refused without echoing the match", () => {
        assert.throws(
            () => draftPremise({ ...brief, logline: `Call ${PHONE} about the pretzel.` }),
            (error) => {
                assert.equal(error.code, "phone_number_forbidden")
                assert.equal(error.message.includes(PHONE), false)
                assert.match(error.message, /agent id or a LiveKit identity/)
                return true
            }
        )
    })

    test("voice paths cannot escape the library root", () => {
        assert.throws(() =>
            draftPersonas({
                host: {
                    ...castBrief.host,
                    relative_path: "../secrets/host.wav",
                },
            })
        )
    })

    test("writing room providers are the three aliases", () => {
        assert.equal(resolveWritingModel("foundry").model, "foundry")
        assert.equal(resolveWritingModel("copilot").label, "GitHub Copilot")
        assert.equal(resolveWritingModel("OpenWebUI").model, "openwebui")
        assert.throws(() => resolveWritingModel("local-secret"), (error) => {
            assert.equal(error.code, "invalid")
            return true
        })
    })

    test("offline and model callbacks emit the same schema", async () => {
        const offline = await writeTask("premise", brief, {
            offline: true,
            provider: "foundry",
        })
        assert.equal(offline.json.schema_version, SCHEMA_VERSION)

        let seen
        const online = await writeTask("premise", brief, {
            provider: "copilot",
            complete: async (request) => {
                seen = request
                return draftPremise(brief)
            },
        })
        assert.equal(seen.provider.id, "copilot")
        assert.match(seen.prompt, /agentyankers\/v1/)
        assert.equal(seen.schema.properties.premise_id.type, "string")
        assert.equal(online.json.premise_id, offline.json.premise_id)
    })

    test("a model cannot replace the disclosure line", async () => {
        const draft = await draftCommentary(episode)
        await assert.rejects(
            () =>
                writeTask("commentary", episode, {
                    provider: "openwebui",
                    complete: async () => ({
                        commentary: draft.commentary.map((line, index) =>
                            index === 0 ? { ...line, text: "we are live" } : line
                        ),
                    }),
                }),
            (error) => {
                assert.equal(error.code, "disclosure_required")
                return true
            }
        )
    })

    test("a model can rewrite host lines and show-note titles", async () => {
        const commentary = await writeTask("commentary", episode, {
            provider: "foundry",
            complete: async () => {
                const draft = await draftCommentary(episode)
                return {
                    commentary: draft.commentary.map((line) =>
                        line.kind === "intro"
                            ? { ...line, text: "Patsy here. The pretzel is still in the machine." }
                            : line
                    ),
                }
            },
        })
        assert.equal(
            commentary.json.commentary[1].text,
            "Patsy here. The pretzel is still in the machine."
        )
        assert.equal(
            commentary.json.commentary[0].text,
            RECORDING_DISCLOSURE
        )

        const notes = await writeTask("show-notes", episode, {
            provider: "foundry",
            complete: async () => ({
                title: "Pretzel, still uneaten",
                disclosure: "different sentence",
                marks: [{ mark_id: "mark-glen-books" }],
            }),
        })
        assert.equal(notes.json.title, "Pretzel, still uneaten")
        assert.equal(notes.json.disclosure, RECORDING_DISCLOSURE)
        assert.ok(
            notes.json.marks.every((mark) => mark.mark_id !== "mark-glen-books")
        )
    })

    test("fake core selector is used when injected", async () => {
        const local = await draftCommentary(episode)
        const drafted = await draftCommentary(episode, {
            core: {
                selectHighlights() {
                    return local.highlights.map((clip) => ({
                        ...clip,
                        reason: "core rank",
                    }))
                },
                generateCommentary() {
                    return local.commentary
                },
            },
        })
        assert.equal(drafted.highlights[0].reason, "core rank")
        assert.equal(drafted.commentary[0].text, RECORDING_DISCLOSURE)
    })

    test("exported schemas name the v1 models", () => {
        const schemas = exportJsonSchemas()
        for (const name of [
            "PremiseOutline",
            "AgentPersona",
            "PersonaCast",
            "MarkIndex",
            "HighlightClip",
            "CommentaryLine",
            "ShowNotes",
        ]) {
            assert.equal(schemas[name].properties.schema_version.const, SCHEMA_VERSION)
            assert.equal(schemas[name].additionalProperties, false)
        }
        assert.ok(schemas.PremiseOutline.required.includes("logline"))
        assert.ok(schemas.ShowNotes.required.includes("disclosure"))
    })

    test("fixtures and livekit bindings carry env names, not secrets", () => {
        const serialized = JSON.stringify(episode)
        assert.equal(serialized.includes(PHONE), false)
        assert.equal(serialized.includes("api_key"), false)
        assert.equal(episode.sessions[0].livekit.url_env, "LIVEKIT_URL")
        assertNoPhoneNumbers(episode, "fixture")
    })

    test("scripts parse as flat writing-room metadata", () => {
        for (const name of [
            "agentyankers-premise.genai.mjs",
            "agentyankers-personas.genai.mjs",
            "agentyankers-commentary.genai.mjs",
            "agentyankers-show-notes.genai.mjs",
        ]) {
            const source = readFileSync(join(scripts, name), "utf8")
            const match = source.match(/\bscript\(\s*\{.*?\}\s*\)/s)
            assert.ok(match, `${name} script metadata`)
            assert.match(source, /model:\s*"foundry"/)
            assert.match(source, /group:\s*"AgentYankers"/)
            assert.match(source, /runWritingScript\(/)
        }
    })

    test("core adapter is optional", () => {
        const probe = probeCore({ force: true })
        assert.equal(typeof probe.available, "boolean")
        if (probe.available)
            assert.equal(probe.result.schema_version, SCHEMA_VERSION)
        else assert.ok(probe.reason === "import" || probe.reason === "python")
    })

    test("adapter module compiles", { skip: !pythonAvailable() }, () => {
        const adapter = join(root, "agentyankers", "adapter.py")
        const compiled = spawnSync(
            "python3",
            [
                "-c",
                "import py_compile, sys; py_compile.compile(sys.argv[1], cfile='/tmp/agentyankers-adapter.pyc', doraise=True)",
                adapter,
            ],
            { encoding: "utf8" }
        )
        assert.equal(compiled.status, 0, compiled.stderr)
    })
})

function pythonAvailable() {
    const result = spawnSync("python3", ["-c", "print(1)"], { encoding: "utf8" })
    return result.status === 0
}
