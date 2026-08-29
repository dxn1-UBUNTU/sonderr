import { describe, test, expect } from "bun:test"
import path from "path"
import yargs from "yargs"
import { generateHelp, generateCommandTable } from "../../src/sonderr/help"
import { AcpCommand } from "../../src/cli/cmd/acp"
import { McpCommand } from "../../src/cli/cmd/mcp"
import { RunCommand } from "../../src/cli/cmd/run"
import { GenerateCommand } from "../../src/cli/cmd/generate"
import { DebugCommand } from "../../src/cli/cmd/debug"
import { ProvidersCommand } from "../../src/cli/cmd/providers" // sonderr_change — upstream renamed auth → providers
import { AgentCommand } from "../../src/cli/cmd/agent"
import { UpgradeCommand } from "../../src/cli/cmd/upgrade"
import { UninstallCommand } from "../../src/cli/cmd/uninstall"
import { ServeCommand } from "../../src/cli/cmd/serve"
import { ModelsCommand } from "../../src/cli/cmd/models"
import { StatsCommand } from "../../src/cli/cmd/stats"
import { ExportCommand } from "../../src/cli/cmd/export"
import { ImportCommand } from "../../src/cli/cmd/import"
import { PrCommand } from "../../src/cli/cmd/pr"
import { SessionCommand } from "../../src/cli/cmd/session"
import { RemoteCommand } from "../../src/cli/cmd/remote"
import { ConfigCommand as ConfigCLICommand } from "../../src/cli/cmd/config"
import { PluginCommand } from "../../src/cli/cmd/plug"
import { DbCommand } from "../../src/cli/cmd/db"
import { HelpCommand } from "../../src/sonderr/help-command"
import { ProfileCommand } from "../../src/sonderr/cli/cmd/profile"
import { DaemonCommand } from "../../src/sonderr/cli/cmd/daemon"
import { SonderrConsoleCommand } from "../../src/sonderr/cli/cmd/console"
import { CloudCommand } from "../../src/sonderr/cli/cmd/cloud"

// Stand-in for TuiThreadCommand — the real one imports @opentui/solid which
// doesn't resolve in the test environment. Only command/describe matter here.
const TuiStub = {
  command: "$0 [project]",
  describe: "start sonderr tui",
  handler() {},
}

// Stand-in for AttachCommand — same reason as TuiStub above.
const AttachStub = {
  command: "attach <url>",
  describe: "attach to a running sonderr server",
  handler() {},
}

// Synthetic entry for the yargs built-in .completion() command
const CompletionStub = {
  command: "completion",
  describe: "generate shell completion script",
  handler() {},
}

const commands = [
  AcpCommand,
  McpCommand,
  TuiStub,
  AttachStub,
  RunCommand,
  GenerateCommand,
  DebugCommand,
  ProvidersCommand,
  AgentCommand,
  UpgradeCommand,
  UninstallCommand,
  ServeCommand,
  ModelsCommand,
  StatsCommand,
  ExportCommand,
  ImportCommand,
  PrCommand,
  SessionCommand,
  RemoteCommand,
  DbCommand,
  ConfigCLICommand,
  PluginCommand,
  ProfileCommand,
  DaemonCommand,
  SonderrConsoleCommand,
  CloudCommand,
  HelpCommand,
  CompletionStub,
] as any[]

describe("sonderr help --all (markdown)", () => {
  test("contains ## heading for each known top-level command", async () => {
    const output = await generateHelp({ all: true, format: "md", commands })
    for (const cmd of ["run", "auth", "debug", "mcp", "session", "agent", "profile"]) {
      expect(output).toContain(`## sonderr ${cmd}`)
    }
  })

  test("contains headings for nested subcommands", async () => {
    const output = await generateHelp({ all: true, format: "md", commands })
    expect(output).toContain("sonderr auth login")
    expect(output).toContain("sonderr auth logout")
    expect(output).toContain("sonderr debug config")
  })
})

