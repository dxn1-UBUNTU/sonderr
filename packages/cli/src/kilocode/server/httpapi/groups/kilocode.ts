import { Schema } from "effect"
import { HttpApi, HttpApiEndpoint, HttpApiError, HttpApiGroup, OpenApi } from "effect/unstable/httpapi"
import { Authorization } from "@/server/routes/instance/httpapi/middleware/authorization"
import { InstanceContextMiddleware } from "@/server/routes/instance/httpapi/middleware/instance-context"
import {
  WorkspaceRoutingMiddleware,
  WorkspaceRoutingQuery,
  WorkspaceRoutingQueryFields,
} from "@/server/routes/instance/httpapi/middleware/workspace-routing"
import { described } from "@/server/routes/instance/httpapi/groups/metadata"
import { ProviderUsage } from "@sonderr/schema/sonderr/provider-usage"
import { AnacondaDesktopApi } from "./anaconda-desktop"
import {
  Failure as AgentManagerFailure,
  Request as AgentManagerRequest,
  RequestID as AgentManagerRequestID,
  Result as AgentManagerResult,
} from "@/sonderr/agent-manager/protocol"
import {
  Failure as NotebookFailure,
  Request as NotebookRequest,
  RequestID as NotebookRequestID,
  Result as NotebookResult,
} from "@/sonderr/notebook/protocol"
import { ModelUsage } from "@/sonderr/session/model-usage"
import { MessageID, SessionID } from "@/session/schema"
import { ApiNotFoundError, InvalidRequestError } from "@/server/routes/instance/httpapi/errors"
import { CommandFiles } from "@/sonderr/command-files"

const root = "/sonderr"
const Scope = Schema.Literals(["global", "project"])

export const BackgroundJobInfo = Schema.Struct({
  id: Schema.String,
  type: Schema.String,
  title: Schema.optional(Schema.String),
  status: Schema.Literals(["running", "completed", "error", "cancelled"]),
  started_at: Schema.Number,
  completed_at: Schema.optional(Schema.Number),
  error: Schema.optional(Schema.String),
  metadata: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
})

export const BackgroundJobsQuery = Schema.Struct({
  ...WorkspaceRoutingQueryFields,
  sessionID: SessionID,
})

export const RemoveSkillPayload = Schema.Struct({
  location: Schema.String,
})

export const RemoveCommandPayload = Schema.Struct({
  location: Schema.String,
})

export const RemoveAgentPayload = Schema.Struct({
  name: Schema.String,
  scope: Schema.optional(Scope),
})

export const RemoveSnapshotPayload = Schema.Struct({
  worktree: Schema.String,
})

export const ResumeSessionPayload = Schema.Struct({
  messageID: MessageID,
  snapshotInitialization: Schema.optional(Schema.Literal("wait")),
})

export const NotebookReplyPayload = Schema.Struct({ result: NotebookResult })
export const NotebookRejectPayload = Schema.Struct({ error: NotebookFailure })
export const AgentManagerReplyPayload = Schema.Struct({ result: AgentManagerResult })
export const AgentManagerRejectPayload = Schema.Struct({ error: AgentManagerFailure })

export const SonderrPaths = {
  heapSnapshot: `${root}/heap/snapshot`,
  commandFiles: `${root}/command/files`,
  removeCommand: `${root}/command/remove`,
  removeSkill: `${root}/skill/remove`,
  removeAgent: `${root}/agent/remove`,
  removeSnapshot: `${root}/snapshot/remove`,
  providerUsage: `${root}/provider-usage`,
  providerUsageRefresh: `${root}/provider-usage/refresh`,
  notebookList: `${root}/notebook`,
  notebookReply: `${root}/notebook/:requestID/reply`,
  notebookReject: `${root}/notebook/:requestID/reject`,
  agentManagerList: `${root}/agent-manager`,
  agentManagerReply: `${root}/agent-manager/:requestID/reply`,
  agentManagerReject: `${root}/agent-manager/:requestID/reject`,
  sessionModelUsage: `/session/:sessionID/model-usage`,
  resumeSession: `${root}/session/:sessionID/resume`,
  backgroundJobs: `${root}/background-jobs`,
  backgroundJobCancel: `${root}/background-jobs/:jobID/cancel`,
  backgroundJobPromote: `${root}/background-jobs/:jobID/promote`,
} as const

