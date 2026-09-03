import { Effect, Schema } from "effect"
import * as Tool from "@/tool/tool"
import { SonderrOrchestrator } from "./index"
import type { HiveMemo } from "./model"

const HiveSendParameters = Schema.Struct({
  channel: Schema.optional(Schema.String).annotate({
    description: "Channel name. Defaults to the shared swarm channel.",
  }),
  text: Schema.String.annotate({ description: "Memo text to publish to the hive bus." }),
}).annotate({ identifier: "HiveSendParameters" })

const HiveRecallParameters = Schema.Struct({
  channel: Schema.optional(Schema.String).annotate({
    description: "Channel to read from. Defaults to all channels.",
  }),
  since: Schema.optional(Schema.Number).annotate({
    description: "Only return memos newer than this Unix timestamp in milliseconds.",
  }),
  limit: Schema.optional(Schema.Number).annotate({
    description: "Maximum number of memos to return. Defaults to all recent memos.",
  }),
}).annotate({ identifier: "HiveRecallParameters" })

type SendMeta = { published: boolean; ts: number; channel: string }
type RecallMeta = { count: number }

export const HiveSendTool = Tool.define<typeof HiveSendParameters, SendMeta, SonderrOrchestrator.Service, "hive_send">(
  "hive_send",
  Effect.gen(function* () {
    const orchestrator = yield* SonderrOrchestrator.Service
    return {
      description: "Post a memo to the hive swarm bus. Visible only to other agents in the same hive.",
      parameters: HiveSendParameters,
      execute: (params: Schema.Schema.Type<typeof HiveSendParameters>, ctx: Tool.Context) =>
        Effect.gen(function* () {
          const hiveID = yield* orchestrator.hiveForSession(ctx.sessionID)
          if (!hiveID)
            return {
              title: "Hive send: inactive",
              output: "Hive mode is not active for this session.",
              metadata: { published: false, ts: 0, channel: params.channel ?? "swarm" },
            } satisfies Tool.ExecuteResult<SendMeta>
          const memo = yield* orchestrator.broadcast(hiveID, params.channel ?? "swarm", ctx.sessionID, "subagent", params.text)
          return {
            title: "Hive send: published",
            output: `Published memo ${memo.ts}`,
            metadata: { published: true, ts: memo.ts, channel: memo.channel },
          } satisfies Tool.ExecuteResult<SendMeta>
        }).pipe(Effect.orDie),
    } satisfies Tool.DefWithoutID<typeof HiveSendParameters, SendMeta>
  }),
)

export const HiveRecallTool = Tool.define<typeof HiveRecallParameters, RecallMeta, SonderrOrchestrator.Service, "hive_recall">(
  "hive_recall",
  Effect.gen(function* () {
    const orchestrator = yield* SonderrOrchestrator.Service
    return {
      description: "Read recent memos from the hive bus.",
      parameters: HiveRecallParameters,
      execute: (params: Schema.Schema.Type<typeof HiveRecallParameters>, ctx: Tool.Context) =>
        Effect.gen(function* () {
          const hiveID = yield* orchestrator.hiveForSession(ctx.sessionID)
          if (!hiveID)
            return {
              title: "Hive recall: inactive",
              output: "Hive mode is not active for this session.",
              metadata: { count: 0 },
            } satisfies Tool.ExecuteResult<RecallMeta>
          const memos = yield* orchestrator.recall(hiveID, {
            channel: params.channel,
            since: params.since,
            limit: params.limit,
          })
          if (!memos.length)
            return {
              title: "Hive recall: empty",
              output: "No memos found.",
              metadata: { count: 0 },
            } satisfies Tool.ExecuteResult<RecallMeta>
          const lines = memos.map((m: HiveMemo) => `[${new Date(m.ts).toISOString()}] ${m.from}: ${m.text}`)
          return {
            title: `Hive recall: ${memos.length} memo${memos.length === 1 ? "" : "s"}`,
            output: lines.join("\n"),
            metadata: { count: memos.length },
          } satisfies Tool.ExecuteResult<RecallMeta>
        }).pipe(Effect.orDie),
    } satisfies Tool.DefWithoutID<typeof HiveRecallParameters, RecallMeta>
  }),
)
