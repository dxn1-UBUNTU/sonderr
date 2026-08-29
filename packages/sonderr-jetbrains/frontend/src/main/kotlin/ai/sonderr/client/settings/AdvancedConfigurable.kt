package ai.sonderr.client.settings

import ai.sonderr.client.plugin.SonderrBundle
import com.intellij.openapi.options.Configurable
import com.intellij.openapi.options.ConfigurationException
import com.intellij.openapi.options.SearchableConfigurable
import javax.swing.JComponent

class AdvancedConfigurable(
    private val settings: SonderrLogSettingsService = SonderrLogSettingsService.getInstance(),
    private val save: (SonderrLogSettingsService) -> Unit = { it.apply() },
) : SearchableConfigurable, Configurable.NoScroll {
    private var ui: AdvancedSettingsUi? = null

    override fun getId(): String = ID

    override fun getDisplayName(): String = SonderrBundle.message("settings.advanced.displayName")

    override fun createComponent(): JComponent {
        settings.applyLocal()
        val panel = AdvancedSettingsUi()
        ui = panel
        return panel
    }

    override fun isModified(): Boolean = ui?.modified() == true

    override fun apply() {
        val panel = ui ?: return
        val err = panel.error()
        if (err != null) throw ConfigurationException(err)
        val value = panel.value()
        settings.update(value.level, value.mode, value.preview)
        save(settings)
        panel.sync()
    }

    override fun reset() {
        ui?.resetForm()
    }

    override fun disposeUIResources() {
        ui = null
    }

    companion object {
        const val ID = "ai.sonderr.jetbrains.settings.advanced"
    }
}
