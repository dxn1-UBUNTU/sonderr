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

export const HiveProposalStatus = Schema.Literals(["open", "accepted", "rejected", "cancelled"])
export type HiveProposalStatus = Schema.Schema.Type<typeof HiveProposalStatus>

export const HiveVote = Schema.Literals(["yes", "no", "abstain"])
export type HiveVote = Schema.Schema.Type<typeof HiveVote>

export const HiveProposal = Schema.Struct({
  id: Schema.String,
  hiveID: HiveID,
  title: Schema.String,
  description: Schema.String,
  status: HiveProposalStatus,
  votes: Schema.Record(Schema.String, Schema.String),
  createdBy: Schema.String,
  createdAt: Schema.Number,
  closedAt: Schema.optional(Schema.Number),
}).annotate({ identifier: "HiveProposal" })
export type HiveProposal = Schema.Schema.Type<typeof HiveProposal>

export const HiveTodoStatus = Schema.Literals(["pending", "in_progress", "completed", "cancelled", "blocked"])
export type HiveTodoStatus = Schema.Schema.Type<typeof HiveTodoStatus>

export const HiveTodo = Schema.Struct({
  id: Schema.String,
  hiveID: HiveID,
  title: Schema.String,
  description: Schema.optional(Schema.String),
  status: HiveTodoStatus,
  assignee: Schema.optional(Schema.String),
  createdAt: Schema.Number,
  updatedAt: Schema.Number,
  completedAt: Schema.optional(Schema.Number),
  dependencies: Schema.optional(Schema.Array(Schema.String)),
}).annotate({ identifier: "HiveTodo" })
export type HiveTodo = Schema.Schema.Type<typeof HiveTodo>

export const HiveConfig = Schema.Struct({
  enabled: Schema.Boolean,
  mode: Schema.Literals(["off", "auto", "manual"]),
  maxAgents: Schema.Number,
  maxConcurrent: Schema.Number,
}).annotate({ identifier: "HiveConfig" })
export type HiveConfig = Schema.Schema.Type<typeof HiveConfig>

export const SONDERR_HIVE_CHANNEL_DEFAULT = "swarm"
export const SONDERR_HIVE_TTL_MS = 3_600_000
