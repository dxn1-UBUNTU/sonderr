import { describe, expect, test } from "bun:test"
import { SonderrPtySelfCommand } from "../../src/sonderr/pty/self-command"

describe("pty self-command", () => {
  test("does not forward bundled bun entrypoints", () => {
    const proc = {
      argv: ["/tmp/sonderr", "/$bunfs/root/src/index.js"],
      execArgv: ["--user-agent=sonderr/test", "--use-system-ca", "--"],
      execPath: "/tmp/sonderr",
      cwd: "/tmp",
    }

    const cmd = SonderrPtySelfCommand.command(proc)
    expect(cmd).toStrictEqual({ command: "/tmp/sonderr", args: [] })
    expect(SonderrPtySelfCommand.resolve({ command: "sonderr", cwd: "/tmp/project" }, cmd)).toStrictEqual({
      command: "/tmp/sonderr",
      args: [],
      cwd: "/tmp/project",
    })
    expect(
      SonderrPtySelfCommand.command({
        ...proc,
        argv: ["C:/tmp/sonderr.exe", "B:/~BUN/root/src/index.js"],
      }).args,
    ).toStrictEqual([])
    expect(
      SonderrPtySelfCommand.command({
        ...proc,
        argv: ["C:/tmp/sonderr.exe", "b:\\~BUN\\root\\src\\index.js"],
      }).args,
    ).toStrictEqual([])
  })

  test("forwards source entrypoints", () => {
    const cmd = SonderrPtySelfCommand.command({
      argv: ["/tmp/bun", "/tmp/sonderr/src/index.ts"],
      execArgv: ["--conditions=browser", "--cwd", "packages/cli"],
      execPath: "/tmp/bun",
      cwd: "/tmp/sonderr",
    })
    expect(cmd).toStrictEqual({
      command: "/tmp/bun",
      args: ["--conditions=browser", "/tmp/sonderr/src/index.ts"],
      cwd: "/tmp/sonderr",
    })
    expect(SonderrPtySelfCommand.resolve({ command: "sonderr", cwd: "/tmp/project" }, cmd)).toStrictEqual({
      command: "/tmp/bun",
      args: ["--conditions=browser", "/tmp/sonderr/src/index.ts", "/tmp/project"],
      cwd: "/tmp/sonderr",
    })
  })
})
