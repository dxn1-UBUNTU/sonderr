import yargs from "yargs"
import { hideBin } from "yargs/helpers"
// sonderr_change - upstream account console intentionally omitted; SonderrCli registers `sonderr console` for local settings
import { UI } from "./cli/ui"
import { TuiThreadCommand } from "./cli/cmd/tui" // sonderr_change - yargs requires the default command builder eagerly
import { InstallationVersion } from "@sonderr/core/installation/version"
import { FormatError } from "./cli/error"
import { EOL } from "os"
// sonderr_change - upstream web command intentionally omitted; Sonderr does not ship an embedded web UI
import { errorMessage } from "./util/error"
import { Heap } from "./cli/heap"
import { SonderrCli } from "@/sonderr/cli/setup" // sonderr_change
import * as Log from "@sonderr/core/util/log" // sonderr_change
import { ensureProcessMetadata } from "@sonderr/core/util/sonderr-process" // sonderr_change
// sonderr_change start - defer heavy command implementations until yargs selects them
import {
  AcpCommand,
  AgentCommand,
  AttachCommand,
  DbCommand,
  DebugCommand,
  ExportCommand,
  GenerateCommand,
  GithubCommand,
  ImportCommand,
  McpCommand,
  ModelsCommand,
  PluginCommand,
  PrCommand,
  ProvidersCommand,
  RunCommand,
  ServeCommand,
  SessionCommand,
  StatsCommand,
  UninstallCommand,
  UpgradeCommand,
  waitForLazyCommands,
} from "@/sonderr/cli/lazy-commands"
// sonderr_change end

const args = hideBin(process.argv)
const metadata = ensureProcessMetadata("main") // sonderr_change - correlate logs across the CLI and TUI worker

if (await SonderrCli.runner()) process.exit() // sonderr_change - run persistent process guardians before CLI bootstrap

function show(out: string) {
  const text = out.trimStart()
  if (!text.startsWith("sonderr ")) {
    process.stderr.write(UI.logo() + EOL + EOL)
    process.stderr.write(text + EOL)
    return
  }
  process.stderr.write(out)
}

let cli = yargs(args) // sonderr_change
  .parserConfiguration({ "populate--": true })
  .scriptName("sonderr") // sonderr_change
  .wrap(100)
  .help("help", "show help")
  .alias("help", "h")
  .version("version", "show version number", InstallationVersion)
  .alias("version", "v")
  .option("print-logs", {
    describe: "print logs to stderr",
    type: "boolean",
  })
  .option("log-level", {
    describe: "log level",
    type: "string",
    choices: ["DEBUG", "INFO", "WARN", "ERROR"],
  })
  .option("pure", {
    describe: "run without external plugins",
    type: "boolean",
  })
  .middleware(async (opts) => {
    if (opts.printLogs) process.env.SONDERR_PRINT_LOGS = "1"
    if (opts.logLevel) process.env.SONDERR_LOG_LEVEL = opts.logLevel
    if (opts.pure) {
      process.env.SONDERR_PURE = "1"
    }

    Heap.start()

    process.env.AGENT = "1"
    process.env.SONDERR = "1"
    process.env.SONDERR_PID = String(process.pid)
    await SonderrCli.bootstrap(opts) // sonderr_change - env tagging, telemetry init, legacy JSON-to-SQLite migration, and auth migration
    // sonderr_change start - retain Sonderr process/run correlation metadata in startup logs
    Log.Default.info("sonderr", {
      version: InstallationVersion,
      command: args[0] ?? "", // avoid persisting prompts, passwords, tokens, headers, or environment values
      process_role: metadata.processRole,
      run_id: metadata.runID,
    })
    // sonderr_change end
  })
  .usage("")
  .completion("completion", "generate shell completion script")
  .command(AcpCommand)
  .command(McpCommand)
  .command(TuiThreadCommand)
  .command(AttachCommand)
  .command(RunCommand)
  .command(GenerateCommand)
  .command(DebugCommand)
  // sonderr_change - upstream account console intentionally not registered; SonderrConsole is added by SonderrCli.register
  .command(ProvidersCommand)
  .command(AgentCommand)
  .command(UpgradeCommand)
  .command(UninstallCommand)
  .command(ServeCommand)
  // sonderr_change - upstream web command intentionally omitted
  .command(ModelsCommand)
  .command(StatsCommand)
  .command(ExportCommand)
  .command(ImportCommand)
  .command(GithubCommand)
  .command(PrCommand)
  .command(SessionCommand)
  .command(PluginCommand)
  .command(DbCommand)

// sonderr_change start - register Sonderr-specific commands after the upstream chain
cli = SonderrCli.register(cli)
await waitForLazyCommands() // sonderr_change - yargs completion invokes builders synchronously
cli = cli
  // sonderr_change end
  .fail((msg, err) => {
    if (
      msg?.startsWith("Unknown argument") ||
      msg?.startsWith("Not enough non-option arguments") ||
      msg?.startsWith("Invalid values:")
    ) {
      if (err) throw err
      cli.showHelp(show)
    }
    if (err) throw err
    process.exit(1)
  })
  .strict()

try {
  if (args.includes("-h") || args.includes("--help")) {
    await cli.parse(args, (err: Error | undefined, _argv: unknown, out: string) => {
      if (err) throw err
      if (!out) return
      show(out)
    })
  } else {
    await cli.parse()
  }
} catch (e) {
  const formatted = FormatError(e)
  if (formatted) UI.error(formatted)
  if (formatted === undefined) {
    UI.error("Unexpected error" + EOL)
    process.stderr.write(errorMessage(e) + EOL)
  }
  process.exitCode = 1
} finally {
  await SonderrCli.shutdown() // sonderr_change - telemetry/session-export shutdown + instance disposal

  // Some subprocesses don't react properly to SIGTERM and similar signals.
  // Most notably, some docker-container-based MCP servers don't handle such signals unless
  // run using `docker run --init`.
  // Explicitly exit to avoid any hanging subprocesses.
  process.exit()
}
