package ai.sonderr.client.actions

import ai.sonderr.client.SonderrNotifications
import ai.sonderr.client.migration.SonderrMigrationService
import ai.sonderr.client.plugin.SonderrBundle
import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.components.service
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.Messages

class ForceMigrationAction : AnAction(
    SonderrBundle.message("action.Sonderr.ForceMigration.text"),
    SonderrBundle.message("action.Sonderr.ForceMigration.description"),
    null,
), DumbAware {
    internal var confirm: (Project?) -> Boolean = { project ->
        Messages.showYesNoDialog(
            project,
            SonderrBundle.message("action.Sonderr.ForceMigration.confirm.message"),
            SonderrBundle.message("action.Sonderr.ForceMigration.confirm.title"),
            Messages.getWarningIcon(),
        ) == Messages.YES
    }

    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.EDT

    override fun actionPerformed(e: AnActionEvent) {
        if (!confirm(e.project)) return
        service<SonderrMigrationService>().resetStatusAndRestart { ok ->
            if (ok) return@resetStatusAndRestart
            SonderrNotifications.error(SonderrBundle.message("action.Sonderr.ForceMigration.failed"))
        }
    }
}
