package ai.sonderr.client.session.subagent

import ai.sonderr.client.app.SonderrAppService
import ai.sonderr.client.app.SonderrSessionService
import ai.sonderr.client.app.SonderrWorkspaceService
import ai.sonderr.client.plugin.SonderrBundle
import ai.sonderr.client.session.SessionUi
import ai.sonderr.client.session.SessionUiFactory
import ai.sonderr.client.vfs.SonderrEditorKind
import ai.sonderr.client.vfs.SonderrEditorKindRegistry
import ai.sonderr.client.vfs.SonderrVirtualFile
import com.intellij.icons.AllIcons
import com.intellij.openapi.Disposable
import com.intellij.openapi.components.service
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import com.intellij.util.concurrency.annotations.RequiresEdt
import com.intellij.util.ui.components.BorderLayoutPanel
import kotlinx.coroutines.cancel
import java.awt.BorderLayout
import javax.swing.Icon
import javax.swing.JComponent

object SubagentSessionEditorKind : SonderrEditorKind {
    const val ID = "subagent-session"

    override val id: String = ID

    override fun title(params: Map<String, String>): String {
        val id = params[SESSION]?.takeIf { it.isNotBlank() } ?: return SonderrBundle.message("session.subagent.title")
        return service<SubagentTitleCache>().title(id)?.takeIf { it.isNotBlank() }
            ?: SonderrBundle.message("session.subagent.title")
    }

    override fun icon(params: Map<String, String>): Icon = AllIcons.Nodes.Function
    override fun presentablePath(params: Map<String, String>): String = SonderrBundle.message("session.subagent.path", params[SESSION].orEmpty())
    override fun isValid(params: Map<String, String>): Boolean = !params[SESSION].isNullOrBlank() && !params[DIR].isNullOrBlank()

    @RequiresEdt
    override fun preferredFocus(component: JComponent): JComponent? = (component as? SubagentSessionEditorPanel)?.host?.currentFocus()

    @RequiresEdt
    override fun createContent(project: Project, file: SonderrVirtualFile, parent: Disposable): JComponent {
        val id = file.path.params[SESSION]?.takeIf { it.isNotBlank() } ?: return BorderLayoutPanel()
        val dir = file.path.params[DIR]?.takeIf { it.isNotBlank() } ?: return BorderLayoutPanel()
        val workspace = service<SonderrWorkspaceService>().workspace(dir)
        val cs = service<SessionUiFactory>().scope()
        Disposer.register(parent) { cs.cancel() }
        val host = SubagentSessionEditorHost(
            parent = parent,
            project = project,
            workspace = workspace,
            create = { p, w, manager, ref, timers ->
                SessionUi(
                    project = p,
                    workspace = w,
                    sessions = p.service<SonderrSessionService>(),
                    app = service<SonderrAppService>(),
                    cs = cs,
                    ref = ref,
                    manager = manager,
                    timers = timers,
                )
            },
        )
        host.open(id)
        return SubagentSessionEditorPanel(host)
    }

    private const val SESSION = "sessionId"
    private const val DIR = "directory"
}

class SubagentSessionEditorPanel(val host: SubagentSessionEditorHost) : BorderLayoutPanel() {
    init {
        add(host.component, BorderLayout.CENTER)
    }
}

fun ensureSubagentSessionEditorKind() {
    service<SonderrEditorKindRegistry>().register(SubagentSessionEditorKind)
}

internal fun unregisterSubagentSessionEditorKind() {
    service<SonderrEditorKindRegistry>().unregister(SubagentSessionEditorKind.ID)
}

internal fun subagentSessionParams(sessionId: String, directory: String): Map<String, String> = linkedMapOf(
    "sessionId" to sessionId,
    "directory" to directory,
)
