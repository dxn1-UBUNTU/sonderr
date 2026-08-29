package ai.sonderr.client.settings.rules

import ai.sonderr.client.plugin.SonderrBundle
import ai.sonderr.client.settings.base.DraftReadyConfigurable
import kotlinx.coroutines.CoroutineScope
import javax.swing.JComponent

class RulesConfigurable : DraftReadyConfigurable<JComponent>() {
    override fun getId(): String = ID

    override fun getDisplayName(): String = SonderrBundle.message("settings.agentBehavior.rules.displayName")

    override fun create(cs: CoroutineScope): JComponent = RulesSettingsUi(cs, root = project?.basePath)

    override fun scrollReadyShell() = false

    companion object {
        const val ID = "ai.sonderr.jetbrains.settings.agentBehavior.rules"
    }
}
