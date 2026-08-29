import { Effect } from "effect"
import { effectCmd } from "../effect-cmd"
import { withNetworkOptions, resolveNetworkOptions } from "../network"
import { Flag } from "@sonderr/core/flag/flag"

export const ServeCommand = effectCmd({
  command: "serve",
  builder: (yargs) => withNetworkOptions(yargs),
  describe: "starts a headless sonderr server",
  // Server loads instances per-request via x-sonderr-directory header — no
  // need for an ambient project InstanceContext at startup.
  instance: false, // sonderr_change
  handler: Effect.fn("Cli.serve")(function* (args) {
    const { Server } = yield* Effect.promise(() => import("../../server/server"))
    if (!Flag.SONDERR_SERVER_PASSWORD) {
      console.log("Warning: SONDERR_SERVER_PASSWORD is not set; server is unsecured.")
    }
    const opts = yield* resolveNetworkOptions(args)
    const server = yield* Effect.promise(() => Server.listen(opts))

    // sonderr_change start
    const urls = server.urls

    console.log(`sonderr server listening on ${urls.bind}`)
    if (urls.local !== urls.bind) console.log(`  Local:   ${urls.local}`)
    if (urls.network) console.log(`  Network: ${urls.network}`)
    // sonderr_change end

    // sonderr_change start - graceful signal shutdown
    // yield* Effect.never
    const { InstanceRuntime } = yield* Effect.promise(() => import("../../project/instance-runtime"))
    const { startParentWatchdog } = yield* Effect.promise(() => import("../../sonderr/parent-watchdog"))
    const { SonderrSessions } = yield* Effect.promise(() => import("@/sonderr-sessions/sonderr-sessions"))
    yield* Effect.promise(
      () =>
        new Promise<void>((resolve) => {
          // Exit if the editor client that spawned us is hard-killed (no signal reaches us).
          const stopWatchdog = startParentWatchdog(() => process.kill(process.pid, "SIGTERM"))
          const shutdown = async () => {
            stopWatchdog()
            try {
              await SonderrSessions.drainIngestForShutdown() // sonderr_change
              await InstanceRuntime.disposeAllInstances()
              await server.stop(true)
            } finally {
              resolve()
            }
          }
          process.once("SIGTERM", shutdown)
          process.once("SIGINT", shutdown)
          process.once("SIGHUP", shutdown)
        }),
    )
    // sonderr_change end
  }),
})
