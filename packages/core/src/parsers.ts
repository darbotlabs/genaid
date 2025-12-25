import { JSON5TryParse, JSONLLMTryParse } from "./json5"
import { JSONLTryParse } from "./jsonl"
import { YAMLParse } from "./yaml"
import { XMLParse } from "./xml"
import { TOMLParse } from "./toml"
import { parsePdf } from "./pdf"
import { DOCXTryParse } from "./docx"
import { CSVParse } from "./csv"
import { frontmatterTryParse } from "./frontmatter"
import { unzip } from "./zip"
import { MathTryEvaluate } from "./math"
import { validateJSONWithSchema } from "./schema"
import { hash } from "./crypto"
import { dedent } from "./indent"
import { unthink } from "./think"
import { approximateTokens } from "./tokens"
import { vttSrtParse } from "./transcription"
import { unfence } from "./unwrappers"
import { promptyParse } from "./prompty"
import { readText } from "./fs"
import { resolveFileBytes } from "./file"
import type { TraceOptions } from "./trace"
import type { CancellationOptions } from "./cancellation"

/**
 * Centralized parser factory used by prompts and tests. It stitches together
 * the various parsing helpers spread across the codebase.
 */
export async function createParsers(
    options?: Partial<TraceOptions & CancellationOptions> & { model?: string }
) {
    const { trace, cancellationToken } = options || {}

    return {
        JSON5: (text: string, defaultValue?: any) =>
            JSON5TryParse(text, defaultValue),
        JSONL: (text: string) => JSONLTryParse(text, { repair: true }),
        YAML: (text: string | WorkspaceFile) => YAMLParse(text),
        XML: (text: string | WorkspaceFile, xmlOptions?: any) =>
            XMLParse(text, xmlOptions),
        TOML: (text: string | WorkspaceFile) => TOMLParse(text),
        PDF: async (
            file: string | WorkspaceFile,
            pdfOptions?: any
        ) => {
            const filename =
                typeof file === "string" ? file : file?.filename ?? ""
            const content =
                typeof file === "object" &&
                file !== null &&
                "content" in file &&
                file.content instanceof Uint8Array
                    ? (file.content as Uint8Array)
                    : undefined
            const res = await parsePdf(content ?? filename, {
                cancellationToken,
                trace,
                ...(pdfOptions || {}),
            })
            const images =
                res.pages
                    ?.map((p: any) => (p as any).image)
                    .filter(Boolean) || []
            return {
                ...res,
                file: { filename, content: res.content },
                images,
            }
        },
        DOCX: async (
            file: string | WorkspaceFile,
            docxOptions?: any
        ) => {
            return DOCXTryParse(file, { trace, ...(docxOptions || {}) })
        },
        prompty: async (file: { filename: string } | string) => {
            const filename =
                typeof file === "string" ? file : file?.filename ?? ""
            const text = await readText(filename)
            return promptyParse(filename, text)
        },
        CSV: (text: string | WorkspaceFile, csvOptions?: any) =>
            CSVParse(text, csvOptions),
        frontmatter: (
            text: string | WorkspaceFile,
            fmOptions?: { format: "yaml" | "json" | "toml" | "text" }
        ) => frontmatterTryParse(text, fmOptions),
        unzip: async (
            file: WorkspaceFile | Uint8Array,
            zipOptions?: any
        ) => {
            const data =
                file instanceof Uint8Array
                    ? file
                    : await resolveFileBytes(file as any)
            return unzip(data, zipOptions)
        },
        math: async (
            expr: string,
            mathOptions?: { scope?: object; defaultValue?: number }
        ) => MathTryEvaluate(expr, { trace, ...(mathOptions || {}) }),
        validateJSON: (schema: any, content: any) =>
            validateJSONWithSchema(content, schema, { trace }),
        hash: (value: any, hashOptions?: { length?: number; version?: boolean }) =>
            hash(value, {
                readWorkspaceFiles: true,
                version: hashOptions?.version ?? true,
                ...(hashOptions || {}),
            }),
        dedent: (text: string) => dedent(text),
        unthink: (text: string) => unthink(text),
        tokens: (text: string) => approximateTokens(text),
        transcription: (text: string) => vttSrtParse(text),
        unfence: (text: string, lang?: string) => unfence(text, lang),
        JSONLLM: (text: string) => JSONLLMTryParse(text),
    }
}
