import { delay } from "genaid/runtime"

script({ model: "echo" })
const page = await host.browse(
    "https://darbotlabs.github.io/genaid/reference/scripts/browser/",
    {
        headless: false,
        browser: "firefox",
    }
)

const page2 = await host.browse(
    "https://darbotlabs.github.io/genaid/reference/scripts/browser/",
    {
        headless: false,
        browser: "chromium",
    }
)

await runPrompt(
    async (_) => {
        const page3 = await host.browse(
            "https://darbotlabs.github.io/genaid/reference/scripts/browser/",
            {
                headless: false,
            }
        )
    },
    { model: "echo" }
)

await delay(5000)
