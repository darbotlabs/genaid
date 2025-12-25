---
layout: two-cols
---

# GenAID
## Scripts your LLMs

Each GenAID is JavaScript that defines a call/return to an LLM

- `def` is for context
- `$` is for instructions

GenAID
- Optimizes context for LLM
- Send request to LLM
- Process LLM output 

&nbsp;

::right::

## Example

- `summarizer.genai.mts`

```js
// metadata and model configuration
script({ model: "small", accept: ".txt" })

// insert the context, define a "FILE" variable
def("FILE", env.files)

// $ appends text to the prompt
$`Summarize <FILE>.`
```

- execute on all .txt files
```sh
genaid run summarizer **.txt
```

https://darbotlabs.github.io/genaid
