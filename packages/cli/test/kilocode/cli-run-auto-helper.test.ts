// sonderr_change - new file
import { describe, expect, test } from "bun:test"
import { SonderrRunAuto } from "../../src/sonderr/cli/run-auto"

describe("SonderrRunAuto", () => {
  test("tracks task child sessions without allowing unrelated sessions", () => {
    const state = SonderrRunAuto.create("ses_root")

    expect(SonderrRunAuto.allowed(state, "ses_root")).toBe(true)
    expect(SonderrRunAuto.allowed(state, "ses_child")).toBe(false)

    SonderrRunAuto.track(state, {
      type: "tool",
      tool: "task",
      sessionID: "ses_root",
      state: {
        metadata: {
          sessionId: "ses_child",
        },
      },
    })

    expect(SonderrRunAuto.allowed(state, "ses_child")).toBe(true)
    expect(SonderrRunAuto.allowed(state, "ses_other")).toBe(false)
  })

  test("ignores malformed or non-root task metadata", () => {
    const state = SonderrRunAuto.create("ses_root")

    SonderrRunAuto.track(state, {
      type: "tool",
      tool: "task",
      sessionID: "ses_root",
      state: {
        metadata: {
          sessionId: "",
        },
      },
    })
    SonderrRunAuto.track(state, {
      type: "tool",
      tool: "task",
      sessionID: "ses_other",
      state: {
        metadata: {
          sessionId: "ses_wrong",
        },
      },
    })
    SonderrRunAuto.track(state, {
      type: "text",
      sessionID: "ses_root",
      state: {},
    })

    expect(SonderrRunAuto.allowed(state, "ses_wrong")).toBe(false)
    expect(SonderrRunAuto.allowed(state, "")).toBe(false)
  })
})
