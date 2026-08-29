package ai.sonderr.client.actions

import ai.sonderr.client.plugin.SonderrBundle
import ai.sonderr.client.session.SessionManager
import ai.sonderr.client.telemetry.Telemetry
import ai.sonderr.client.agentManager.SidePanelKeys
import ai.sonderr.client.agentManager.SidePanelMode
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.ex.ActionUtil
import com.intellij.openapi.project.DumbAware

class NewSessionAction : AnAction(
    SonderrBundle.message("action.Sonderr.NewSession.text"),
    SonderrBundle.message("action.Sonderr.NewSession.description"),
    SonderrActionIcons.add,
), DumbAware {
    override fun actionPerformed(e: AnActionEvent) {
        Telemetry.send("New Session Clicked", mapOf("surface" to "tool_window"))
        e.getData(SessionManager.KEY)?.newSession()
    }

    override fun update(e: AnActionEvent) {
        e.presentation.isVisible = e.getData(SidePanelKeys.MODE) != SidePanelMode.AGENT_MANAGER
        e.presentation.isEnabled = e.getData(SessionManager.KEY) != null
        e.presentation.icon = SonderrActionIcons.add
        if (!e.isFromActionToolbar) return
        e.presentation.text = SonderrBundle.message("action.Sonderr.NewSession.toolbar")
        e.presentation.putClientProperty(ActionUtil.SHOW_TEXT_IN_TOOLBAR, true)
    }
}
