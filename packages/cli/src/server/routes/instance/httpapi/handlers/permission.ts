import { AllowEverythingPermission } from "@/sonderr/permission/allow-everything" // sonderr_change
import { PermissionV1 } from "@sonderr/core/v1/permission"
import { Permission } from "@/permission"
// sonderr_change start
import { SessionID } from "@/session/schema"
import { Effect, Schema } from "effect"
// sonderr_change end
import { HttpApiBuilder } from "effect/unstable/httpapi"
import { InstanceHttpApi } from "../api"
import { PermissionNotFoundError } from "../errors"
// sonderr_change start
import { AllowEverythingBody, SaveAlwaysRulesBody } from "../groups/permission"
// sonderr_change end

export const permissionHandlers = HttpApiBuilder.group(InstanceHttpApi, "permission", (handlers) =>
  Effect.gen(function* () {
    const svc = yield* Permission.Service

    const list = Effect.fn("PermissionHttpApi.list")(function* () {
      return yield* svc.list()
    })

    const reply = Effect.fn("PermissionHttpApi.reply")(function* (ctx: {
      params: { requestID: PermissionV1.ID }
      payload: PermissionV1.ReplyBody
    }) {
      yield* svc
        .reply({
          // sonderr_change
          requestID: ctx.params.requestID,
          reply: ctx.payload.reply,
          message: ctx.payload.message,
          interactive: ctx.payload.interactive, // sonderr_change
        })
        .pipe(
          Effect.catchTag("Permission.NotFoundError", (error) =>
            Effect.fail(
              new PermissionNotFoundError({
                requestID: String(error.requestID),
                message: `Permission request not found: ${error.requestID}`,
              }),
            ),
          ),
        )
      return true
    })

    // sonderr_change start
    const saveAlwaysRules = Effect.fn("PermissionHttpApi.saveAlwaysRules")(function* (ctx: {
      params: { requestID: PermissionV1.ID }
      payload: Schema.Schema.Type<typeof SaveAlwaysRulesBody>
    }) {
      yield* svc
        .saveAlwaysRules({
          requestID: ctx.params.requestID,
          approvedAlways: ctx.payload.approvedAlways ? [...ctx.payload.approvedAlways] : undefined,
          deniedAlways: ctx.payload.deniedAlways ? [...ctx.payload.deniedAlways] : undefined,
        })
        .pipe(
          Effect.catchTag("Permission.NotFoundError", (error) =>
            Effect.fail(
              new PermissionNotFoundError({
                requestID: String(error.requestID),
                message: `Permission request not found: ${error.requestID}`,
              }),
            ),
          ),
        )
      return true
    })

    const allowEverything = Effect.fn("PermissionHttpApi.allowEverything")(function* (ctx: {
      payload: Schema.Schema.Type<typeof AllowEverythingBody>
    }) {
      return yield* AllowEverythingPermission.effect({
        enable: ctx.payload.enable,
        requestID: ctx.payload.requestID ? PermissionV1.ID.make(ctx.payload.requestID) : undefined,
        sessionID: ctx.payload.sessionID ? SessionID.make(ctx.payload.sessionID) : undefined,
      })
    })

    return handlers
      .handle("list", list)
      .handle("reply", reply)
      .handle("saveAlwaysRules", saveAlwaysRules)
      .handle("allowEverything", allowEverything)
    // sonderr_change end
  }),
)
