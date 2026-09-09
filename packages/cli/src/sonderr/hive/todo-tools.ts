import { Effect, Schema } from "effect"
import * as Tool from "@/tool/tool"
import { SonderrOrchestrator } from "./index"
import { Todo } from "@/session/todo"
import { SessionID } from "@/session/schema"
import type { HiveProposal, HiveTodo, HiveID } from "./model"

const HiveCreateProposalParameters = Schema.Struct({
  title: Schema.String.annotate({ description: "Short title for the proposal" }),
  description: Schema.String.annotate({ description: "Detailed description of what is being proposed" }),
}).annotate({ identifier: "HiveCreateProposalParameters" })

const HiveVoteParameters = Schema.Struct({
  proposalId: Schema.String.annotate({ description: "ID of the proposal to vote on" }),
  vote: Schema.Literals(["yes", "no", "abstain"]).annotate({ description: "Your vote" }),
}).annotate({ identifier: "HiveVoteParameters" })

const HiveCloseProposalParameters = Schema.Struct({
  proposalId: Schema.String.annotate({ description: "ID of the proposal to close" }),
  status: Schema.Literals(["accepted", "rejected", "cancelled"]).annotate({ description: "Final status for the proposal" }),
}).annotate({ identifier: "HiveCloseProposalParameters" })

const HiveListProposalsParameters = Schema.Struct({}).annotate({ identifier: "HiveListProposalsParameters" })

const HiveCreateTodoParameters = Schema.Struct({
  title: Schema.String.annotate({ description: "Short title for the todo item" }),
  description: Schema.optional(Schema.String).annotate({ description: "Detailed description of the task" }),
  assignee: Schema.optional(Schema.String).annotate({ description: "Agent assigned to this todo" }),
  dependencies: Schema.optional(Schema.Array(Schema.String)).annotate({ description: "IDs of todos this depends on" }),
}).annotate({ identifier: "HiveCreateTodoParameters" })

const HiveUpdateTodoParameters = Schema.Struct({
  todoId: Schema.String.annotate({ description: "ID of the todo to update" }),
  status: Schema.optional(Schema.Literals(["pending", "in_progress", "completed", "cancelled", "blocked"])).annotate({
    description: "New status for the todo",
  }),
  assignee: Schema.optional(Schema.String).annotate({ description: "New assignee for the todo" }),
  description: Schema.optional(Schema.String).annotate({ description: "Updated description" }),
}).annotate({ identifier: "HiveUpdateTodoParameters" })

const HiveListTodosParameters = Schema.Struct({
  status: Schema.optional(Schema.String).annotate({ description: "Filter by status (pending, in_progress, completed, blocked)" }),
}).annotate({ identifier: "HiveListTodosParameters" })

type CreateProposalMeta = { proposalId: string }
type VoteMeta = { proposalId: string; vote: string }
type CloseProposalMeta = { proposalId: string; status: string }
type ListProposalsMeta = { count: number }
type CreateTodoMeta = { todoId: string }
type UpdateTodoMeta = { todoId: string; status?: string }
type ListTodosMeta = { count: number }

export const HiveCreateProposalTool = Tool.define<
  typeof HiveCreateProposalParameters,
  CreateProposalMeta,
  SonderrOrchestrator.Service,
  "hive_create_proposal"
>("hive_create_proposal", Effect.gen(function* () {
  const orchestrator = yield* SonderrOrchestrator.Service
  return {
    description: "Create a proposal for the swarm to vote on. Use this when you need to make a decision that affects multiple agents.",
    parameters: HiveCreateProposalParameters,
    execute: (params: Schema.Schema.Type<typeof HiveCreateProposalParameters>, ctx: Tool.Context) =>
      Effect.gen(function* () {
        const hiveID = yield* orchestrator.ensureForSession(ctx.sessionID)
        if (!hiveID)
          return {
            title: "Hive create proposal: inactive",
            output: "Hive mode is not active for this session.",
            metadata: { proposalId: "" },
          } satisfies Tool.ExecuteResult<CreateProposalMeta>
        const proposal = yield* orchestrator.createProposal(hiveID, {
          title: params.title,
          description: params.description,
          createdBy: ctx.sessionID,
        })
        return {
          title: `Hive proposal created: ${proposal.id}`,
          output: `Created proposal ${proposal.id}: ${proposal.title}\n\n${proposal.description}`,
          metadata: { proposalId: proposal.id },
        } satisfies Tool.ExecuteResult<CreateProposalMeta>
      }).pipe(Effect.orDie),
  } satisfies Tool.DefWithoutID<typeof HiveCreateProposalParameters, CreateProposalMeta>
}))

