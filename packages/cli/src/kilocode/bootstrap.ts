import { Cause, Context, Effect, Layer } from "effect"
import { EffectBridge } from "@/effect/bridge"
import { SonderrSessions } from "@/sonderr-sessions/sonderr-sessions"
import * as Log from "@sonderr/core/util/log"
import { Global } from "@sonderr/core/global"
import { InstallationVersion } from "@sonderr/core/installation/version"
import path from "node:path"
import { Bus } from "@/bus"
import { Provider } from "@/provider/provider"
import { Session } from "@/session/session"
import { SessionSummary } from "@/session/summary"
import { SessionExport } from "@/sonderr/session-export"
import { createWorkspaceProvider } from "@/sonderr/session-export/workspace-provider"
import { Instance } from "@/sonderr/instance"
import { Identity } from "@sonderr/sonderr-telemetry"
import { MemoryLifecycle } from "@/sonderr/memory/turn"
import { MemoryService } from "@sonderr/sonderr-memory/effect/service"
import { MemoryEvents } from "@/sonderr/memory/events"
import { installMemoryRuntime } from "@/sonderr/memory/runtime"
import { SonderrToolRegistry } from "@/sonderr/tool/registry"
import { LayerNode } from "@sonderr/core/effect/layer-node"
import { SonderrWatcher } from "@/sonderr/watcher"
import { AppNodeBuilder } from "@sonderr/core/effect/app-node-builder" // sonderr_change

const log = Log.create({ service: "sonderr-bootstrap" })

export namespace SonderrBootstrap {
  export interface Interface {
    readonly init: () => Effect.Effect<void, unknown>
  }

  export class Service extends Context.Service<Service, Interface>()("@sonderr/Bootstrap") {}

  export const layer = Layer.effect(
    Service,
    Effect.gen(function* () {
      // Bind the package memory effect layer to sonderr (paths, instance binder, logger, event sink).
      installMemoryRuntime()
      const sonderr = yield* SonderrSessions.Service
      const bus = yield* Bus.Service
      const sessions = yield* Session.Service
      const summary = yield* SessionSummary.Service
      const provider = yield* Provider.Service
      const memory = yield* MemoryService.Service
      const watcher = yield* SonderrWatcher.Service

      const init = Effect.fn("SonderrBootstrap.init")(function* () {
        yield* watcher.init()
        yield* sonderr.init()
        yield* MemoryLifecycle.subscribe({ bus, sessions, summary, provider, memory })
        // Invalidate enabled cache on every memory state mutation (properties.directory holds the memory root).
        yield* bus.subscribeCallback(MemoryEvents.Status, (evt) =>
          SonderrToolRegistry.invalidateMemoryEnabled(evt.properties.directory),
        )
        yield* bus.subscribeCallback(MemoryEvents.Updated, (evt) =>
          SonderrToolRegistry.invalidateMemoryEnabled(evt.properties.directory),
        )
        // Session export bootstrap.
        yield* Effect.gen(function* () {
          if (!SessionExport.enabled) return
          const anon = yield* EffectBridge.fromPromise(() =>
            Identity.getMachineId().catch((err) => {
              log.warn("session export identity failed", { err })
              return undefined
            }),
          )
          SessionExport.init({
            agentVersion: InstallationVersion,
            anonId: anon,
            dbPath: path.join(Global.Path.data, "session-export.db"),
            workspaceKey: Instance.directory,
            subscribeAll: (cb) => Bus.subscribeAll(cb),
            snapshotProvider: createWorkspaceProvider({
              root: Instance.directory,
              statePath: path.join(Global.Path.data, "session-export-workspace.json"),
            }),
          })
        }).pipe(
          Effect.catchCause((cause) =>
            Effect.sync(() => log.warn("session export bootstrap failed", { err: Cause.squash(cause) })),
          ),
        )
        if (process.env["SONDERR_PLATFORM"] !== "vscode") {
          yield* EffectBridge.fromPromise(() =>
            import("@/sonderr/indexing").then((mod) => mod.SonderrIndexing.init()),
          ).pipe(
            Effect.catchCause((cause) =>
              Effect.sync(() => log.warn("indexing bootstrap failed", { err: Cause.squash(cause) })),
            ),
            Effect.forkDetach,
          )
        }
      })

      return Service.of({ init })
    }),
  )

  export const defaultLayer = layer.pipe(
    Layer.provide([
      SonderrSessions.defaultLayer,
      Session.defaultLayer,
      AppNodeBuilder.build(SessionSummary.node),
      AppNodeBuilder.build(Provider.node),
      MemoryService.layer,
      Bus.defaultLayer,
      SonderrWatcher.defaultLayer,
    ]),
  )

  const memory = LayerNode.make({ service: MemoryService.Service, layer: MemoryService.layer, deps: [] })
  const watcher = LayerNode.make({ service: SonderrWatcher.Service, layer: SonderrWatcher.defaultLayer, deps: [] })
  export const node = LayerNode.suspend(() =>
    LayerNode.make({
      service: Service,
      layer,
      deps: [SonderrSessions.node, Session.node, SessionSummary.node, Provider.node, memory, Bus.node, watcher],
    }),
  )
}