export const SonderrApi = HttpApi.make("sonderr")
  .add(
    HttpApiGroup.make("sonderr")
      .add(
        HttpApiEndpoint.post("resumeSession", SonderrPaths.resumeSession, {
          params: { sessionID: SessionID },
          query: WorkspaceRoutingQuery,
          payload: ResumeSessionPayload,
          success: described(Schema.Boolean, "Session continuation accepted"),
          error: [ApiNotFoundError, InvalidRequestError],
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "sonderr.resumeSession",
            summary: "Resume an interrupted session",
            description:
              "Resume the specified unfinished assistant turn without adding a user message. Active, completed, reverted, and blocked sessions cannot be resumed.",
          }),
        ),
        HttpApiEndpoint.post("heapSnapshot", SonderrPaths.heapSnapshot, {
          query: WorkspaceRoutingQuery,
          success: described(Schema.String, "Heap snapshot file path"),
          error: HttpApiError.BadRequest,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "sonderr.heap.snapshot",
            summary: "Write heap snapshot",
            description: "Write a heap snapshot for the CLI process to the log directory.",
          }),
        ),
        HttpApiEndpoint.get("commandFiles", SonderrPaths.commandFiles, {
          query: WorkspaceRoutingQuery,
          success: described(Schema.Array(CommandFiles.Info), "Command files"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "sonderr.commandFiles",
            summary: "List command files",
            description: "List commands with editable file locations for settings clients.",
          }),
        ),
        HttpApiEndpoint.post("removeCommand", SonderrPaths.removeCommand, {
          query: WorkspaceRoutingQuery,
          payload: RemoveCommandPayload,
          success: described(Schema.Boolean, "Command removed"),
          error: HttpApiError.BadRequest,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "sonderr.removeCommand",
            summary: "Remove a command",
            description: "Remove a command by deleting its markdown file from disk and clearing it from cache.",
          }),
        ),
        HttpApiEndpoint.post("removeSkill", SonderrPaths.removeSkill, {
          query: WorkspaceRoutingQuery,
          payload: RemoveSkillPayload,
          success: described(Schema.Boolean, "Skill removed"),
          error: HttpApiError.BadRequest,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "sonderr.removeSkill",
            summary: "Remove a skill",
            description: "Remove a skill by deleting its manifest from disk and clearing it from cache.",
          }),
        ),
        HttpApiEndpoint.post("removeAgent", SonderrPaths.removeAgent, {
          query: WorkspaceRoutingQuery,
          payload: RemoveAgentPayload,
          success: described(Schema.Boolean, "Agent removed"),
          error: HttpApiError.BadRequest,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "sonderr.removeAgent",
            summary: "Remove a custom agent",
            description:
              "Remove a custom (non-native) agent from one writable configuration scope, or every writable scope when omitted, and dispose cached instance state.",
          }),
        ),
        HttpApiEndpoint.post("removeSnapshot", SonderrPaths.removeSnapshot, {
          query: WorkspaceRoutingQuery,
          payload: RemoveSnapshotPayload,
          success: described(Schema.Boolean, "Snapshot repository removed"),
          error: HttpApiError.BadRequest,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "sonderr.removeSnapshot",
            summary: "Remove a snapshot repository",
            description: "Remove the snapshot repository for an already deleted Agent Manager worktree.",
          }),
        ),
        HttpApiEndpoint.get("providerUsage", SonderrPaths.providerUsage, {
          query: WorkspaceRoutingQuery,
          success: described(ProviderUsage.Info, "Current provider usage"),
          error: HttpApiError.ServiceUnavailable,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "sonderr.providerUsage.get",
            summary: "Get provider usage",
            description: "Get cache-aware, secret-free provider plan usage and personal billing status.",
          }),
        ),
        HttpApiEndpoint.post("providerUsageRefresh", SonderrPaths.providerUsageRefresh, {
          query: WorkspaceRoutingQuery,
          success: described(ProviderUsage.Info, "Refreshed provider usage"),
          error: HttpApiError.ServiceUnavailable,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "sonderr.providerUsage.refresh",
            summary: "Refresh provider usage",
            description: "Refresh provider plan usage while coalescing concurrent source requests.",
          }),
        ),
        HttpApiEndpoint.get("notebookList", SonderrPaths.notebookList, {
          query: WorkspaceRoutingQuery,
          success: described(Schema.Array(NotebookRequest), "Pending notebook host requests"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "sonderr.notebook.list",
            summary: "List pending notebook requests",
            description: "List pending native notebook requests for the routed workspace.",
          }),
        ),
        HttpApiEndpoint.post("notebookReply", SonderrPaths.notebookReply, {
          params: { requestID: NotebookRequestID },
          query: WorkspaceRoutingQuery,
          payload: NotebookReplyPayload,
          success: described(Schema.Boolean, "Notebook reply accepted"),
          error: [HttpApiError.BadRequest, HttpApiError.NotFound],
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "sonderr.notebook.reply",
            summary: "Reply to a notebook request",
            description: "Complete a pending native notebook request with a structured result.",
          }),
        ),
        HttpApiEndpoint.post("notebookReject", SonderrPaths.notebookReject, {
          params: { requestID: NotebookRequestID },
          query: WorkspaceRoutingQuery,
          payload: NotebookRejectPayload,
          success: described(Schema.Boolean, "Notebook rejection accepted"),
          error: HttpApiError.NotFound,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "sonderr.notebook.reject",
            summary: "Reject a notebook request",
            description: "Complete a pending native notebook request with a structured host error.",
          }),
        ),
        HttpApiEndpoint.get("agentManagerList", SonderrPaths.agentManagerList, {
          query: WorkspaceRoutingQuery,
          success: described(Schema.Array(AgentManagerRequest), "Pending Agent Manager host requests"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "sonderr.agentManager.list",
            summary: "List pending Agent Manager requests",
            description: "List pending native Agent Manager orchestration requests for the routed workspace.",
          }),
        ),
        HttpApiEndpoint.post("agentManagerReply", SonderrPaths.agentManagerReply, {
          params: { requestID: AgentManagerRequestID },
          query: WorkspaceRoutingQuery,
          payload: AgentManagerReplyPayload,
          success: described(Schema.Boolean, "Agent Manager reply accepted"),
          error: [HttpApiError.BadRequest, HttpApiError.NotFound],
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "sonderr.agentManager.reply",
            summary: "Reply to an Agent Manager request",
            description: "Complete a pending Agent Manager orchestration request with a structured result.",
          }),
        ),
        HttpApiEndpoint.post("agentManagerReject", SonderrPaths.agentManagerReject, {
          params: { requestID: AgentManagerRequestID },
          query: WorkspaceRoutingQuery,
          payload: AgentManagerRejectPayload,
          success: described(Schema.Boolean, "Agent Manager rejection accepted"),
          error: HttpApiError.NotFound,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "sonderr.agentManager.reject",
            summary: "Reject an Agent Manager request",
            description: "Complete a pending Agent Manager orchestration request with a structured host error.",
          }),
        ),
        HttpApiEndpoint.get("sessionModelUsage", SonderrPaths.sessionModelUsage, {
          params: { sessionID: SessionID },
          query: WorkspaceRoutingQuery,
          success: described(ModelUsage.Info, "Model usage for a session tree"),
          error: HttpApiError.NotFound,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "sonderr.sessionModelUsage",
            summary: "Get session model usage",
            description: "Get token usage and direct cost by model for the complete top-level session tree.",
          }),
        ),
        HttpApiEndpoint.get("backgroundJobs", SonderrPaths.backgroundJobs, {
          query: BackgroundJobsQuery,
          success: described(Schema.Array(BackgroundJobInfo), "Background jobs"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "sonderr.backgroundJobs",
            summary: "List background jobs",
            description: "List background subagent jobs owned by one parent session.",
          }),
        ),
        HttpApiEndpoint.post("backgroundJobCancel", SonderrPaths.backgroundJobCancel, {
          params: { jobID: Schema.String },
          query: WorkspaceRoutingQuery,
          success: described(Schema.Boolean, "Background job cancelled"),
          error: HttpApiError.NotFound,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "sonderr.backgroundJob.cancel",
            summary: "Cancel background job",
            description: "Cancel one background subagent job and its session tree.",
          }),
        ),
        HttpApiEndpoint.post("backgroundJobPromote", SonderrPaths.backgroundJobPromote, {
          params: { jobID: Schema.String },
          query: WorkspaceRoutingQuery,
          success: described(Schema.Boolean, "Background job promoted"),
          error: HttpApiError.NotFound,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "sonderr.backgroundJob.promote",
            summary: "Promote background job",
            description: "Continue one foreground subagent in the background.",
          }),
        ),
      )
      .annotateMerge(
        OpenApi.annotations({
          title: "sonderr",
          description: "Sonderr-specific routes.",
        }),
      )
      .middleware(InstanceContextMiddleware)
      .middleware(WorkspaceRoutingMiddleware)
      .middleware(Authorization),
  )
  .addHttpApi(AnacondaDesktopApi)
  .annotateMerge(
    OpenApi.annotations({
      title: "sonderr HttpApi",
      version: "0.0.1",
      description: "Sonderr HttpApi surface.",
    }),
  )
