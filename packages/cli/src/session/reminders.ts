
import { Effect } from "effect"
import { SonderrSessionPrompt } from "@/sonderr/session/prompt" // sonderr_change
import { Agent } from "@/agent/agent"
import { FSUtil } from "@sonderr/core/fs-util"
import { InstanceState } from "@/effect/instance-state"
import { RuntimeFlags } from "@/effect/runtime-flags"
import { PartID } from "./schema"
import { MessageV2 } from "./message-v2"
import { Session } from "./session"
import { SessionV1 } from "@sonderr/core/v1/session"
import CODE_SWITCH from "./prompt/code-switch.txt" // sonderr_change
import ASK_CODE_SWITCH from "@/sonderr/session/ask-code-switch.txt" // sonderr_change

export const apply = Effect.fn("SessionReminders.apply")(function* (input: {
  messages: SessionV1.WithParts[]
  agent: Agent.Info
  session: Session.Info
}) {
  const flags = yield* RuntimeFlags.Service
  const fsys = yield* FSUtil.Service
  const sessions = yield* Session.Service
  const userMessage = input.messages.findLast((msg) => msg.info.role === "user")
  if (!userMessage) return input.messages

  // sonderr_change start - shared planning / agent-switch reminder path
  yield* Effect.promise(() =>
    SonderrSessionPrompt.insertPlanReminders({
      agent: input.agent,
      session: input.session,
      userMessage,
      messages: input.messages,
    }),
  )
  const switched = SonderrSessionPrompt.insertAgentSwitchReminder({
    agent: input.agent,
    userMessage,
    messages: input.messages,
  })
  if (switched) userMessage.parts.push(yield* sessions.updatePart(switched))
  // sonderr_change end

  if (!flags.experimentalPlanMode) {
    const wasPlan = input.messages.some((msg) => msg.info.role === "assistant" && msg.info.agent === "plan")
    if (
      wasPlan &&
      input.agent.name === "code" &&
      !userMessage.parts.some((part) => part.type === "text" && part.text === ASK_CODE_SWITCH)
    ) {
      // sonderr_change - renamed from "build" to "code"
      userMessage.parts.push({
        id: PartID.ascending(),
        messageID: userMessage.info.id,
        sessionID: userMessage.info.sessionID,
        type: "text",
        text: CODE_SWITCH, // sonderr_change - renamed from BUILD_SWITCH to CODE_SWITCH
        synthetic: true,
      })
    }
    return input.messages
  }

  const assistantMessage = input.messages.findLast((msg) => msg.info.role === "assistant")
  if (input.agent.name !== "plan" && assistantMessage?.info.agent === "plan") {
    const ctx = yield* InstanceState.context
    const plan = Session.plan(input.session, ctx)
    const exists = yield* fsys.existsSafe(plan)
    const part = yield* sessions.updatePart({
      id: PartID.ascending(),
      messageID: userMessage.info.id,
      sessionID: userMessage.info.sessionID,
      type: "text",
      text: exists
        ? `${CODE_SWITCH}\n\nA plan file exists at ${plan}. You should execute on the plan defined within it` // sonderr_change - renamed from BUILD_SWITCH to CODE_SWITCH
        : CODE_SWITCH, // sonderr_change - renamed from BUILD_SWITCH to CODE_SWITCH
      synthetic: true,
    })
    userMessage.parts.push(part)
    return input.messages
  }

  // sonderr_change start - replace native Plan's separate prompt with the shared reminder above
  return input.messages
  // sonderr_change end
})

export * as SessionReminders from "./reminders"
