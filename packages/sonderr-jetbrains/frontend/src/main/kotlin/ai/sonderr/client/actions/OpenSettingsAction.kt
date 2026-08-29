package ai.sonderr.client.actions

import ai.sonderr.client.plugin.SonderrBundle
import ai.sonderr.client.settings.SonderrSettingsConfigurable
import ai.sonderr.client.settings.SonderrSettingsSelection
import ai.sonderr.client.telemetry.Telemetry
import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.options.Configurable
import com.intellij.openapi.options.ConfigurableWithId
import com.intellij.openapi.options.ShowSettingsUtil
import com.intellij.openapi.project.DumbAwareAction
import com.intellij.openapi.project.ProjectManager
import java.util.function.Predicate

class OpenSettingsAction : DumbAwareAction(
    SonderrBundle.message("action.Sonderr.OpenSettings.text"),
    SonderrBundle.message("action.Sonderr.OpenSettings.description"),
    null,
) {
    override fun actionPerformed(e: AnActionEvent) {
        Telemetry.send("Settings Opened", mapOf("surface" to "tool_window"))
        val project = e.project ?: ProjectManager.getInstance().defaultProject
        val target = SonderrSettingsSelection.target(project)
        val util = ShowSettingsUtil.getInstance()
        try {
            util.showSettingsDialog(project, predicate(target), null)
        } catch (err: IllegalStateException) {
            if (target == SonderrSettingsConfigurable.ID) throw err
            util.showSettingsDialog(project, predicate(SonderrSettingsConfigurable.ID), null)
        }
    }

    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.BGT

    private fun predicate(id: String) = Predicate { cfg: Configurable ->
        cfg is ConfigurableWithId && cfg.getId() == id
    }
}
