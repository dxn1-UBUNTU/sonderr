import { expect, test } from "bun:test"
import { internalTuiPlugins } from "@/plugin/tui/internal"

const sonderr = [
  "internal:home-news",
  "internal:home-onboarding",
  "internal:sonderr-attention",
  "internal:sonderr-home-footer",
  "internal:sonderr-permissions",
  "internal:sonderr-sidebar-footer",
  "internal:sonderr-sidebar-memory",
  "internal:sonderr-memory-palette",
  "internal:sonderr-sidebar-background-processes",
  "internal:sonderr-sidebar-indexing",
  "internal:sonderr-sidebar-pr",
  "internal:sonderr-sidebar-usage",
  "internal:sandbox",
  "internal:remote",
  "internal:reload",
]

test("internal TUI registry preserves every Sonderr plugin before upstream builtins", () => {
  const ids = internalTuiPlugins({ experimentalEventSystem: false, experimentalSessionSwitcher: false }).map(
    (plugin) => plugin.id,
  )

  expect(ids.slice(0, sonderr.length)).toEqual(sonderr)
  expect(new Set(ids).size).toBe(ids.length)
  expect(ids).toContain("internal:sidebar-context")
  expect(ids).toContain("diff-viewer")
})

test("experimental Sonderr TUI plugins remain wired", () => {
  const ids = internalTuiPlugins({ experimentalEventSystem: true, experimentalSessionSwitcher: true }).map(
    (plugin) => plugin.id,
  )

  expect(ids).toContain("internal:session-v2-debug")
  expect(ids).toContain("internal:session-switcher")
})
