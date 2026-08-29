package ai.sonderr.rpc

import ai.sonderr.rpc.dto.ChatEventDto
import ai.sonderr.rpc.dto.CloudSessionListDto
import ai.sonderr.rpc.dto.ConfigUpdateDto
import ai.sonderr.rpc.dto.DiffFileDto
import ai.sonderr.rpc.dto.MessageWithPartsDto
import ai.sonderr.rpc.dto.ModelSelectionDto
import ai.sonderr.rpc.dto.PermissionAlwaysRulesDto
import ai.sonderr.rpc.dto.PermissionReplyDto
import ai.sonderr.rpc.dto.PermissionRequestDto
import ai.sonderr.rpc.dto.PartDto
import ai.sonderr.rpc.dto.PromptDto
import ai.sonderr.rpc.dto.QuestionReplyDto
import ai.sonderr.rpc.dto.QuestionRequestDto
import ai.sonderr.rpc.dto.SessionDto
import ai.sonderr.rpc.dto.SessionActivityDto
import ai.sonderr.rpc.dto.SessionChangeDto
import ai.sonderr.rpc.dto.SessionListDto
import ai.sonderr.rpc.dto.SessionStatusDto
import com.intellij.platform.rpc.RemoteApiProviderService
import fleet.rpc.RemoteApi
import fleet.rpc.Rpc
import fleet.rpc.remoteApiDescriptor
import kotlinx.coroutines.flow.Flow

/**
 * Session management RPC API exposed from backend to frontend.
 *
 * App-scoped — manages sessions across all directories (workspace
 * roots and worktrees). Each call takes a [directory] parameter to
 * scope the operation, matching the CLI server's directory-based
 * routing.
 */
@Rpc
interface SonderrSessionRpcApi : RemoteApi<Unit> {
    companion object {
        suspend fun getInstance(): SonderrSessionRpcApi {
            return RemoteApiProviderService.resolve(remoteApiDescriptor<SonderrSessionRpcApi>())
        }
    }

    /** List root sessions for a directory. */
    suspend fun list(directory: String): SessionListDto

    /** List recent root sessions for the worktree containing [directory]. */
    suspend fun recent(directory: String, limit: Int): SessionListDto

    /** Create a new session in the given directory. */
    suspend fun create(directory: String): SessionDto

    /** Get a single session by ID. */
    suspend fun get(id: String, directory: String): SessionDto

    /** Delete a session. */
    suspend fun delete(id: String, directory: String)

    /** Rename a session. */
    suspend fun rename(id: String, directory: String, title: String): SessionDto

    /**
     * Create a public share link for a session.
     *
     * Requires Sonderr credentials and fails when sharing is disabled by config. The CLI collapses every
     * cause into a bare HTTP 500, so callers cannot tell those apart.
     */
    suspend fun share(id: String, directory: String): SessionDto

    /** Revoke a session's public share link. */
    suspend fun unshare(id: String, directory: String): SessionDto

    /** List cloud-backed sessions. */
    suspend fun cloudSessions(directory: String, cursor: String?, limit: Int, gitUrl: String?): CloudSessionListDto

    /** Import a cloud-backed session into local storage. */
    suspend fun importCloudSession(id: String, directory: String): SessionDto

    /** Observe live session status changes. */
    suspend fun statuses(): Flow<Map<String, SessionStatusDto>>

    /** Observe live per-session activity with the session's directory. */
    suspend fun activity(): Flow<Map<String, SessionActivityDto>>

    /**
     * Observe session create/update/delete across every directory this CLI serves, so a
     * directory-scoped list can refresh when a session is started in another project frame.
     */
    suspend fun changes(): Flow<SessionChangeDto>

    /** Register a worktree directory override for a session. */
    suspend fun setDirectory(id: String, directory: String)

    /** Get the effective directory for a session (worktree or fallback). */
    suspend fun getDirectory(id: String, fallback: String): String

    // ------ chat ------

    /** Rewrite a draft prompt using the configured small model. */
    suspend fun enhancePrompt(directory: String, text: String): String

    /** Send a prompt to a session (fire-and-forget). */
    suspend fun prompt(id: String, directory: String, prompt: PromptDto)

    /** Run a configured slash command/workflow in a session. */
    suspend fun command(id: String, directory: String, command: String, arguments: String, prompt: PromptDto)

    /** Abort ongoing processing for a session. */
    suspend fun abort(id: String, directory: String)

    /** Summarize/compact a session using the selected model. */
    suspend fun compact(id: String, directory: String, model: ModelSelectionDto)

    /** Revert a session to a prior user message or part. */
    suspend fun revert(id: String, directory: String, messageID: String, partID: String?)

    /** Delete a single message (used to remove a queued prompt). */
    suspend fun deleteMessage(id: String, directory: String, messageID: String): Boolean

    /** Redo all reverted changes for a session. */
    suspend fun unrevert(id: String, directory: String)

    /** Load message history for a session. */
    suspend fun messages(id: String, directory: String): List<MessageWithPartsDto>

    /** Load cumulative file changes for a session. */
    suspend fun diff(id: String, directory: String): List<DiffFileDto>

    /**
     * Full before/after content for one changed file so the diff editor can show a whole-file diff.
     * Prefers authoritative snapshot content from a CLI that supports it (correct even for historical
     * turns); falls back to rebuilding locally from the working tree + hunk patch against any pinned
     * CLI. Returns null when neither is available (fall back to the hunk view). Added/deleted files
     * return null because the frontend reconstructs those directly.
     */
    suspend fun diffSides(sessionId: String?, directory: String, file: DiffFileDto, messageId: String?): DiffFileDto?

    /** Load one attachment part from a session without returning full history to the frontend. */
    suspend fun attachmentPart(id: String, directory: String, messageId: String, partId: String, attachmentKey: String?): PartDto?

    /** Subscribe to streaming chat events for a specific session. */
    suspend fun events(id: String, directory: String): Flow<ChatEventDto>

    /** Update config (model, agent/mode, temperature). */
    suspend fun updateConfig(directory: String, config: ConfigUpdateDto)

    // ------ permission / question resolution ------

    /** Reply to a pending permission request (once, always, or reject). */
    suspend fun replyPermission(requestId: String, directory: String, reply: PermissionReplyDto)

    /** Save always-rules for a pending permission request before replying. */
    suspend fun savePermissionRules(requestId: String, directory: String, rules: PermissionAlwaysRulesDto)

    /** Reply to a pending question with user answers. */
    suspend fun replyQuestion(requestId: String, directory: String, answers: QuestionReplyDto)

    /** Reject a pending question. */
    suspend fun rejectQuestion(requestId: String, directory: String)

    /** List all pending permission requests (caller filters by session). */
    suspend fun pendingPermissions(directory: String): List<PermissionRequestDto>

    /** List all pending question requests (caller filters by session). */
    suspend fun pendingQuestions(directory: String): List<QuestionRequestDto>
}
