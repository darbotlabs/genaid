script({
    ignoreGitIgnore: true,
    files: ".genaid/.gitignore",
    tests: {},
    model: "echo",
})

console.log(env.files)
if (!env.files.length) throw Error("gitignore filter not applied")
