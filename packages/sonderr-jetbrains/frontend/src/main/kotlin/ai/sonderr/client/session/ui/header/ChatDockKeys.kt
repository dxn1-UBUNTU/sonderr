package ai.sonderr.client.session.ui.header

import com.intellij.openapi.actionSystem.DataKey

/** Exposes the chat [BranchDock] to the New Worktree / Move to Worktree toolbar actions. */
internal object ChatDockKeys {
    val DOCK: DataKey<BranchDock> = DataKey.create("sonderr.chat.branchDock")
}
