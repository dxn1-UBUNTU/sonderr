package ai.sonderr.client.settings.providers

import ai.sonderr.client.plugin.SonderrBundle
import ai.sonderr.client.settings.base.SonderrReadyConfigurable
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.project.ProjectManager
import com.intellij.util.concurrency.annotations.RequiresEdt
import kotlinx.coroutines.CoroutineScope
import javax.swing.JComponent

class ProvidersConfigurable : SonderrReadyConfigurable() {
    private var ui: ProvidersSettingsUi? = null

    override fun getId(): String = ID
    override fun getDisplayName(): String = SonderrBundle.message("settings.providers.displayName")

    @RequiresEdt
    override fun createReadyComponent(cs: CoroutineScope): JComponent {
        checkEdt()
        val dir = ProjectManager.getInstance().openProjects.firstOrNull { !it.isDefault }?.basePath.orEmpty()
        val panel = ProvidersSettingsUi(cs, dir)
        ui = panel
        return panel
    }

    @RequiresEdt
    override fun resetReady() {
        checkEdt()
        ui?.reload()
    }

    override fun cancelScopeBeforeReadyDispose(): Boolean = true

    override fun scrollReadyShell(): Boolean = false

    override fun disposeReadyComponent(component: JComponent) {
        val panel = ui ?: return
        ui = null
        panel.dispose()
    }

    private fun checkEdt() {
        check(ApplicationManager.getApplication().isDispatchThread) { "Provider configurable UI must run on EDT" }
    }

    companion object {
        const val ID = "ai.sonderr.jetbrains.settings.providers"
    }
}
