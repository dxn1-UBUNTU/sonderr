package ai.sonderr.client.agentManager.worktree

import ai.sonderr.rpc.dto.WorktreeDto
import com.intellij.openapi.actionSystem.DataKey

object WorktreeDataKeys {
    val WORKTREE: DataKey<WorktreeDto> = DataKey.create("ai.sonderr.client.agentManager.worktree.Worktree")
}
