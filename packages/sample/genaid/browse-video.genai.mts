import { delay} from "genaid/runtime"
script({
    model: "small",
    group: "browser",
})
const page = await host.browse("https://darbotlabs.github.io/genaid/", {
    headless: true,
    recordVideo: true,
})
await delay(1000)
await page.close()
const video = await page.video().path()
console.log(`video ${video}`)
