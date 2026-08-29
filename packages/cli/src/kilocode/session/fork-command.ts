import { fn } from "@/sonderr/fn"
import { MessageID, SessionID } from "@/session/schema"
import { zod as toZod } from "@sonderr/core/effect-zod"
import z from "zod"

export const sonderrSessionFork = fn(
  z.object({ sessionID: toZod(SessionID), messageID: toZod(MessageID).optional() }),
  async (input) => {
    const [{ AppRuntime }, { Session }] = await Promise.all([
      import("@/effect/app-runtime"),
      import("@/session/session"),
    ])
    return AppRuntime.runPromise(Session.Service.use((sessions) => sessions.fork(input)))
  },
)
