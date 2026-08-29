import { describe, expect, test } from "bun:test"
import path from "path"
import { SonderrOauthCallbackPage } from "@sonderr/core/sonderr/oauth/page"

const root = path.join(__dirname, "..", "..")

describe("Sonderr OAuth branding", () => {
  test("Codex OAuth browser flow uses Sonderr branding", async () => {
    const src = await Bun.file(path.join(root, "src", "plugin", "openai", "codex.ts")).text()

    expect(src).toContain('originator: "sonderr"')
    expect(src).toContain('"User-Agent": `sonderr/${InstallationVersion}`')
    expect(src).toContain("return to Sonderr")
    expect(src).not.toContain('originator: "sonderr"')
    expect(src).not.toContain("return to Sonderr")
  })

  test("core OAuth browser flow uses Sonderr branding", async () => {
    const src = await Bun.file(path.join(root, "..", "core", "src", "plugin", "provider", "openai.ts")).text()
    const pages = [
      SonderrOauthCallbackPage.success({ provider: "ChatGPT" }),
      SonderrOauthCallbackPage.error("Denied", { provider: "ChatGPT" }),
    ]

    expect(src).toContain('originator: "sonderr"')
    expect(src).toContain('"User-Agent": `sonderr/${InstallationVersion}`')
    expect(src).toContain("SonderrOauthCallbackPage")
    expect(src).not.toContain('originator: "sonderr"')
    for (const page of pages) {
      expect(page).toContain("· Sonderr</title>")
      expect(page).toContain('aria-label="Sonderr"')
      expect(page).toContain('viewBox="0 0 100 100"')
      expect(page).not.toContain("Sonderr")
      expect(page).not.toContain('viewBox="0 0 234 42"')
    }
  })

  test("MCP OAuth callback page uses Sonderr branding", async () => {
    const src = await Bun.file(path.join(root, "src", "mcp", "oauth-callback.ts")).text()

    expect(src).toContain("return to Sonderr")
    expect(src).not.toContain("return to Sonderr")
  })
})
