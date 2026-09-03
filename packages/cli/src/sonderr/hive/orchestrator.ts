import { Context, Effect, Layer } from "effect"
import { LayerNode } from "@sonderr/core/effect/layer-node"
import { SonderrHiveBus } from "./bus"
import type { HiveID, HiveConfig, HiveMemo } from "./model"

export interface Interface {
  readonly create: (sessionID: string) => Effect.Effect<HiveID>
  readonly tagChild: (childSessionID: string, hiveID: HiveID) => Effect.Effect<void>
  readonly hiveForSession: (sessionID: string) => Effect.Effect<HiveID | undefined>
  readonly broadcast: (
    hiveID: HiveID,
    channel: string,
    from: string,
    role: HiveMemo["role"],
    text: string,
  ) => Effect.Effect<HiveMemo>
  readonly recall: (
    hiveID: HiveID,
    input: { channel?: string; since?: number; limit?: number },
  ) => Effect.Effect<HiveMemo[]>
  readonly spawn: (hiveID: HiveID, input: { agent: string; prompt: string }) => Effect.Effect<string>
  readonly runTurn: (hiveID: HiveID, prompt: string, parts: unknown) => Effect.Effect<string>
  readonly cancel: (hiveID: HiveID) => Effect.Effect<void>
}

export class Service extends Context.Service<Service, Interface>()("@sonderr/HiveOrchestrator") {}

function stub<A>(msg: string): Effect.Effect<A> {
  return Effect.die(new Error(msg))
}

export const node = LayerNode.make({
  service: Service,
  layer: Layer.effect(
    Service,
    Effect.sync(() => {
      const buses = new Map<string, SonderrHiveBus>()
      const sessions = new Map<string, HiveID>()

      const ensure = (hiveID: HiveID): SonderrHiveBus => {
        const hit = buses.get(hiveID)
        if (hit) return hit
        const bus = new SonderrHiveBus(hiveID)
        buses.set(hiveID, bus)
        return bus
      }

      const create = (sessionID: string): Effect.Effect<HiveID> =>
        Effect.sync(() => {
          const hiveID = `hive_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}` as HiveID
          ensure(hiveID)
          sessions.set(sessionID, hiveID)
          return hiveID
        })

      const tagChild = (childSessionID: string, hiveID: HiveID): Effect.Effect<void> =>
        Effect.sync(() => {
          sessions.set(childSessionID, hiveID)
        })

      const hiveForSession = (sessionID: string): Effect.Effect<HiveID | undefined> =>
        Effect.sync(() => sessions.get(sessionID))

      const broadcast = (
        hiveID: HiveID,
        channel: string,
        from: string,
        role: HiveMemo["role"],
        text: string,
      ): Effect.Effect<HiveMemo> => Effect.sync(() => ensure(hiveID).publish({ channel, from, role, text }))

      const recall = (
        hiveID: HiveID,
        input: { channel?: string; since?: number; limit?: number },
      ): Effect.Effect<HiveMemo[]> => Effect.sync(() => ensure(hiveID).recall(input))

      const cancel = (hiveID: HiveID): Effect.Effect<void> =>
        Effect.sync(() => {
          buses.get(hiveID)?.close()
          buses.delete(hiveID)
          for (const [sessionID, hid] of sessions) {
            if (hid === hiveID) sessions.delete(sessionID)
          }
        })

      const spawn = (): Effect.Effect<string> => stub("hive spawn not wired")
      const runTurn = (): Effect.Effect<string> => stub("hive runTurn not wired")

      return Service.of({ create, tagChild, hiveForSession, broadcast, recall, spawn, runTurn, cancel })
    }),
  ),
  deps: [],
})
