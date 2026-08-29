// sonderr_change - new file
import { expect, test } from "bun:test"
import { cliCommand } from "../../src/cli/cmd/pr"

test("cliCommand uses the current script when argv[1] is a file path", () => {
  const result = cliCommand({
    execPath: "/usr/bin/node",
    argv: ["/usr/bin/node", "/tmp/sonderr.js", "pr", "1"],
    exists: (file) => file === "/tmp/sonderr.js",
  })

  expect(result).toEqual(["/usr/bin/node", "/tmp/sonderr.js"])
})

test("cliCommand falls back to execPath when argv[1] is a subcommand", () => {
  const result = cliCommand({
    execPath: "/usr/local/bin/sonderr",
    argv: ["/usr/local/bin/sonderr", "pr", "1"],
    exists: () => false,
  })

  expect(result).toEqual(["/usr/local/bin/sonderr"])
})

test("cliCommand ignores subcommand token even when it exists on disk", () => {
  const result = cliCommand({
    execPath: "/usr/local/bin/sonderr",
    argv: ["/usr/local/bin/sonderr", "pr", "1"],
    exists: (file) => file === "pr",
  })

  expect(result).toEqual(["/usr/local/bin/sonderr"])
})

test("cliCommand falls back to execPath when argv[1] is missing", () => {
  const result = cliCommand({
    execPath: "/usr/local/bin/sonderr",
    argv: ["/usr/local/bin/sonderr"],
    exists: () => false,
  })

  expect(result).toEqual(["/usr/local/bin/sonderr"])
})

test("cliCommand falls back to execPath for bun virtual script paths", () => {
  const unix = cliCommand({
    execPath: "/tmp/sonderr",
    argv: ["/tmp/sonderr", "/$bunfs/root/src/index.js", "pr", "1"],
    exists: () => true,
  })

  const win = cliCommand({
    execPath: "C:/tmp/sonderr.exe",
    argv: ["C:/tmp/sonderr.exe", "B:/~BUN/root/src/index.js", "pr", "1"],
    exists: () => true,
  })

  expect(unix).toEqual(["/tmp/sonderr"])
  expect(win).toEqual(["C:/tmp/sonderr.exe"])
})
