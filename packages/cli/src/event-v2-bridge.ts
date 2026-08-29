// Sonderr publish boundary for core events. Attach routed instance location
// so direct EventV2 consumers can isolate directory/workspace streams.
import { LayerNode } from "@sonderr/core/effect/layer-node"
import { InstanceRef, WorkspaceRef } from "@/effect/instance-ref"
import { GlobalBus } from "@/bus/global"
import { EventManifest } from "@/event-manifest" // sonderr_change
import * as EventWire from "@/sonderr/event-wire" // sonderr_change
import { EventV2 } from "@sonderr/core/event"
import { Location } from "@sonderr/core/location"
import { Project } from "@sonderr/core/project"
import { AbsolutePath } from "@sonderr/core/schema"
import { Context, Effect, Layer } from "effect"

export class Service extends Context.Service<Service, EventV2.Interface>()("@sonderr/EventV2Bridge") {}

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const events = yield* EventV2.Service

    const publish: EventV2.Interface["publish"] = (definition, data, options) =>
      Effect.gen(function* () {
        if (options?.location) return yield* events.publish(definition, data, options)
        const ctx = yield* InstanceRef
        if (!ctx) return yield* events.publish(definition, data, options)
        const workspaceID = yield* WorkspaceRef
        return yield* events.publish(definition, data, {
          ...options,
          location: new Location.Info({
            directory: AbsolutePath.make(ctx.directory),
            ...(workspaceID ? { workspaceID } : {}),
            project: { id: Project.ID.make(ctx.project.id), directory: AbsolutePath.make(ctx.worktree) },
          }),
        })
      })

    const unsubscribe = yield* events.listen((event) =>
      Effect.gen(function* () {
        const ctx = yield* InstanceRef
        const workspaceID = (yield* WorkspaceRef) ?? event.location?.workspaceID
        // sonderr_change start - legacy bus and SSE consumers require the schema's encoded representation
        const definition = EventManifest.Latest.get(event.type) // sonderr_change
        const data = definition ? EventWire.encode(definition.data, event.data) : event.data
        // sonderr_change end
        GlobalBus.emit("event", {
          directory: event.location?.directory ?? ctx?.directory ?? "global", // sonderr_change - instance-less events are tagged "global" on the wire
          project: ctx?.project.id,
          workspace: workspaceID,
          payload: { id: event.id, type: event.type, properties: data }, // sonderr_change - encoded
        })
        if (event.durable === undefined) return
        GlobalBus.emit("event", {
          directory: event.location?.directory ?? ctx?.directory ?? "global", // sonderr_change - instance-less events are tagged "global" on the wire
          project: ctx?.project.id,
          workspace: workspaceID,
          payload: {
            type: "sync",
            syncEvent: {
              id: event.id,
              type: EventV2.versionedType(event.type, event.durable.version),
              seq: event.durable.seq,
              aggregateID: event.durable.aggregateID,
              data, // sonderr_change - encoded
            },
          },
        })
      }),
    )
    yield* Effect.addFinalizer(() => unsubscribe)

    return Service.of({ ...events, publish })
  }),
)

// sonderr_change - preserve legacy layer composition while EventV2 uses nodes
export const defaultLayer = layer.pipe(Layer.provide(LayerNode.compile(EventV2.node)))

export const node = LayerNode.make({ service: Service, layer: layer, deps: [EventV2.node] })

export * as EventV2Bridge from "./event-v2-bridge"
