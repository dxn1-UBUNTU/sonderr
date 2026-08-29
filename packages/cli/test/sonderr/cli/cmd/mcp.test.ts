import { describe, expect, test } from "bun:test"
import { SonderrMcpConfig } from "@/sonderr/cli/cmd/mcp"

const added = `{
  "permission": {
    "bash": "allow"
  },
  "mcp": {
    "linear": {
      "type": "remote",
      "url": "https://mcp.linear.app/mcp",
      "oauth": {}
    }
  },
}`

describe("SonderrMcpConfig.format", () => {
  test("writes strict JSON for sonderr.json", () => {
    const output = SonderrMcpConfig.format("/tmp/sonderr.json", added)

    expect(JSON.parse(output)).toEqual({
      permission: { bash: "allow" },
      mcp: {
        linear: {
          type: "remote",
          url: "https://mcp.linear.app/mcp",
          oauth: {},
        },
      },
    })
    expect(output).not.toEndWith(",\n}")
  })

  test("preserves JSONC formatting for sonderr.jsonc", () => {
    expect(SonderrMcpConfig.format("/tmp/sonderr.jsonc", added)).toBe(added)
  })
})
