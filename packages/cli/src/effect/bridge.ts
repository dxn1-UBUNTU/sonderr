import { Context, Effect, Exit, Fiber } from "effect"
import { WorkspaceContext } from "@/control-plane/workspace-context"
import type { WorkspaceV2 } from "@sonderr/core/workspace"
import { InstanceRef, WorkspaceRef } from "./instance-ref"
import { attachWith } from "./run-service"
import { Instance, type InstanceContext } from "@/sonderr/instance" // sonderr_change

export interface Shape {
  readonly promise: <A, E, R>(effect: Effect.Effect<A, E, R>) => Promise<A>
  readonly fork: <A, E, R>(effect: Effect.Effect<A, E, R>) => Fiber.Fiber<A, E>
  readonly run: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E>
  readonly bind: <Args extends readonly unknown[], Result>(fn: (...args: Args) => Result) => (...args: Args) => Result
}

// sonderr_change start - preserve legacy Sonderr contexts across Promise callbacks
function restore<R>(instance: InstanceContext | undefined, workspace: WorkspaceV2.ID | undefined, fn: () => R): R {
  if (instance && workspace !== undefined) {
    return WorkspaceContext.restore(workspace, () => Instance.restore(instance, fn))
  }
  if (instance) return Instance.restore(instance, fn)
  if (workspace !== undefined) return WorkspaceContext.restore(workspace, fn)
  return fn()
}
// sonderr_change end

function captureSync() {
  const fiber = Fiber.getCurrent()
  const instance = fiber ? Context.getReferenceUnsafe(fiber.context, InstanceRef) : undefined
  const workspace =
    (fiber ? Context.getReferenceUnsafe(fiber.context, WorkspaceRef) : undefined) ?? WorkspaceContext.workspaceID
  return { instance, workspace }
}

export const bind = <Args extends readonly unknown[], Result>(fn: (...args: Args) => Result) => {
  const captured = captureSync()
  return (...args: Args) =>
    // sonderr_change start
    restore(captured.instance, captured.workspace, () =>
      Effect.runSync(
        attachWith(
          Effect.sync(() => fn(...args)),
          captured,
        ),
      ),
    )
  // sonderr_change end
}

/**
 * Bridge from Effect into a Promise-returning JS callback while preserving
 * legacy AsyncLocalStorage contexts for callback code that still reads them. // sonderr_change
 *
 * Mirrors `Effect.promise` but restores Sonderr compatibility contexts first. // sonderr_change
 */
export const fromPromise = <T>(fn: () => Promise<T> | T): Effect.Effect<T> =>
  Effect.gen(function* () {
    // sonderr_change start
    const captured = captureSync()
    const instance = (yield* InstanceRef) ?? captured.instance
    const workspace = (yield* WorkspaceRef) ?? captured.workspace
    return yield* Effect.promise(() => Promise.resolve(restore(instance, workspace, fn)))
    // sonderr_change end
  })

export function make(): Effect.Effect<Shape> {
  return Effect.gen(function* () {
    const ctx = yield* Effect.context()
    const captured = captureSync()
    const instance = (yield* InstanceRef) ?? captured.instance
    const workspace = (yield* WorkspaceRef) ?? captured.workspace
    const wrap = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
      attachWith(effect.pipe(Effect.provide(ctx)) as Effect.Effect<A, E, never>, { instance, workspace })

    return {
      promise: <A, E, R>(effect: Effect.Effect<A, E, R>) =>
        restore(instance, workspace, () => Effect.runPromise(wrap(effect))), // sonderr_change
      fork: <A, E, R>(effect: Effect.Effect<A, E, R>) =>
        restore(instance, workspace, () => Effect.runFork(wrap(effect))), // sonderr_change
      run: <A, E, R>(effect: Effect.Effect<A, E, R>) =>
        Effect.callback<A, E>((resume) => {
          restore(instance, workspace, () =>
            // sonderr_change
            Effect.runPromiseExit(wrap(effect)).then((exit) =>
              resume(Exit.isSuccess(exit) ? Effect.succeed(exit.value) : Effect.failCause(exit.cause)),
            ),
          )
        }),
      bind:
        <Args extends readonly unknown[], Result>(fn: (...args: Args) => Result) =>
        (...args: Args) =>
          restore(instance, workspace, () => Effect.runSync(wrap(Effect.sync(() => fn(...args))))), // sonderr_change
    } satisfies Shape
  })
}

export * as EffectBridge from "./bridge"
