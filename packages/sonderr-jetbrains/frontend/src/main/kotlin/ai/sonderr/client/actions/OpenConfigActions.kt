package ai.sonderr.client.actions

import ai.sonderr.client.SonderrNotifications
import ai.sonderr.client.app.SonderrWorkspaceService
import ai.sonderr.client.plugin.SonderrBundle
import ai.sonderr.client.telemetry.Telemetry
import ai.sonderr.rpc.dto.ConfigTargetDto
import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.components.service
import com.intellij.openapi.project.DumbAware

abstract class ConfigAction(
    private val open: String,
    private val create: String,
    text: String,
    description: String,
) : AnAction(text, description, null), DumbAware {
    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.BGT

    protected fun text(target: ConfigTargetDto?): String {
        val key = if (target?.exists == false) create else open
        return SonderrBundle.message(key, target?.displayPath ?: "...")
    }

    protected fun failed() {
        SonderrNotifications.error(SonderrBundle.message("action.Sonderr.OpenConfig.failed"))
    }
}

class OpenLocalConfigAction : ConfigAction(
    open = "action.Sonderr.OpenLocalConfig.text",
    create = "action.Sonderr.CreateLocalConfig.text",
    text = SonderrBundle.message("action.Sonderr.OpenLocalConfig.text", "..."),
    description = SonderrBundle.message("action.Sonderr.OpenLocalConfig.description"),
) {
    override fun update(e: AnActionEvent) {
        val dir = e.workspaceDirectory()
        val service = service<SonderrWorkspaceService>()
        val target = dir?.let { service.localConfig[it] }
        e.presentation.isEnabled = dir != null
        e.presentation.text = text(target)

        if (dir != null && target == null) {
            service.refreshLocalConfigTarget(dir)
        }
    }

    override fun actionPerformed(e: AnActionEvent) {
        val dir = e.workspaceDirectory() ?: return
        Telemetry.send("Config Opened", mapOf("surface" to "tool_window", "scope" to "local"))
        service<SonderrWorkspaceService>().openLocalConfig(dir) { ok ->
            if (!ok) failed()
        }
    }
}

class OpenGlobalConfigAction : ConfigAction(
    open = "action.Sonderr.OpenGlobalConfig.text",
    create = "action.Sonderr.CreateGlobalConfig.text",
    text = SonderrBundle.message("action.Sonderr.OpenGlobalConfig.text", "..."),
    description = SonderrBundle.message("action.Sonderr.OpenGlobalConfig.description"),
) {
    override fun update(e: AnActionEvent) {
        val service = service<SonderrWorkspaceService>()
        val target = service.globalConfig
        e.presentation.text = text(target)

        if (target == null) {
            service.refreshGlobalConfigTarget()
        }
    }

    override fun actionPerformed(e: AnActionEvent) {
        Telemetry.send("Config Opened", mapOf("surface" to "tool_window", "scope" to "global"))
        service<SonderrWorkspaceService>().openGlobalConfig { ok ->
            if (!ok) failed()
        }
    }
}
