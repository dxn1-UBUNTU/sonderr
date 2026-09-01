import { Effect, Schema } from "effect"
import * as Tool from "./tool"
import DESCRIPTION from "./websearch_js.txt"

export const Parameters = Schema.Struct({
  url: Schema.String.annotate({ description: "The URL to fetch and render with JavaScript" }),
  waitFor: Schema.optional(Schema.String).annotate({
    description: "CSS selector to wait for before extracting content (e.g. '#content', '.results')",
  }),
  extractMode: Schema.optional(
    Schema.Union([Schema.Literal("text"), Schema.Literal("html"), Schema.Literal("markdown")]),
  ).annotate({
    description: "How to extract content: 'text' (plain text), 'html' (raw HTML), 'markdown' (converted). Default: 'markdown'",
  }),
  maxChars: Schema.optional(Schema.Number).annotate({
    description: "Maximum characters to return (default: 10000)",
  }),
})

export const WebSearchJsTool = Tool.define(
  "websearch_js",
  Effect.gen(function* () {
    return {
      description: DESCRIPTION,
      parameters: Parameters,
      execute: (params: Schema.Schema.Type<typeof Parameters>, ctx: Tool.Context) =>
        Effect.gen(function* () {
          const extractMode = params.extractMode ?? "markdown"
          const maxChars = params.maxChars ?? 10000

          let browser: any
          try {
            const { chromium } = require("playwright")
            browser = await chromium.launch({ headless: true })
          } catch {
            yield* Effect.fail(
              new Error("Playwright not installed. Run: bun add -g playwright && playwright install chromium"),
            )
          }

          const page = await browser.newPage()
          await page.setViewportSize({ width: 1280, height: 800 })

          try {
            await page.goto(params.url, { waitUntil: "networkidle", timeout: 30000 })

            if (params.waitFor) {
              await page.waitForSelector(params.waitFor, { timeout: 10000 })
            }

            await page.waitForTimeout(1000)

            let content: string

            if (extractMode === "text") {
              content = await page.evaluate(() => document.body.innerText)
            } else if (extractMode === "html") {
              content = await page.content()
            } else {
              content = await page.evaluate(() => {
                const turndown = require("turndown")
                const td = new turndown()
                return td.turndown(document.body.innerHTML)
              })
            }

            await browser.close()

            if (content.length > maxChars) {
              content = content.slice(0, maxChars) + "\n\n... [truncated]"
            }

            return {
              title: `JS Render: ${params.url}`,
              output: content,
              metadata: {
                url: params.url,
                extractMode,
                chars: content.length,
              },
            }
          } catch (err: any) {
            await browser.close()
            yield* Effect.fail(new Error(`Failed to render ${params.url}: ${err.message}`))
          }
        }).pipe(Effect.orDie),
    }
  }),
)