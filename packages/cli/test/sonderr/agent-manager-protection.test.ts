import { describe, expect, test } from "bun:test"
import { assertMutablePath } from "@/sonderr/agent-manager/protection"

describe("Agent Manager state protection", () => {
  test("rejects direct edits to Agent Manager state", () => {
    expect(() => assertMutablePath("/workspace/.sonderr/agent-manager.json")).toThrow(
      "Do not edit Agent Manager state directly",
    )
    expect(() => assertMutablePath("/workspace/.sonderr/agent-manager.json")).toThrow(
      "Do not edit Agent Manager state directly",
    )
  })

  test("allows ordinary project files", () => {
    expect(() => assertMutablePath("/workspace/.sonderr/settings.json")).not.toThrow()
    expect(() => assertMutablePath("/workspace/src/agent-manager.json")).not.toThrow()
  })
})
