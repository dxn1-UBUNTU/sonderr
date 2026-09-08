export * as HiveEvent from "./hive-event"

import { Schema } from "effect"
import { define, inventory } from "./event"
import { SessionID } from "./session-id"

export const ProposalCreated = define({
  type: "hive.proposal.created",
  schema: {
    sessionID: SessionID,
    proposal: Schema.Struct({
      id: Schema.String,
      title: Schema.String,
      description: Schema.String,
      status: Schema.String,
      votes: Schema.Record(Schema.String, Schema.String),
      createdBy: Schema.String,
      createdAt: Schema.Number,
    }),
  },
})

export const ProposalUpdated = define({
  type: "hive.proposal.updated",
  schema: {
    sessionID: SessionID,
    proposal: Schema.Struct({
      id: Schema.String,
      status: Schema.String,
      votes: Schema.Record(Schema.String, Schema.String),
      closedAt: Schema.optional(Schema.Number),
    }),
  },
})

export const Event = {
  ProposalCreated,
  ProposalUpdated,
  Definitions: inventory(ProposalCreated, ProposalUpdated),
}
