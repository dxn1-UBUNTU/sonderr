import { describe, expect, test } from "bun:test"
import { buildRequestHeaders } from "../src/provider"

describe("Sonderr provider request headers", () => {
  test("request headers override provider defaults", () => {
    const headers = buildRequestHeaders(
      {
        "content-type": "application/json",
        "x-sonderr-feature": "vscode-extension",
        "x-default-only": "kept",
      },
      {
        "x-sonderr-feature": "agent-manager",
        "x-request-only": "kept-too",
      },
    )

    expect(headers.get("content-type")).toBe("application/json")
    expect(headers.get("x-sonderr-feature")).toBe("agent-manager")
    expect(headers.get("x-default-only")).toBe("kept")
    expect(headers.get("x-request-only")).toBe("kept-too")
  })
})
