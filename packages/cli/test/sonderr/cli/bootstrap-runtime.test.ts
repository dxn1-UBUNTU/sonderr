import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { SonderrCli } from "../../../src/sonderr/cli/setup"
import { createHelpCommand } from "../../../src/sonderr/help-command"
import { resetLazyCommandSelection } from "../../../src/sonderr/cli/lazy-commands"
import yargs from "yargs"

describe("CLI bootstrap runtime selection", () => {
  beforeEach(resetLazyCommandSelection)
  afterEach(resetLazyCommandSelection)

  test("uses the narrow runtime for worker-backed TUI launches", () => {
    expect(SonderrCli.workerTui({ _: [] })).toBe(true)
    expect(SonderrCli.workerTui({ _: ["./project"] })).toBe(true)
  })

  test("keeps full bootstrap for explicit, mini, and worktree commands", () => {
    expect(SonderrCli.workerTui({ _: [], mini: true })).toBe(false)
    expect(SonderrCli.workerTui({ _: [], worktree: "feature" })).toBe(false)
  })

  test("keeps full bootstrap when the eager help command is selected", () => {
    const command = createHelpCommand()
    if (typeof command.builder !== "function") throw new Error("help builder is not a function")
    command.builder(yargs([]))
    expect(SonderrCli.workerTui({ _: [] })).toBe(false)
  })
})
