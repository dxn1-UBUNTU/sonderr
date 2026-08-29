package ai.sonderr.client.settings.agents

import ai.sonderr.client.plugin.SonderrBundle
import ai.sonderr.client.settings.rules.RulesConfigurable
import ai.sonderr.client.ui.UiStyle
import ai.sonderr.client.ui.layout.Stack
import com.intellij.ide.DataManager
import com.intellij.openapi.options.SearchableConfigurable
import com.intellij.openapi.options.ex.Settings
import com.intellij.ui.components.ActionLink
import com.intellij.ui.components.JBLabel
import com.intellij.util.ui.JBUI
import javax.swing.JComponent

class AgentBehaviorConfigurable : SearchableConfigurable {
    override fun getId(): String = ID

    override fun getDisplayName(): String = SonderrBundle.message("settings.agentBehavior.displayName")

    override fun createComponent(): JComponent {
        val panel = Stack.vertical()
        panel.border = JBUI.Borders.empty(UiStyle.Gap.lg(), 0, 0, 0)
        val desc = JBLabel(SonderrBundle.message("settings.agentBehavior.description"))
        desc.border = JBUI.Borders.emptyBottom(UiStyle.Gap.pad())
        panel.next(desc)
        listOf(
            SonderrBundle.message("settings.agentBehavior.agents.displayName") to AgentsConfigurable.ID,
            SonderrBundle.message("settings.agentBehavior.mcp.displayName") to McpConfigurable.ID,
            SonderrBundle.message("settings.agentBehavior.skills.displayName") to SkillsConfigurable.ID,
            SonderrBundle.message("settings.agentBehavior.workflows.displayName") to WorkflowsConfigurable.ID,
            SonderrBundle.message("settings.agentBehavior.rules.displayName") to RulesConfigurable.ID,
        ).forEach { (label, id) ->
            panel.next(ActionLink(label) { e ->
                val src = e.source as? JComponent ?: return@ActionLink
                val settings = Settings.KEY.getData(DataManager.getInstance().getDataContext(src)) ?: return@ActionLink
                settings.find(id)?.let { settings.select(it) }
            }.apply { border = JBUI.Borders.emptyBottom(UiStyle.Gap.sm()) })
        }
        return panel
    }

    override fun isModified(): Boolean = false

    override fun apply() = Unit

    companion object {
        const val ID = "ai.sonderr.jetbrains.settings.agentBehavior"
    }
}
