package ai.sonderr.client

import ai.sonderr.client.app.SonderrWorkspaceService
import ai.sonderr.client.app.Workspace
import ai.sonderr.client.app.SonderrSessionService
import ai.sonderr.client.session.SessionManager
import ai.sonderr.client.session.SessionSidePanelManager
import ai.sonderr.client.telemetry.Telemetry
import ai.sonderr.client.agentManager.worktree.SonderrWorktreeService
import ai.sonderr.client.agentManager.SidePanelKeys
import ai.sonderr.client.agentManager.SidePanelMode
import ai.sonderr.client.agentManager.applySidePanelMode
import ai.sonderr.client.agentManager.worktree.WorktreeController
import ai.sonderr.client.agentManager.AgentManagerPanel
import ai.sonderr.client.agentManager.sessionAttentionNeeded
import ai.sonderr.client.plugin.SonderrBundle
import ai.sonderr.client.ui.AttentionDotIcon
import ai.sonderr.log.SonderrLog
import com.intellij.openapi.actionSystem.ActionGroup
import com.intellij.openapi.actionSystem.ActionManager
import com.intellij.openapi.actionSystem.DataProvider
import com.intellij.openapi.actionSystem.Separator
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.service
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowContentUiType
import com.intellij.openapi.wm.ToolWindowFactory
import com.intellij.platform.project.projectIdOrNull
import com.intellij.openapi.wm.impl.content.ToolWindowContentUi
import com.intellij.ui.content.ContentManagerEvent
import com.intellij.ui.content.ContentManagerListener
import com.intellij.ui.content.ContentFactory
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.awt.BorderLayout
import javax.swing.JPanel

/**
 * Creates the Sonderr tool window and delegates session content management.
 *
 * Resolves the project directory through the backend (handles split-mode
 * where `project.basePath` is a synthetic frontend path) before creating
 * the workspace. The tool window shows a loading state until resolution
 * completes.
 */
class SonderrToolWindowFactory : ToolWindowFactory, DumbAware {
    override fun createToolWindowContent(project: Project, toolWindow: ToolWindow) {
        project.service<SonderrToolWindowSetupService>().create(toolWindow)
    }
}

private val LOG = SonderrLog.create(SonderrToolWindowFactory::class.java)

