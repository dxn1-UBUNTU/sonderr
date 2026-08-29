package ai.sonderr.client.actions

import ai.sonderr.client.app.SonderrAppService
import ai.sonderr.client.plugin.SonderrBundle
import ai.sonderr.client.telemetry.Telemetry
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.components.service
import com.intellij.openapi.project.DumbAware

class RestartSonderrAction : AnAction(), DumbAware {
    override fun actionPerformed(e: AnActionEvent) {
        Telemetry.send("CLI Restart Clicked", mapOf("surface" to "settings"))
        service<SonderrAppService>().restartAsync()
    }

    override fun update(e: AnActionEvent) {
        e.presentation.isEnabled = true
        if (e.place == SonderrActionPlaces.connectionRetryPopup()) {
            e.presentation.text = SonderrBundle.message("action.Sonderr.Restart.cli.text")
        }
    }
}
