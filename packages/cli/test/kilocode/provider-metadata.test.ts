import { describe, expect, test } from "bun:test"
import { providerMetadata } from "../../src/sonderr/provider/metadata"

describe("providerMetadata", () => {
  test("returns shared provider key, icon, and priority metadata", () => {
    expect(providerMetadata("openai")).toEqual({
      noteKey: "settings.providers.note.openai",
      icon: "openai",
      priority: 3,
    })
  })

  test("maps github copilot aliases to stable metadata", () => {
    expect(providerMetadata("github-copilot-custom")).toEqual({
      noteKey: "settings.providers.note.copilot",
      icon: "github-copilot",
    })
  })

  test("uses the Sonderr icon for Sonderr Gateway", () => {
    expect(providerMetadata("sonderr")).toEqual({
      noteKey: "settings.providers.note.sonderr",
      icon: "sonderr",
      priority: 0,
    })
  })

  test("falls back to synthetic icon for unknown providers", () => {
    expect(providerMetadata("unknown-provider")).toEqual({ icon: "synthetic" })
  })
})