@Service(Service.Level.PROJECT)
internal class SonderrToolWindowSetupService(
    private val project: Project,
    private val cs: CoroutineScope,
) {
    fun create(toolWindow: ToolWindow) {
        val start = System.currentTimeMillis()
        try {
            val workspaces = service<SonderrWorkspaceService>()
            val hint = project.basePath ?: ""
            // Experimental IntelliJ ProjectId API keeps multi-window and split-mode routing exact.
            val pid = project.projectIdOrNull()

            cs.launch {
                val dir = workspaces.resolveProjectDirectory(pid, hint)
                val workspace = workspaces.workspace(dir)
                withContext(Dispatchers.Main) {
                    setup(project, toolWindow, workspace)
                }
                Telemetry.send("Tool Window Opened", mapOf(
                    "projectResolved" to dir.isNotBlank().toString(),
                    "durationMs" to (System.currentTimeMillis() - start).toString(),
                ))
            }
        } catch (e: Exception) {
            Telemetry.send("Tool Window Setup Failed", mapOf("stage" to "create", "errorClass" to e::class.java.name))
            LOG.error("Failed to create Sonderr tool window content", e)
        }
    }

    private fun setup(
        project: Project,
        toolWindow: ToolWindow,
        workspace: Workspace,
    ) {
        try {
            val manager = SessionSidePanelManager(project, workspace)

            val worktrees = WorktreeController(
                service<SonderrWorktreeService>(),
                workspace.directory,
                cs,
                activity = project.service<SonderrSessionService>().activity,
                abort = { id, dir -> project.service<SonderrSessionService>().abort(id, dir) },
            )
            val agentManagerPanel = AgentManagerPanel(manager, worktrees, project)

            val chat = object : JPanel(BorderLayout()), DataProvider {
                override fun getData(dataId: String): Any? {
                    if (SessionManager.KEY.`is`(dataId)) return manager
                    if (SessionManager.WORKSPACE_KEY.`is`(dataId)) return workspace
                    if (SidePanelKeys.MODE.`is`(dataId)) return SidePanelMode.CHAT
                    return null
                }
            }
            chat.add(manager.component, BorderLayout.CENTER)
            val agent = object : JPanel(BorderLayout()), DataProvider {
                override fun getData(dataId: String): Any? {
                    // Expose the shared manager here too so History works from the Agent Manager tab.
                    if (SessionManager.KEY.`is`(dataId)) return manager
                    if (SessionManager.WORKSPACE_KEY.`is`(dataId)) return workspace
                    if (SidePanelKeys.MODE.`is`(dataId)) return SidePanelMode.AGENT_MANAGER
                    if (SidePanelKeys.WORKTREE_PANEL.`is`(dataId)) return agentManagerPanel
                    return null
                }
            }
            agent.add(agentManagerPanel.component, BorderLayout.CENTER)

            toolWindow.setContentUiType(ToolWindowContentUiType.TABBED, null)
            // Hide the "Sonderr" id label in the header so only the content tabs remain.
            toolWindow.component.putClientProperty(ToolWindowContentUi.HIDE_ID_LABEL, "true")

            val factory = ContentFactory.getInstance()
            val chatContent = factory.createContent(chat, SonderrBundle.message("sidePanel.mode.branch"), false)
            chatContent.applySidePanelMode(SidePanelMode.CHAT)
            chatContent.setDisposer(manager)
            chatContent.setPreferredFocusedComponent { manager.defaultFocusedComponent }
            val agentContent = factory.createContent(agent, SonderrBundle.message("sidePanel.mode.agentManager"), false)
            agentContent.applySidePanelMode(SidePanelMode.AGENT_MANAGER)
            agentContent.setPreferredFocusedComponent { agentManagerPanel.component }
            agentContent.putUserData(ToolWindow.SHOW_CONTENT_ICON, true)
            toolWindow.contentManager.addContent(chatContent)
            toolWindow.contentManager.addContent(agentContent)
            val agents = { toolWindow.contentManager.setSelectedContent(agentContent, true) }
            // The chat branch dock's "New Worktree" action opens the Agent Manager's New Worktree
            // dialog and only switches to that tab once the user confirms. The dialog is anchored on
            // the chat panel because the Agents content may not be in a window hierarchy yet.
            manager.onNewWorktree = {
                Telemetry.send("New Worktree Clicked", mapOf("surface" to "chat_dock"))
                agentManagerPanel.configure(anchor = chat, onCreate = { agents() })
            }
            manager.onMoveToWorktree = { id, dir ->
                agents()
                agentManagerPanel.move(id, dir)
            }
            val listener = object : ContentManagerListener {
                override fun selectionChanged(event: ContentManagerEvent) {
                    if (event.operation == ContentManagerEvent.ContentOperation.add && event.content === agentContent) {
                        agentManagerPanel.refresh()
                    }
                }
            }
            toolWindow.contentManager.addContentManagerListener(listener)
            Disposer.register(manager) { toolWindow.contentManager.removeContentManagerListener(listener) }
            toolWindow.contentManager.setSelectedContent(chatContent)
            manager.newSession()

            // Notification dot on the Agents tab: up for as long as any worktree session is waiting
            // on the user or has failed. Viewing the tab must not clear it — only resolving the
            // attention does, so the dot stays a reliable "something still needs you" signal.
            val dot = cs.launch {
                project.service<SonderrSessionService>().activity.map(::sessionAttentionNeeded).collect { needed ->
                    withContext(Dispatchers.Main) {
                        agentContent.icon = if (needed) AttentionDotIcon else null
                    }
                }
            }
            Disposer.register(manager) { dot.cancel() }

            val actions = listOfNotNull(
                ActionManager.getInstance().getAction("Sonderr.NewSession"),
                ActionManager.getInstance().getAction("Sonderr.NewWorktree"),
                Separator.create(),
                ActionManager.getInstance().getAction("Sonderr.History"),
            )
            toolWindow.setTitleActions(actions)
            // Settings moves off the toolbar into the header gear (options) menu: Open Settings…,
            // Config Files, and Core, inlined from the declarative Sonderr.SettingsGroup.
            (ActionManager.getInstance().getAction("Sonderr.SettingsGroup") as? ActionGroup)?.let {
                toolWindow.setAdditionalGearActions(it)
            }
        } catch (e: Exception) {
            Telemetry.send("Tool Window Setup Failed", mapOf("stage" to "setup", "errorClass" to e::class.java.name))
            LOG.error("Failed to set up Sonderr tool window content", e)
        }
    }
}
