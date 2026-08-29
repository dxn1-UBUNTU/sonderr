package ai.sonderr.client.actions

import ai.sonderr.client.app.SonderrAppService
import ai.sonderr.client.plugin.SonderrBundle
import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.components.service
import com.intellij.openapi.project.DumbAware

class CoreInfoAction : AnAction(), DumbAware {
    override fun actionPerformed(e: AnActionEvent) = Unit

    override fun update(e: AnActionEvent) {
        val app = service<SonderrAppService>()
        val info = app.core
        if (info == null) app.fetchCoreInfoAsync()
        app.fetchBundledAsync()
        val key = if (app.bundled == true) "action.Sonderr.CoreInfo.bundled" else "action.Sonderr.CoreInfo.text"
        e.presentation.text = info?.let {
            SonderrBundle.message(key, it.version, it.platform)
        } ?: SonderrBundle.message("action.Sonderr.CoreInfo.loading")
        e.presentation.description = SonderrBundle.message("action.Sonderr.CoreInfo.description")
        e.presentation.isEnabled = false
        e.presentation.isVisible = true
    }

    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.BGT
}