export const HiveVoteTool = Tool.define<
  typeof HiveVoteParameters,
  VoteMeta,
  SonderrOrchestrator.Service,
  "hive_vote"
>("hive_vote", Effect.gen(function* () {
  const orchestrator = yield* SonderrOrchestrator.Service
  return {
    description: "Vote on an active proposal. Use yes, no, or abstain.",
    parameters: HiveVoteParameters,
    execute: (params: Schema.Schema.Type<typeof HiveVoteParameters>, ctx: Tool.Context) =>
      Effect.gen(function* () {
        const hiveID = yield* orchestrator.ensureForSession(ctx.sessionID)
        if (!hiveID)
          return {
            title: "Hive vote: inactive",
            output: "Hive mode is not active for this session.",
            metadata: { proposalId: params.proposalId, vote: params.vote },
          } satisfies Tool.ExecuteResult<VoteMeta>
        const proposal = yield* orchestrator.vote(hiveID, params.proposalId, ctx.sessionID, params.vote)
        if (!proposal)
          return {
            title: "Hive vote: not found",
            output: `Proposal ${params.proposalId} not found or closed.`,
            metadata: { proposalId: params.proposalId, vote: params.vote },
          } satisfies Tool.ExecuteResult<VoteMeta>
        return {
          title: `Hive vote recorded: ${params.vote}`,
          output: `Voted ${params.vote} on proposal ${proposal.id}: ${proposal.title}\n\nCurrent votes:\n${Object.entries(proposal.votes).map(([k, v]) => `  ${k}: ${v}`).join("\n")}`,
          metadata: { proposalId: proposal.id, vote: params.vote },
        } satisfies Tool.ExecuteResult<VoteMeta>
      }).pipe(Effect.orDie),
  } satisfies Tool.DefWithoutID<typeof HiveVoteParameters, VoteMeta>
}))

export const HiveCloseProposalTool = Tool.define<
  typeof HiveCloseProposalParameters,
  CloseProposalMeta,
  SonderrOrchestrator.Service,
  "hive_close_proposal"
>("hive_close_proposal", Effect.gen(function* () {
  const orchestrator = yield* SonderrOrchestrator.Service
  return {
    description: "Close a proposal with a final decision (accepted, rejected, or cancelled).",
    parameters: HiveCloseProposalParameters,
    execute: (params: Schema.Schema.Type<typeof HiveCloseProposalParameters>, ctx: Tool.Context) =>
      Effect.gen(function* () {
        const hiveID = yield* orchestrator.ensureForSession(ctx.sessionID)
        if (!hiveID)
          return {
            title: "Hive close proposal: inactive",
            output: "Hive mode is not active for this session.",
            metadata: { proposalId: params.proposalId, status: params.status },
          } satisfies Tool.ExecuteResult<CloseProposalMeta>
        const proposal = yield* orchestrator.closeProposal(hiveID, params.proposalId, params.status)
        if (!proposal)
          return {
            title: "Hive close proposal: not found",
            output: `Proposal ${params.proposalId} not found or already closed.`,
            metadata: { proposalId: params.proposalId, status: params.status },
          } satisfies Tool.ExecuteResult<CloseProposalMeta>
        return {
          title: `Hive proposal ${params.status}: ${proposal.id}`,
          output: `Proposal ${proposal.id} has been ${params.status}.\n\n${proposal.title}\n\n${proposal.description}`,
          metadata: { proposalId: proposal.id, status: params.status },
        } satisfies Tool.ExecuteResult<CloseProposalMeta>
      }).pipe(Effect.orDie),
  } satisfies Tool.DefWithoutID<typeof HiveCloseProposalParameters, CloseProposalMeta>
}))

