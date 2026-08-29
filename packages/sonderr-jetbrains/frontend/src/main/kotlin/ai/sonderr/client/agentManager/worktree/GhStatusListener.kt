package ai.sonderr.client.agentManager.worktree

import ai.sonderr.rpc.dto.GhAvailability
import com.intellij.util.messages.Topic

fun interface GhStatusListener {
    fun statusChanged(value: GhAvailability)

    companion object {
        @JvmField
        val TOPIC: Topic<GhStatusListener> = Topic.create("Sonderr gh status", GhStatusListener::class.java)
    }
}
