package ai.sonderr.client.settings.context

import ai.sonderr.client.plugin.SonderrBundle
import ai.sonderr.client.settings.base.DraftReadyConfigurable
import kotlinx.coroutines.CoroutineScope
import javax.swing.JComponent

class ContextConfigurable : DraftReadyConfigurable<JComponent>() {
    override fun getId(): String = ID

    override fun getDisplayName(): String = SonderrBundle.message("settings.context.displayName")

    override fun create(cs: CoroutineScope): JComponent = ContextSettingsUi(cs)

    companion object {
        const val ID = "ai.sonderr.jetbrains.settings.context"
    }
}
