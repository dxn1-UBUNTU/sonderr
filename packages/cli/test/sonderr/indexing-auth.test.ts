import { describe, expect, test } from "bun:test"
import {
  hasSonderrIndexingAuth,
  resolveSonderrIndexingAuth,
  shouldDefaultIndexingToSonderr,
} from "../../src/sonderr/indexing-auth"

describe("Sonderr indexing auth resolution", () => {
  test("detects auth from explicit indexing Sonderr config", () => {
    const auth = resolveSonderrIndexingAuth({
      config: { indexing: { sonderr: { apiKey: "idx-token", baseUrl: "https://idx.test", organizationId: "org_idx" } } },
    })

    expect(auth).toEqual({ apiKey: "idx-token", baseUrl: "https://idx.test", organizationId: "org_idx" })
    expect(hasSonderrIndexingAuth({ config: { indexing: { sonderr: { apiKey: "idx-token" } } } })).toBe(true)
  })

  test("detects auth from provider config, provider state, auth storage, and env", () => {
    expect(
      resolveSonderrIndexingAuth({ config: { provider: { sonderr: { options: { apiKey: "cfg-token" } } } } }).apiKey,
    ).toBe("cfg-token")
    expect(resolveSonderrIndexingAuth({ provider: { options: { sonderrToken: "provider-token" } } }).apiKey).toBe(
      "provider-token",
    )
    expect(resolveSonderrIndexingAuth({ auth: { type: "oauth", access: "oauth-token", accountId: "org_oauth" } })).toEqual(
      {
        apiKey: "oauth-token",
        organizationId: "org_oauth",
      },
    )
    expect(resolveSonderrIndexingAuth({ env: { SONDERR_API_KEY: "env-token", SONDERR_ORG_ID: "org_env" } })).toEqual({
      apiKey: "env-token",
      organizationId: "org_env",
    })
  })

  test("defaults to Sonderr only when no provider or other embedder config is present", () => {
    const auth = { apiKey: "sonderr-token" }

    expect(shouldDefaultIndexingToSonderr({}, auth)).toBe(true)
    expect(shouldDefaultIndexingToSonderr({ provider: "openai" }, auth)).toBe(false)
    expect(shouldDefaultIndexingToSonderr({ openai: { apiKey: "openai-key" } }, auth)).toBe(false)
    expect(shouldDefaultIndexingToSonderr({ ollama: { baseUrl: "http://localhost:11434" } }, auth)).toBe(false)
  })
})
