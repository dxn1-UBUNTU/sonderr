import { Location } from "@sonderr/core/location"
import { PluginV2 } from "@sonderr/core/plugin"
import { Reference } from "@sonderr/core/reference"
import { Context, Effect, Layer } from "effect"

export class ReferenceReconciler extends Context.Service<
  ReferenceReconciler,
  Effect.Effect<void, never, Location.Service | PluginV2.Service | Reference.Service>
>()("@sonderr/ReferenceReconciler") {}

export const noop = Layer.succeed(ReferenceReconciler, Effect.void)

export function reconcile<A, E, R>(effect: Effect.Effect<A, E, R>) {
  return Effect.flatMap(ReferenceReconciler, (reconciler) => Effect.andThen(reconciler, effect))
}
