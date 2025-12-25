## GenAID Code Generation Instructions

GenAID is a custom runtime for node.js. It provides a set of unique APIs and support the TypeScript syntax.

- GenAID documentation: https://darbotlabs.github.io/genaid/llms-full.txt

## Guidance for Code Generation

- you always generate TypeScript code using ESM modules for Node.JS.
- you prefer using APIs from GenAID `genaid.d.ts` rather than node.js. Do NOT use node.js imports.
- you keep the code simple, avoid exception handlers or error checking.
- you add `TODOs` where you are unsure so that the user can review them
- you use the global types in genaid.d.ts are already loaded in the global context, no need to import them.
- save generated code in the `./genaid` folder with `.genaid.mts` extension
