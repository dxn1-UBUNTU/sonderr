import { Schema } from "effect"

export const HiveID = Schema.String.pipe(Schema.brand("HiveID"))
export type HiveID = Schema.Schema.Type<typeof HiveID>

export const HiveMemo = Schema.Struct({
  hiveID: HiveID,
  channel: Schema.String,
  from: Schema.String,
  role: Schema.Literals(["orchestrator", "subagent"]),
  text: Schema.String,
  ts: Schema.Number,
  ttl: Schema.optional(Schema.Number),
}).annotate({ identifier: "HiveMemo" })
export type HiveMemo = Schema.Schema.Type<typeof HiveMemo>

export const HiveConfig = Schema.Struct({
  enabled: Schema.Boolean,
  mode: Schema.Literals(["off", "auto", "manual"]),
  maxAgents: Schema.Number,
  maxConcurrent: Schema.Number,
}).annotate({ identifier: "HiveConfig" })
export type HiveConfig = Schema.Schema.Type<typeof HiveConfig>

export const SONDERR_HIVE_CHANNEL_DEFAULT = "swarm"
export const SONDERR_HIVE_TTL_MS = 3_600_000
