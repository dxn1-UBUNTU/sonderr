import { describe, expect, it } from "bun:test"

import {
  disabledProviderOptions,
  providersWithSonderrFallback,
  visibleConnectedIds,
} from "../../webview-ui/src/components/settings/provider-visibility"

describe("visibleConnectedIds", () => {
  it("hides Sonderr from the connected list when auth is missing", () => {
    const ids = visibleConnectedIds(["sonderr", "openrouter"], { openrouter: "api" })

    expect(ids).toEqual(["openrouter"])
  })

  it("keeps Sonderr in the connected list when auth exists", () => {
    const ids = visibleConnectedIds(["sonderr", "openrouter"], { sonderr: "oauth", openrouter: "api" })

    expect(ids).toEqual(["sonderr", "openrouter"])
  })

  it("leaves non-Sonderr providers untouched", () => {
    const ids = visibleConnectedIds(["anthropic"], {})

    expect(ids).toEqual(["anthropic"])
  })
})

describe("disabledProviderOptions", () => {
  it("includes Sonderr and excludes already disabled providers", () => {
    const options = disabledProviderOptions(
      {
        sonderr: { id: "sonderr", name: "Sonderr Gateway", env: [], models: {} },
        openai: { id: "openai", name: "OpenAI", env: [], models: {} },
        anthropic: { id: "anthropic", name: "Anthropic", env: [], models: {} },
      },
      ["openai"],
    )

    expect(options).toEqual([
      { value: "anthropic", label: "Anthropic" },
      { value: "sonderr", label: "Sonderr Gateway" },
    ])
  })

  it("sorts options by provider name", () => {
    const options = disabledProviderOptions(
      {
        zed: { id: "zed", name: "Zed", env: [], models: {} },
        alpha: { id: "alpha", name: "Alpha", env: [], models: {} },
      },
      [],
    )

    expect(options).toEqual([
      { value: "alpha", label: "Alpha" },
      { value: "zed", label: "Zed" },
    ])
  })
})

describe("providersWithSonderrFallback", () => {
  it("adds Sonderr when backend providers omit it", () => {
    const providers = providersWithSonderrFallback({
      anthropic: { id: "anthropic", name: "Anthropic", env: [], models: {} },
    })

    expect(providers.sonderr?.name).toBe("Sonderr Gateway")
    expect(providers.anthropic?.name).toBe("Anthropic")
  })

  it("keeps the backend Sonderr provider when present", () => {
    const providers = providersWithSonderrFallback({
      sonderr: { id: "sonderr", name: "Custom Sonderr Name", env: [], models: {} },
    })

    expect(providers.sonderr?.name).toBe("Custom Sonderr Name")
  })
})
