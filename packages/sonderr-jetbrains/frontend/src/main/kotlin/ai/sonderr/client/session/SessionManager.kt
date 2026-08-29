package ai.sonderr.client.session

import ai.sonderr.client.session.controller.SessionController
import ai.sonderr.client.session.ui.empty.EmptySessionPanel
import ai.sonderr.client.app.Workspace
import ai.sonderr.rpc.dto.SessionDto
import com.intellij.openapi.Disposable
import com.intellij.openapi.actionSystem.DataKey

interface SessionManager {
    companion object {
        val KEY = DataKey.create<SessionManager>("ai.sonderr.client.session.SessionManager")
        val WORKSPACE_KEY = DataKey.create<Workspace>("ai.sonderr.client.session.Workspace")
    }

    fun newSession()

    /** Whether this surface can open the New Worktree flow (sidebar only). */
    val supportsNewWorktree: Boolean get() = false

    /** Opens the New Worktree flow. No-op unless [supportsNewWorktree] is true. */
    fun newWorktree() {}

    /** Whether this surface can move the current chat into a worktree (sidebar only). */
    val supportsMoveToWorktree: Boolean get() = false

    /** Opens the Move to Worktree flow. No-op unless [supportsMoveToWorktree] is true. */
    fun moveToWorktree(sessionId: String?, directory: String) {}

    fun showHistory(back: (() -> Unit)? = null)

    fun openSession(ref: SessionRef)

    fun activity(): Map<String, SessionActivityKind> = emptyMap()

    fun titles(): Map<String, String> = emptyMap()

    fun activityChanged() {}

    fun focusPrompt() {}

    val showsBranchDock: Boolean get() = true

    val hostedInEditorTab: Boolean get() = false

    val readonly: Boolean get() = false

    fun emptyPanel(parent: Disposable, controller: SessionController): EmptySessionPanel = EmptySessionPanel(
        parent,
        controller,
        controller.recents(),
        history = { showHistory() },
        activity = { activity() },
        titles = { titles() },
        newWorktree = if (supportsNewWorktree) ({ newWorktree() }) else null,
    )

    fun openSession(session: SessionDto) {
        openSession(SessionRef.Local(session))
    }
}
