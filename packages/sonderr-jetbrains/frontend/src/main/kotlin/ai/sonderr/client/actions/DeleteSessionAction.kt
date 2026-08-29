package ai.sonderr.client.actions

import ai.sonderr.client.plugin.SonderrBundle
import ai.sonderr.client.session.history.HistoryDataKeys
import ai.sonderr.client.session.SessionManager
import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.Messages

class DeleteSessionAction : AnAction() {
    /** Overridable in tests to avoid showing a real modal dialog. */
    internal var confirm: (project: Project?, msg: String) -> Boolean = { project, msg ->
        Messages.showYesNoDialog(
            project,
            msg,
            SonderrBundle.message("history.delete.confirm.title"),
            Messages.getWarningIcon(),
        ) == Messages.YES
    }

    override fun getActionUpdateThread() = ActionUpdateThread.EDT

    override fun update(e: AnActionEvent) {
        val selection = e.getData(HistoryDataKeys.SELECTION)
        val manager = e.getData(SessionManager.KEY)
        e.presentation.isEnabledAndVisible = manager != null &&
            selection != null &&
            selection.selectedLocal.isNotEmpty()
    }

    override fun actionPerformed(e: AnActionEvent) {
        val selection = e.getData(HistoryDataKeys.SELECTION) ?: return
        val controller = e.getData(HistoryDataKeys.CONTROLLER) ?: return
        val items = selection.selectedLocal.filter { !controller.deleting(it) }
        if (items.isEmpty()) return

        val msg = if (items.size == 1)
            SonderrBundle.message("history.delete.confirm.message", ai.sonderr.client.session.history.title(items[0]))
        else
            SonderrBundle.message("history.delete.confirm.message.multiple", items.size)

        controller.requestDelete(items.size)
        if (!confirm(e.project, msg)) {
            controller.cancelDelete(items.size)
            return
        }
        items.forEach { controller.delete(it) }
    }
}