export const HiveListProposalsTool = Tool.define<
  typeof HiveListProposalsParameters,
  ListProposalsMeta,
  SonderrOrchestrator.Service,
  "hive_list_proposals"
>("hive_list_proposals", Effect.gen(function* () {
  const orchestrator = yield* SonderrOrchestrator.Service
  return {
    description: "List all proposals in the current hive, including their status and votes.",
    parameters: HiveListProposalsParameters,
    execute: (_params: Schema.Schema.Type<typeof HiveListProposalsParameters>, ctx: Tool.Context) =>
      Effect.gen(function* () {
        const hiveID = yield* orchestrator.ensureForSession(ctx.sessionID)
        if (!hiveID)
          return {
            title: "Hive list proposals: inactive",
            output: "Hive mode is not active for this session.",
            metadata: { count: 0 },
          } satisfies Tool.ExecuteResult<ListProposalsMeta>
        const proposals = yield* orchestrator.listProposals(hiveID)
        if (!proposals.length)
          return {
            title: "Hive list proposals: empty",
            output: "No proposals found.",
            metadata: { count: 0 },
          } satisfies Tool.ExecuteResult<ListProposalsMeta>
        const lines = proposals.map((p) => {
          const voteCount = Object.keys(p.votes).length
          const yesCount = Object.values(p.votes).filter((v) => v === "yes").length
          const noCount = Object.values(p.votes).filter((v) => v === "no").length
          return `[${p.status}] ${p.id}: ${p.title}\n  Created by: ${p.createdBy}\n  Votes: ${voteCount} (yes: ${yesCount}, no: ${noCount})\n  Description: ${p.description}`
        })
        return {
          title: `Hive proposals: ${proposals.length}`,
          output: lines.join("\n\n"),
          metadata: { count: proposals.length },
        } satisfies Tool.ExecuteResult<ListProposalsMeta>
      }).pipe(Effect.orDie),
  } satisfies Tool.DefWithoutID<typeof HiveListProposalsParameters, ListProposalsMeta>
}))

function mapHiveTodoToSessionTodo(todo: HiveTodo): Todo.Info {
  const status = todo.status === "blocked" ? "pending" : todo.status
  return {
    content: todo.title,
    status: status as Todo.Info["status"],
    priority: "medium",
    dependencies: todo.dependencies,
  }
}

function syncHiveTodosToSession(
  orchestrator: SonderrOrchestrator.Interface,
  todoService: Todo.Interface,
  sessionID: string,
  hiveID: HiveID,
): Effect.Effect<void> {
  return Effect.gen(function* () {
    const todos = yield* orchestrator.listTodos(hiveID)
    if (!todos.length) return
    yield* todoService.update({
      sessionID: SessionID.make(sessionID),
      todos: todos.map(mapHiveTodoToSessionTodo),
    })
  })
}

export const HiveCreateTodoTool = Tool.define<
  typeof HiveCreateTodoParameters,
  CreateTodoMeta,
  SonderrOrchestrator.Service,
  "hive_create_todo"
>("hive_create_todo", Effect.gen(function* () {
  const orchestrator = yield* SonderrOrchestrator.Service
  return {
    description: "Create a todo item in the hive. Use this to break down large tasks into trackable units.",
    parameters: HiveCreateTodoParameters,
    execute: (params: Schema.Schema.Type<typeof HiveCreateTodoParameters>, ctx: Tool.Context) =>
      Effect.gen(function* () {
        const hiveID = yield* orchestrator.ensureForSession(ctx.sessionID)
        if (!hiveID)
          return {
            title: "Hive create todo: inactive",
            output: "Hive mode is not active for this session.",
            metadata: { todoId: "" },
          } satisfies Tool.ExecuteResult<CreateTodoMeta>
        const todo = yield* orchestrator.createTodo(hiveID, {
          title: params.title,
          description: params.description,
          assignee: params.assignee,
          dependencies: params.dependencies ? [...params.dependencies] : undefined,
        })
        return {
          title: `Hive todo created: ${todo.id}`,
          output: `Created todo ${todo.id}: ${todo.title}\nAssignee: ${todo.assignee ?? "unassigned"}\nStatus: ${todo.status}`,
          metadata: { todoId: todo.id },
        } satisfies Tool.ExecuteResult<CreateTodoMeta>
      }).pipe(Effect.orDie),
  } satisfies Tool.DefWithoutID<typeof HiveCreateTodoParameters, CreateTodoMeta>
}))

