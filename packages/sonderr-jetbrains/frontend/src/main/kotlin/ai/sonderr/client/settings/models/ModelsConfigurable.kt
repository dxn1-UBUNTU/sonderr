package ai.sonderr.client.settings.models

import ai.sonderr.client.plugin.SonderrBundle
import ai.sonderr.client.settings.base.DraftReadyConfigurable
import com.intellij.openapi.project.ProjectManager
import kotlinx.coroutines.CoroutineScope
import javax.swing.JComponent

class ModelsConfigurable : DraftReadyConfigurable<JComponent>() {
    override fun getId(): String = ID

    override fun getDisplayName(): String = SonderrBundle.message("settings.models.displayName")

    override fun create(cs: CoroutineScope): JComponent {
        val dir = ProjectManager.getInstance().openProjects.firstOrNull { !it.isDefault }?.basePath
        return ModelsSettingsUi(cs, directory = dir)
    }

    companion object {
        const val ID = "ai.sonderr.jetbrains.settings.models"
    }
}
