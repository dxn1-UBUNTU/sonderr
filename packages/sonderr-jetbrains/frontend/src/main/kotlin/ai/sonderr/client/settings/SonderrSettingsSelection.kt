package ai.sonderr.client.settings

import ai.sonderr.client.settings.profile.UserProfileConfigurable
import com.intellij.ide.util.PropertiesComponent
import com.intellij.openapi.project.Project

internal object SonderrSettingsSelection {
    // IntelliJ persists the selected settings page with SettingsEditor.SELECTED_CONFIGURABLE.
    const val SELECTED_CONFIGURABLE_KEY = "settings.editor.selected.configurable"

    fun target(project: Project): String {
        val id = PropertiesComponent.getInstance(project).getValue(SELECTED_CONFIGURABLE_KEY)
        if (id != null && isSonderr(id)) return id
        return UserProfileConfigurable.ID
    }

    private fun isSonderr(id: String?): Boolean {
        if (id == SonderrSettingsConfigurable.ID) return true
        return id?.startsWith("${SonderrSettingsConfigurable.ID}.") == true
    }
}
