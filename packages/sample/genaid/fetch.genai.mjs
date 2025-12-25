script({
    model: "small",
    tests: {
        keywords: "genaid",
    },
})

/**
 * @type {any}
 */
const res = await host.fetch(
    "https://raw.githubusercontent.com/darbotlabs/genaid/main/package.json",
    { method: "GET" }
)
const pkg = await res.json()

const { file: readme } = await host.fetchText(
    "https://raw.githubusercontent.com/darbotlabs/genaid/refs/heads/main/README.md"
)

def("PACKAGE", YAML.stringify(pkg))
def("README", readme)

$`Explain the purpose of the product described in PACKAG and README. Mention its name.`
