import path from "path"
import { Context, Effect, Layer } from "effect"
import { LayerNode } from "@sonderr/core/effect/layer-node"
import { FSUtil } from "@sonderr/core/fs-util"
import { Global } from "@sonderr/core/global"
import * as Log from "@sonderr/core/util/log"
import { Auth } from "@/auth"
import type { Info as AuthInfo } from "@/auth"
import { isRecord } from "@/util/record"

export interface Interface {
  readonly next: (providerID: string) => Effect.Effect<AuthInfo | undefined>
  readonly list: () => Effect.Effect<Record<string, AuthInfo[]>>
  readonly add: (providerID: string, info: AuthInfo) => Effect.Effect<void>
  readonly remove: (providerID: string, index: number) => Effect.Effect<void>
}

export class Service extends Context.Service<Service, Interface>()("@sonderr/HiveKeyPool") {}

export const node = LayerNode.make({
  service: Service,
  layer: Layer.effect(
    Service,
    Effect.gen(function* () {
      const log = Log.create({ service: "hive.key-pool" })
      const fs = yield* FSUtil.Service
      const auth = yield* Auth.Service
      const global = yield* Global.Service
      const counters = new Map<string, number>()

      const file = path.join(global.data, "hive-keys.json")

      const read = (): Effect.Effect<Record<string, AuthInfo[]>> =>
        fs
          .readJson(file)
          .pipe(
            Effect.catch(() => Effect.succeed({} as Record<string, unknown>)),
            Effect.map((data) => (isRecord(data) ? (data as Record<string, AuthInfo[]>) : ({} as Record<string, AuthInfo[]>))),
          )

      const write = (data: Record<string, AuthInfo[]>): Effect.Effect<void> =>
        Effect.gen(function* () {
          const dir = path.dirname(file)
          yield* fs.ensureDir(dir).pipe(Effect.catch(() => Effect.void))
          yield* fs.writeJson(file, data, 0o600).pipe(
            Effect.catch((err) => Effect.sync(() => log.error("failed to write hive-keys", { err }))),
          )
        })

      const add = (providerID: string, info: AuthInfo): Effect.Effect<void> =>
        Effect.gen(function* () {
          const data = yield* read()
          const arr = data[providerID] ? [...data[providerID], info] : [info]
          data[providerID] = arr
          yield* write(data)
        })

      const remove = (providerID: string, index: number): Effect.Effect<void> =>
        Effect.gen(function* () {
          const data = yield* read()
          const arr = data[providerID]
          if (!arr) return
          const next = [...arr.slice(0, index), ...arr.slice(index + 1)]
          if (next.length === 0) delete data[providerID]
          else data[providerID] = next
          yield* write(data)
        })

      const list = (): Effect.Effect<Record<string, AuthInfo[]>> => read()

      const next = (providerID: string): Effect.Effect<AuthInfo | undefined> =>
        Effect.gen(function* () {
          const data = yield* read()
          const arr = data[providerID]
          if (!arr || arr.length === 0) {
            return yield* auth.get(providerID).pipe(
              Effect.catch((err) => Effect.sync(() => {
                log.error("primary auth lookup failed", { providerID, err })
                return undefined
              })),
            )
          }
          const i = counters.get(providerID) ?? 0
          counters.set(providerID, (i + 1) % arr.length)
          return arr[i]
        })

      return Service.of({ next, list, add, remove })
    }),
  ),
  deps: [FSUtil.node, Auth.node, Global.node],
})
