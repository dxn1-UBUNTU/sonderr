import type { Argv } from "yargs"
import type { Auth } from "@/auth"
import * as Log from "@sonderr/core/util/log"
import { InstallationBuildKind, InstallationVersion } from "@sonderr/core/installation/version"
import { SonderrShutdown } from "@/sonderr/cli/shutdown"
import { createHelpCommand } from "@/sonderr/help-command"
import { hasLazyCommandSelection } from "@/sonderr/cli/lazy-commands"
import {
  CloudCommand,
  ConfigCLICommand,
  DaemonCommand,
  DevAliasCommand,
  DevSetupCommand,
  SonderrConsoleCommand,
  ProfileCommand,
  PtySmokeCommand,
  RemoteCommand,
  RollCallCommand,
  WorktreeCommand,
} from "@/sonderr/cli/lazy-sonderr-commands"

const log = Log.create({ service: "sonderr.cli" })

// All Sonderr-specific CLI customization lives here so the shared upstream entrypoint
// (src/index.ts) only needs a handful of thin call-sites behind sonderr_change markers.
// This keeps index.ts close to upstream and reduces merge conflicts on every sync.
//
// Startup cost note: this module is imported eagerly from src/index.ts, so its static
// import graph must stay light. Heavy dependencies (telemetry, gateway auth migration,
// AppRuntime, config, auth, session-export, JSON migration) are dynamically imported
// inside the function that needs them, following the deferral pattern upstream applied
// in sonderr#30453. The registered command modules must follow the same rule: a light
// top level, with implementation imports inside their handlers.
export namespace SonderrCli {
  let info = false
  let narrow = false

  export function workerTui(opts: { [key: string]: unknown }) {
    return !hasLazyCommandSelection() && opts.mini !== true && !opts.worktree
  }

  // Register only the Sonderr-specific commands. Upstream commands stay in index.ts's chain so
  // upstream merges that add or remove commands keep working without touching this file.
  export function register<T>(cli: Argv<T>): Argv<T> {
    cli
      .command(SonderrConsoleCommand)
      .command(CloudCommand)
      .command(RollCallCommand)
      .command(ProfileCommand)
      .command(RemoteCommand)
      .command(DaemonCommand)
      .command(ConfigCLICommand)
      .command(WorktreeCommand)
    if (process.env.SONDERR_PTY_SMOKE === "1") cli.command(PtySmokeCommand)
    if (InstallationBuildKind !== "release") cli.command(DevSetupCommand).command(DevAliasCommand)
    // Safe self-reference: `cli` is a typed parameter and yargs `.command()` returns the same
    // instance, so the help command can resolve the fully-built root at handler time. This also
    // sidesteps the self-referential type error the old inline registration hit in index.ts.
    cli.command(createHelpCommand(() => cli))
    return cli
  }

  export async function runner() {
    if (!process.argv.includes("__background-process-runner")) return false
    return (await import("@/sonderr/background-process/runner")).BackgroundProcessRunner.maybe()
  }

  // Runs from the upstream `.middleware`, before any command handler. Env tagging is additive so
  // it never has to modify upstream's own env assignments.
  export async function bootstrap(opts: { [key: string]: unknown }): Promise<void> {
    info = opts.help === true || opts.version === true
    if (info) return
    narrow = workerTui(opts)

    const { SonderrLog } = await import("@/sonderr/log")
    await SonderrLog.init()

    const gateway = await import("@sonderr/sonderr-gateway")
    if (!process.env[gateway.ENV_FEATURE])
      process.env[gateway.ENV_FEATURE] = process.argv.includes("serve") ? "unknown" : "cli"
    if (!process.env[gateway.ENV_VERSION]) process.env[gateway.ENV_VERSION] = InstallationVersion
    process.env.SONDERR = "1"

    // Must run before AppRuntime initializes the SQLite database, or the marker
    // exists before legacy JSON can be imported.
    const { JsonMigration } = await import("@/sonderr/storage/json-migration")
    await JsonMigration.bootstrap()

    const runtime = narrow ? await import("@/sonderr/cli/bootstrap-runtime") : undefined
    const app = narrow ? undefined : await import("@/effect/app-runtime")
    const cfg = runtime
      ? await runtime.SonderrCliBootstrapRuntime.getGlobal()
      : await app!.AppRuntime.runPromise((await import("@/config/config")).Config.Service.use((c) => c.getGlobal()))

    const { Global } = await import("@sonderr/core/global")
    const { Telemetry } = await import("@sonderr/sonderr-telemetry")
    await Telemetry.init({
      dataPath: Global.Path.data,
      version: InstallationVersion,
      enabled: cfg.experimental?.openTelemetry !== false,
    })

    const { migrateLegacySonderrAuth } = gateway
    const getAuth = async () => {
      if (runtime) return runtime.SonderrCliBootstrapRuntime.getAuth()
      const { Auth } = await import("@/auth")
      return app!.AppRuntime.runPromise(Auth.Service.use((s) => s.get("sonderr")))
    }
    const setAuth = async (auth: Auth.Info) => {
      if (runtime) return runtime.SonderrCliBootstrapRuntime.setAuth(auth)
      const { Auth } = await import("@/auth")
      return app!.AppRuntime.runPromise(Auth.Service.use((s) => s.set("sonderr", auth)))
    }

    // Migrate legacy Sonderr CLI auth (~/.sonderr/cli/config.json) into auth.json if present.
    await migrateLegacySonderrAuth(
      async () => (await getAuth()) !== undefined,
      setAuth,
    )

    const auth = await getAuth()
    if (auth) {
      const token = auth.type === "oauth" ? auth.access : auth.key
      const account = auth.type === "oauth" ? auth.accountId : undefined
      await Telemetry.updateIdentity(token, account)
    }

    Telemetry.trackCliStart()
    // Overlap the event upload with command execution so exit is not delayed by
    // a network round trip (#10242).
    Telemetry.flushInBackground()
  }

  // Runs from the `finally` block on every exit path.
  export async function shutdown(): Promise<void> {
    if (info) return
    const { Telemetry } = await import("@sonderr/sonderr-telemetry")
    const code = typeof process.exitCode === "number" ? process.exitCode : undefined
    Telemetry.trackCliExit(code)
    const { SessionExport } = await import("@/sonderr/session-export")
    try {
      await SessionExport.shutdown()
      // Bound telemetry shutdown so an unreachable endpoint (offline, firewall,
      // DNS adblock resolving the host to 0.0.0.0) cannot block process exit on
      // short-lived commands like `sonderr --help` / `sonderr --version` (#9788).
      try {
        await Telemetry.shutdown(2000)
      } catch (err) {
        log.warn("telemetry shutdown failed", { err })
      }
    } finally {
      await SonderrShutdown.run()
      if (narrow) {
        const { SonderrCliBootstrapRuntime } = await import("@/sonderr/cli/bootstrap-runtime")
        await SonderrCliBootstrapRuntime.dispose()
        return
      }
      const { InstanceRuntime } = await import("@/project/instance-runtime")
      await InstanceRuntime.disposeAllInstances() // safety net (no-op if already disposed)
    }
  }
}