export const HiveUpdateTodoTool = Tool.define<
  typeof HiveUpdateTodoParameters,
  UpdateTodoMeta,
  SonderrOrchestrator.Service,
  "hive_update_todo"
>("hive_update_todo", Effect.gen(function* () {
  const orchestrator = yield* SonderrOrchestrator.Service
  return {
    description: "Update a todo item's status, assignee, or description.",
    parameters: HiveUpdateTodoParameters,
    execute: (params: Schema.Schema.Type<typeof HiveUpdateTodoParameters>, ctx: Tool.Context) =>
      Effect.gen(function* () {
        const hiveID = yield* orchestrator.ensureForSession(ctx.sessionID)
        if (!hiveID)
          return {
            title: "Hive update todo: inactive",
            output: "Hive mode is not active for this session.",
            metadata: { todoId: params.todoId },
          } satisfies Tool.ExecuteResult<UpdateTodoMeta>
        const todo = yield* orchestrator.updateTodo(hiveID, params.todoId, {
          status: params.status,
          assignee: params.assignee,
          description: params.description,
        })
        if (!todo)
          return {
            title: "Hive update todo: not found",
            output: `Todo ${params.todoId} not found.`,
            metadata: { todoId: params.todoId },
          } satisfies Tool.ExecuteResult<UpdateTodoMeta>
        return {
          title: `Hive todo updated: ${todo.id}`,
          output: `Updated todo ${todo.id}\nStatus: ${todo.status}\nAssignee: ${todo.assignee ?? "unassigned"}`,
          metadata: { todoId: todo.id, status: todo.status },
        } satisfies Tool.ExecuteResult<UpdateTodoMeta>
      }).pipe(Effect.orDie),
  } satisfies Tool.DefWithoutID<typeof HiveUpdateTodoParameters, UpdateTodoMeta>
}))

export const HiveListTodosTool = Tool.define<
  typeof HiveListTodosParameters,
  ListTodosMeta,
  SonderrOrchestrator.Service,
  "hive_list_todos"
>("hive_list_todos", Effect.gen(function* () {
  const orchestrator = yield* SonderrOrchestrator.Service
  return {
    description: "List all todo items in the current hive, optionally filtered by status.",
    parameters: HiveListTodosParameters,
    execute: (params: Schema.Schema.Type<typeof HiveListTodosParameters>, ctx: Tool.Context) =>
      Effect.gen(function* () {
        const hiveID = yield* orchestrator.ensureForSession(ctx.sessionID)
        if (!hiveID)
          return {
            title: "Hive list todos: inactive",
            output: "Hive mode is not active for this session.",
            metadata: { count: 0 },
          } satisfies Tool.ExecuteResult<ListTodosMeta>
        let todos = yield* orchestrator.listTodos(hiveID)
        if (params.status) {
          todos = todos.filter((t) => t.status === params.status)
        }
        if (!todos.length)
          return {
            title: "Hive list todos: empty",
            output: "No todo items found.",
            metadata: { count: 0 },
          } satisfies Tool.ExecuteResult<ListTodosMeta>
        const lines = todos.map((t) => {
          const dep = t.dependencies?.length ? `\n  Dependencies: ${t.dependencies.join(", ")}` : ""
          return `[${t.status}] ${t.id}: ${t.title}\n  Assignee: ${t.assignee ?? "unassigned"}\n  Created: ${new Date(t.createdAt).toISOString()}${dep}`
        })
        return {
          title: `Hive todos: ${todos.length}`,
          output: lines.join("\n\n"),
          metadata: { count: todos.length },
        } satisfies Tool.ExecuteResult<ListTodosMeta>
      }).pipe(Effect.orDie),
  } satisfies Tool.DefWithoutID<typeof HiveListTodosParameters, ListTodosMeta>
}))
