package ai.sonderr.client.agentManager.worktree

import ai.sonderr.client.vfs.SonderrVirtualFile
import com.intellij.openapi.components.Service
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.util.concurrency.annotations.RequiresEdt
import java.util.concurrent.CopyOnWriteArrayList

fun interface WorktreeEditorMatcher {
    @RequiresEdt
    fun match(file: VirtualFile): String?
}

@Service(Service.Level.PROJECT)
class WorktreeEditorMatchers {
    private val matchers = CopyOnWriteArrayList<WorktreeEditorMatcher>()

    fun register(matcher: WorktreeEditorMatcher) {
        matchers.addIfAbsent(matcher)
    }

    @RequiresEdt
    fun match(file: VirtualFile?): String? {
        if (file == null) return null
        return matchers.firstNotNullOfOrNull { it.match(file) }
    }
}

object WorktreeSessionEditorMatcher : WorktreeEditorMatcher {
    override fun match(file: VirtualFile): String? {
        val sonderr = file as? SonderrVirtualFile ?: return null
        if (sonderr.path.kind != WorktreeSessionEditorKind.ID) return null
        return sonderr.path.params["path"]?.takeIf { it.isNotBlank() }
    }
}
