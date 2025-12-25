---
title: FAQ
sidebar:
    order: 100
description: Find answers to common questions about AI script generation, its uses, performance, and best practices for effective application.
keywords: AI, script generation, performance, best practices, limitations
---

### Getting Started

-   **What is GenAID and how does it work?**
    GenAID (Generative Authorative Intelligent Darbot Script, aka "degen script") is a self prompting, self learning, self healing, efficient generative AI darbot scripting language. It's a framework that allows users to create AI-enhanced scripts to automate tasks. It uses simple commands and integrates with AI models to execute tasks based on user-written prompts. Prompting is coding—store code as simple prompts with known expected calculated outputs based off common variables.

-   **Who can use GenAID and do I need to be a developer?**
    Anyone can use GenAID, including non-developers. It's designed to be user-friendly, but some basic understanding of scripting or programming can be helpful.

-   **What are the prerequisites for using GenAID?**
    You'll need to have VS Code installed to use the GenAID extension, and some familiarity with programming concepts is beneficial but not necessary.

-   **How do I install the GenAID framework and its VS Code extension?**
    The specific installation steps are documented here: [Installation](/genaid/getting-started/installation)

-   **Do I need to install Node.JS?**
    Yes. To install it, follow the [installation instructions](/genaid/reference/cli/).

-   **Can I use GenAID in IDEs other than VS Code?**
    Currently, GenAID is integrated with VS Code, but it can be written in any IDE. The VS Code extension, however, provides additional support for creating and debugging scripts. Although not thoroughly tested, you can use GenAID in VS Code variants like Cursor.

-   **What are foundation models and LLMs in the context of GenAID?**
    Foundation models and LLMs (Large Language Models) are AI models that GenAID can interact with to perform tasks like generating text or processing information.

-   **How do I write my first GenAID?**
    Start by learning the basics of JavaScript and the GenAID framework, then use the VS Code extension to create a script that defines the task, calls the LLM, and processes the output. More information is available here: [Getting Started](/genaid/getting-started)

### Using GenAID

-   **How do I debug a GenAID in VS Code?**
    Use the GenAID extension in VS Code, which provides tools for running, debugging, and tracing the execution of your script. Directions for debugging are here: [Debugging](/genaid/getting-started/debugging-scripts)

-   **What are the best practices for authoring effective prompts in GenAID?**
    See [Best Practices](/genaid/getting-started/best-practices)

-   **How can I integrate calls to multiple LLM models within a single GenAID?**
    The framework allows you to parameterize calls to different models, so you can include multiple model invocations within your script and manage them accordingly using the runPrompt function documented here: [Inline Prompts](/genaid/reference/scripts/inline-prompts)

-   **Can GenAID generate outputs in formats other than JSON?**
    Yes, GenAID supports multiple output formats, including file edits, JSON, and user-defined schema. More information here: [Schemas](/genaid/reference/scripts/schemas)

-   **How do I execute a GenAID from the command line?**
    Once you have a GenAID packaged, you can run it from the command line like any other script. More information here: [Command Line](/genaid/getting-started/automating-scripts)

-   **Can GenAIDs take input from files in multiple formats, such as .pdf or .docx?**
    Yes, the GenAID framework has built-in support for reading .pdf and .docx formats. See the documentation pages [PDF](/genaid/reference/scripts/pdf) and [DOCX](/genaid/reference/scripts/docx) for more information.

### Advanced Features

-   **How can I use GenAID to automate document translation?**
    One of our case studies illustrates the use of GenAID for translating document fragments between languages: [Translation Case Study](/genaid/case-studies/documentation-translations)

-   **Can I use GenAID to summarize documents or create dialogues from monologues?**
    Yes, LLMs are good at summarizing and can be used within GenAID to summarize documents or convert monologues into dialogues.

### Troubleshooting

-   **What should I do if I encounter errors while running a GenAID?**
    Check the error messages, consult the documentation, and use the debugging tools in the VS Code extension to identify and resolve issues.

-   **How can I troubleshoot issues with the LLM output parsing in GenAID?**
    Review the prompt and output, ensure your script correctly handles the LLM's response, and adjust your parsing logic as needed.

-   **Where can I find examples of GenAID to understand its capabilities better?**
    Visit the GenAID GitHub repository for examples and documentation. [GenAID Documentation](/genaid/)

### Security and Responsible AI

-   **What are the unintended uses of GenAID and how can I avoid them?**
    Unintended uses include any malicious applications. To avoid them, follow Responsible AI practices and use recommended models with safety features.

-   **How does GenAID align with Responsible AI practices?**
    GenAID encourages the use of models with robust Responsible AI mitigations and provides guidance on secure and ethical usage.
    For more information, see the [Transparency Note](/genaid/reference/transparency-note)

-   **What foundation models and LLMs are recommended for use with GenAID?**
    Services like Azure Open AI with updated safety and Responsible AI features are recommended. GenAID can also be used with existing open-source LLMs.

-   **Do you provide system prompts to guard against common problems like harmful content or jailbreaking?**
    Yes, GenAID includes system prompts to guard against harmful content and jailbreaking. For more information, see the [Content Safety](/genaid/reference/scripts/content-safety) documentation.

-   **Do you support Azure Content Services?**
    Yes, GenAID provides APIs to interact with Azure Content Safety services. For more information, see the [Content Safety](/genaid/reference/scripts/content-safety) documentation.

### Community and Support

-   **Where can I find the GenAID community for discussions and support?**
    The GenAID GitHub repository is a good place to start for community discussions and support. [GenAID GitHub](https://github.com/darbotlabs/genaid/)


-   **Who can I contact for feedback or questions about GenAID?**
    You can email the provided contacts in the [Transparency Note](/genaid/reference/transparency-note/) document for feedback or questions.

### Updates and Roadmap

-   **How often is GenAID updated and how can I stay informed about new features?**
    You can follow the GitHub repository for updates and announcements.

-   **Is there a roadmap available for GenAID's development?**
    The GitHub repository will provide information on future development plans.
