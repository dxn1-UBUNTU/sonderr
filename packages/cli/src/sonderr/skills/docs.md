---
name: docs
description: Technical documentation and document generation. Use when writing docs, README files, API documentation, architecture docs, or generating PDFs. Covers document structure, writing quality, and PDF generation.
---

# Documentation Skill — Write Docs People Actually Read

Good documentation is a feature. Users rely on it to understand, adopt, and troubleshoot your software. Bad documentation is worse than none — it misleads and frustrates. This skill ensures you write docs that inform and empower.

## The Documentation Mindset

Documentation serves the reader, not the writer. Every sentence should answer a question the reader has. If a sentence doesn't help the reader, cut it.

## Document types

### README
The front door of your project. Must answer: what is this, why does it exist, how do I start?

Structure:
1. **Project name and one-line description** — what it does, in one sentence
2. **Badges** — build status, version, license (if applicable)
3. **Features** — bullet list of key capabilities
4. **Install** — copy-paste commands to get started
5. **Quick start** — minimal example that works
6. **Documentation** — link to full docs
7. **Configuration** — key options and what they do
8. **Contributing** — how to help
9. **License** — what others can do with it

### API Documentation
Reference for developers using your code. Every public function/type needs:
- **What it does** — one sentence
- **Parameters** — name, type, description, default
- **Returns** — type and meaning
- **Throws** — when and why
- **Example** — minimal usage

### Architecture Docs
Explain the system to new team members. Cover:
- **Overview** — what the system does and why
- **Components** — major pieces and their responsibilities
- **Data flow** — how information moves through the system
- **Decisions** — why choices were made (and what was rejected)
- **Diagrams** — visual explanations of structure/flow

### User Guides
Walk readers through common tasks:
- **Prerequisites** — what they need before starting
- **Steps** — numbered, specific, verifiable
- **Expected results** — what they should see after each step
- **Troubleshooting** — what to do when things go wrong

## Writing rules

### Be specific
- ✅ "Runs `npm install` to install dependencies"
- ❌ "Install the required dependencies"

### Use active voice
- ✅ "The server validates the token"
- ❌ "The token is validated by the server"

### One idea per sentence
- ✅ "The API returns JSON. The response includes a `status` field."
- ❌ "The API returns JSON and the response includes a `status` field which indicates success or failure."

### Lead with the answer
- ✅ "To reset your password, click 'Forgot Password' on the login screen."
- ❌ "The login screen has several options. One of them is 'Forgot Password'. This option starts the password reset flow. To reset your password, you would use this option."

### Show, don't just tell
- ✅ Include a code example for every concept
- ✅ Show the expected output
- ✅ Demonstrate the happy path AND error cases

## Code examples in docs

Every code example should:
1. **Work as-is** — copy-paste runnable
2. **Be minimal** — demonstrate one concept at a time
3. **Have comments** — explain the non-obvious parts
4. **Show output** — what should the reader expect?

```typescript
// Create a client with your API key
const client = new MyClient({
  apiKey: process.env.MY_API_KEY, // Get this from dashboard.example.com
})

// Fetch a user by ID
const user = await client.users.get("user_123")
// Returns: { id: "user_123", name: "Alice", email: "alice@example.com" }

console.log(user.name) // "Alice"
```

## Markdown formatting

### Headers
- One H1 per document (`# Title`)
- Use H2 for major sections (`## Installation`)
- Use H3 for subsections (`### Configuration options`)
- Never skip levels (don't jump from H2 to H4)

### Code blocks
- Always specify the language: ```typescript, ```bash, ```json
- Use `diff` for showing changes
- Inline code for: file paths, command names, variable names, short expressions

### Lists
- Use numbered lists for sequential steps
- Use bullet lists for non-sequential items
- Keep list items parallel in structure

### Tables
- Use for structured comparisons (options vs features)
- Keep compact — don't pad cells for alignment

### Links
- Descriptive link text: "see the [installation guide](install.md)"
- Not: "click [here](install.md) to install"

## PDF generation

When generating PDFs from Markdown:

### Tools
- **Pandoc** — Markdown to PDF via LaTeX
- **md-to-pdf** — Node.js Markdown to PDF
- **WeasyPrint** — HTML/CSS to PDF
- **Playwright** — render HTML and export PDF

### Best practices
1. **Structure first** — outline the document before writing
2. **Use a cover page** — title, author, date, version
3. **Table of contents** — auto-generated from headers
4. **Page breaks** — between major sections
5. **Code highlighting** — syntax highlighting in code blocks
6. **Headers/footers** — page numbers, document title
7. **Consistent fonts** — use system fonts or embed

### Example PDF generation
```bash
# Using md-to-pdf (Node.js)
npx md-to-pdf README.md --config-file pdf-config.js

# Using Pandoc
pandoc README.md -o documentation.pdf --toc --pdf-engine=xelatex

# Using Playwright (programmatic)
const { chromium } = require("playwright")
const browser = await chromium.launch()
const page = await browser.newPage()
await page.setContent(renderedHtml)
await page.pdf({ path: "output.pdf", format: "A4" })
```

## README checklist

Before declaring a README complete:
- [ ] One-line description at the top
- [ ] Install instructions (copy-paste ready)
- [ ] Quick start example (runnable)
- [ ] Configuration options documented
- [ ] API reference or link to it
- [ ] Contributing guide or link
- [ ] License specified
- [ ] No broken links
- [ ] Code examples work

## What NOT to do

- ❌ Don't write docs that just repeat the code — explain the WHY
- ❌ Don't use "simply" or "just" — if it's simple, you don't need to say so
- ❌ Don't document every parameter — only the ones users need to know
- ❌ Don't leave TODOs in documentation — either write it or leave it out
- ❌ Don't assume knowledge — link to prerequisites
- ❌ Don't write novels — if it's longer than needed, split it into pages
- ❌ Don't forget to update docs when code changes

## Documentation-driven development

The best time to write docs is alongside code:
1. Write the README section explaining the feature (what will users need to know?)
2. Write the API docs (what will developers call?)
3. Implement the feature
4. Update docs with actual behavior

This ensures docs are accurate because they're written by someone who just built the feature.