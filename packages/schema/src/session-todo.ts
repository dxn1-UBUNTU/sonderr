export * as SessionTodo from "./session-todo"

import { Schema } from "effect"
import { define, inventory } from "./event"
import { SessionID } from "./session-id"

export const Info = Schema.Struct({
  content: Schema.String.annotate({ description: "Brief description of the task" }),
  status: Schema.String.annotate({
    description: "Current status of the task: pending, in_progress, completed, cancelled",
  }),
  priority: Schema.String.annotate({
    description: "Priority level of the task: high, medium, low",
  }),
  dependencies: Schema.optional(
    Schema.Array(Schema.String).annotate({
      description: "List of task IDs that must be completed before this task can start",
    }),
  ),
  estimated_minutes: Schema.optional(
    Schema.Number.annotate({
      description: "Estimated time to complete this task in minutes",
    }),
  ),
  tags: Schema.optional(
    Schema.Array(Schema.String).annotate({
      description: "Tags for categorizing this task (e.g. 'frontend', 'bug', 'refactor')",
    }),
  ),
}).annotate({ identifier: "Todo" })
export interface Info extends Schema.Schema.Type<typeof Info> {}

const Updated = define({
  type: "todo.updated",
  schema: {
    sessionID: SessionID,
    todos: Schema.Array(Info),
  },
})
export const Event = { Updated, Definitions: inventory(Updated) }
