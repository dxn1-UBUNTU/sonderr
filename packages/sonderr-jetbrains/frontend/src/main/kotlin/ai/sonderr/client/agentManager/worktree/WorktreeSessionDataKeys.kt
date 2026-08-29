package ai.sonderr.client.agentManager.worktree

import ai.sonderr.rpc.dto.SessionDto
import com.intellij.openapi.actionSystem.DataKey

object WorktreeSessionDataKeys {
    val SESSION: DataKey<SessionDto> = DataKey.create("ai.sonderr.client.agentManager.worktree.Session")
    val PANEL: DataKey<WorktreeSessionEditorPanel> = DataKey.create("ai.sonderr.client.agentManager.worktree.SessionPanel")
}