describe("sonderr help --all (text)", () => {
  test("does NOT contain Markdown ## headings or triple-backtick fences", async () => {
    const output = await generateHelp({ all: true, format: "text", commands })
    expect(output).not.toMatch(/^##\s/m)
    expect(output).not.toContain("```")
  })

  test("still contains each command name", async () => {
    const output = await generateHelp({ all: true, format: "text", commands })
    for (const cmd of ["run", "auth", "debug", "mcp", "session", "agent", "profile"]) {
      expect(output).toContain(`sonderr ${cmd}`)
    }
  })
})

describe("sonderr help <command>", () => {
  test("sonderr help auth contains auth subcommand headings", async () => {
    const output = await generateHelp({ command: "auth", format: "md", commands })
    expect(output).toContain("sonderr auth login")
    expect(output).toContain("sonderr auth logout")
    expect(output).toContain("sonderr auth list")
  })

  test("sonderr help auth does NOT contain run or debug headings", async () => {
    const output = await generateHelp({ command: "auth", format: "md", commands })
    expect(output).not.toContain("## sonderr run")
    expect(output).not.toContain("## sonderr debug")
  })

  test("documents pr subcommands", async () => {
    const output = await generateHelp({ command: "pr", format: "md", commands })
    expect(output).toContain("sonderr pr checkout")
    expect(output).toContain("sonderr pr link")
    expect(output).toContain("sonderr pr unlink")
    expect(output).toContain("sonderr pr status")
  })

  test("documents console stop and foreground mode", async () => {
    const output = await generateHelp({ command: "console", format: "md", commands })
    expect(output).toContain("sonderr console stop")
    expect(output).toContain("--foreground")
    expect(output).toContain("-f")
  })

  test("documents daemon foreground mode", async () => {
    const output = await generateHelp({ command: "daemon", format: "md", commands })
    expect(output).toContain("sonderr daemon start")
    expect(output).toContain("--foreground")
    expect(output).toContain("-f")
  })
})

describe("sonderr cloud help", () => {
  async function parser() {
    const cli = yargs([])
      .scriptName("sonderr cloud")
      .exitProcess(false)
      .help()
      .fail((msg, err) => {
        throw err ?? new Error(msg)
      })
    if (typeof CloudCommand.builder !== "function") throw new Error("cloud command builder is missing")
    return await CloudCommand.builder(cli)
  }

  test("requires a subcommand and exposes only the public Cloud Agent operations", async () => {
    const bare = await parser()
    await expect(Promise.resolve().then(() => bare.parseAsync([]))).rejects.toThrow()

    const help = await (await parser()).getHelp()
    const names = [...help.matchAll(/^\s*sonderr cloud ([a-z][a-z-]*)\b/gm)].map((match) => match[1])
    expect([...new Set(names)].sort()).toEqual(["result", "send", "start", "status"])
  })
})

describe("edge cases", () => {
  test("output contains no ANSI escape sequences", async () => {
    const output = await generateHelp({ all: true, format: "md", commands })
    expect(/\x1b\[/.test(output)).toBe(false)
  })

  test("sonderr help nonexistent throws unknown command error", async () => {
    await expect(generateHelp({ command: "nonexistent", commands })).rejects.toThrow("unknown command")
  })
})

describe("generateCommandTable", () => {
  test("returns a string containing a markdown table header", async () => {
    const output = await generateCommandTable({ commands })
    expect(output).toContain("| Command | Description |")
  })

  test("contains rows for known commands", async () => {
    const output = await generateCommandTable({ commands })
    for (const name of ["run", "auth", "debug", "mcp"]) {
      expect(output).toContain(`sonderr ${name}`)
    }
  })

  test("default command appears as sonderr [project], not $0", async () => {
    const output = await generateCommandTable({ commands })
    expect(output).toContain("`sonderr [project]`")
    expect(output).not.toContain("$0")
  })

  test("contains no ANSI escape sequences", async () => {
    const output = await generateCommandTable({ commands })
    expect(/\x1b\[/.test(output)).toBe(false)
  })

  test("skips commands with no describe", async () => {
    const output = await generateCommandTable({ commands })
    expect(output).not.toContain("`sonderr generate`")
  })

  test("contains sonderr completion row", async () => {
    const output = await generateCommandTable({ commands })
    expect(output).toContain("`sonderr completion`")
  })

  test("contains sonderr help row", async () => {
    const output = await generateCommandTable({ commands })
    expect(output).toContain("`sonderr help")
  })
})

describe("Sonderr CLI customizations are wired into index.ts", () => {
  const file = (rel: string) => Bun.file(path.resolve(import.meta.dir, rel)).text()
  const INDEX = "../../src/index.ts"
  const SETUP = "../../src/sonderr/cli/setup.ts"
  const BARREL = "../../src/sonderr/commands.ts"

  test("CLI is branded `sonderr`, not `sonderr`", async () => {
    const index = await file(INDEX)
    expect(index).toContain('.scriptName("sonderr")')
    expect(index).not.toContain('.scriptName("sonderr")')
  })

  test("index.ts invokes the SonderrCli integration points", async () => {
    // These thin call-sites are the only wiring between upstream index.ts and the Sonderr
    // customizations in setup.ts. If a future upstream merge drops them, every Sonderr command
    // and the telemetry/lifecycle hooks silently disappear, exactly the regression this guards.
    const index = await file(INDEX)
    expect(index).toContain("SonderrCli.register(")
    expect(index).toContain("SonderrCli.bootstrap(")
    expect(index).toContain("SonderrCli.shutdown(")
  })

  test("registers the local Sonderr Console instead of the upstream account console", async () => {
    const index = await file(INDEX)
    const setup = await file(SETUP)
    const barrel = await file(BARREL)
    expect(setup).toContain("SonderrConsoleCommand")
    expect(index).not.toContain(".command(ConsoleCommand)")
    expect(barrel).not.toContain('from "../cli/cmd/account"')
  })

  test("every .command() in index.ts has an entry in the commands array", async () => {
    const index = await file(INDEX)
    const barrel = await file(BARREL)

    // Match uncommented .command(XxxCommand) calls in index.ts
    const registered = [...index.matchAll(/^\s*\.command\((\w+)\)/gm)].map((m) => m[1]!)
    expect(registered.length).toBeGreaterThan(0)

    // Extract identifiers inside the exported commands = [...] array, not just anywhere in the file
    const arrayMatch = barrel.match(/export const commands\s*=\s*\[([\s\S]*?)\]/)
    expect(arrayMatch).toBeTruthy()
    const entries = [...arrayMatch![1]!.matchAll(/\b(\w+Command)\b/g)].map((m) => m[1]!)

    const missing = registered.filter((name) => !entries.includes(name))
    expect(missing).toEqual([])
  })

  test("every barrel command is registered in index.ts or setup.ts", async () => {
    // Reverse direction of the test above: every source-of-truth command must actually be
    // runnable. The merge dropped `daemon`/`profile`/`remote`/`config` from index.ts while the
    // barrel still listed them, this catches that.
    const index = await file(INDEX)
    const setup = await file(SETUP)
    const barrel = await file(BARREL)

    const registered = new Set(
      [...index.matchAll(/\.command\((\w+)\)/g), ...setup.matchAll(/\.command\((\w+)\)/g)].map((m) => m[1]!),
    )

    const arrayMatch = barrel.match(/export const commands\s*=\s*\[([\s\S]*?)\]/)
    expect(arrayMatch).toBeTruthy()
    // Strip comments first, the array body contains a comment mentioning `AuthCommand`.
    const body = arrayMatch![1]!.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "")
    const entries = [...body.matchAll(/\b(\w+Command)\b/g)].map((m) => m[1]!)

    // Not registered as a bare `.command(Ident)`:
    //  CompletionCommand - provided by yargs `.completion(...)`
    //  HelpCommand       - registered via createHelpCommand(() => cli)
    //  (DevSetup/DevAlias enter the array via `...dev`, so they aren't scraped here)
    const except = new Set(["CompletionCommand", "HelpCommand"])
    const missing = entries.filter((name) => !except.has(name) && !registered.has(name))
    expect(missing).toEqual([])
  })
})
