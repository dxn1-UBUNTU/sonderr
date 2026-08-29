import { Effect } from "effect"
import { HttpApiBuilder, HttpApiError } from "effect/unstable/httpapi"
import { EffectBridge } from "@/effect/bridge"
import { SonderrSessions } from "@/sonderr-sessions/sonderr-sessions"
import { InstanceHttpApi } from "@/server/routes/instance/httpapi/api"

export const remoteHandlers = HttpApiBuilder.group(InstanceHttpApi, "remote", (handlers) =>
  Effect.gen(function* () {
    const enable = Effect.fn("RemoteHttpApi.enable")(function* () {
      yield* EffectBridge.fromPromise(() => SonderrSessions.enableRemote()).pipe(
        Effect.catchCause(() => Effect.fail(new HttpApiError.Unauthorized())),
      )
      return SonderrSessions.remoteStatus()
    })

    const disable = Effect.fn("RemoteHttpApi.disable")(function* () {
      yield* Effect.sync(() => SonderrSessions.disableRemote())
      return SonderrSessions.remoteStatus()
    })

    const status = Effect.fn("RemoteHttpApi.status")(function* () {
      return yield* Effect.sync(() => SonderrSessions.remoteStatus())
    })

    return handlers.handle("enable", enable).handle("disable", disable).handle("status", status)
  }),
)
