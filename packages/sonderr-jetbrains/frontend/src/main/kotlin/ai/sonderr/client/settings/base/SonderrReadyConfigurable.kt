package ai.sonderr.client.settings.base

import ai.sonderr.client.app.SonderrAppService
import ai.sonderr.client.plugin.SonderrBundle
import ai.sonderr.client.ui.UiStyle
import ai.sonderr.client.ui.layout.Stack
import ai.sonderr.rpc.dto.SonderrAppStateDto
import ai.sonderr.rpc.dto.SonderrAppStatusDto
import com.intellij.ide.DataManager
import com.intellij.openapi.actionSystem.CommonDataKeys
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.application.EDT
import com.intellij.openapi.application.ModalityState
import com.intellij.openapi.application.asContextElement
import com.intellij.openapi.components.service
import com.intellij.openapi.options.Configurable
import com.intellij.openapi.options.SearchableConfigurable
import com.intellij.openapi.project.Project
import com.intellij.ui.components.JBLabel
import com.intellij.util.concurrency.annotations.RequiresEdt
import com.intellij.util.ui.JBFont
import com.intellij.util.ui.JBUI
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.awt.BorderLayout
import javax.swing.JComponent

abstract class SonderrReadyConfigurableBase : SearchableConfigurable, Configurable.NoMargin {
    private var shell: SettingsOverlayPanel? = null
    private var scope: CoroutineScope? = null
    private var ready: JComponent? = null
    protected var project: Project? = null
        private set

    @RequiresEdt
    override fun createComponent(): JComponent {
        checkEdt()
        // The shell never pads: the ready UI (or unavailable content) owns its own insets. This keeps
        // a single margin when the shell scrolls a nested SettingsPanel.
        val root = if (scrollReadyShell()) SettingsPanel(pad = false) else SettingsOverlayPanel()
        val cs = CoroutineScope(SupervisorJob() + Dispatchers.Default)
        shell = root
        scope = cs
        setContent(root, unavailable())
        updateProject(root)
        cs.launch { service<SonderrAppService>().connect() }
        cs.launch {
            service<SonderrAppService>().state.collect { state ->
                withContext(edt) { update(state) }
            }
        }
        return root
    }

    override fun isModified(): Boolean = ready != null && isModifiedReady()

    override fun apply() {
        if (ready != null) applyReady()
    }

    override fun reset() {
        if (ready != null) resetReady()
    }

    override fun getPreferredFocusedComponent(): JComponent? = preferredReady()

    override fun focusOn(label: String) {
        focusReady(label)
    }

    override fun disposeUIResources() {
        val panel = ready
        val cs = scope
        if (panel is SettingsOverlayPanel) panel.setOverlayHost(null)
        shell = null
        scope = null
        ready = null
        val cancel = cancelScopeBeforeReadyDispose()
        if (panel != null && cancel) cs?.cancel()
        val app = ApplicationManager.getApplication()
        if (panel != null && app.isDispatchThread) {
            disposeReadyComponent(panel)
            if (!cancel) cs?.cancel()
            return
        }
        if (panel != null) {
            app.invokeLater({
                disposeReadyComponent(panel)
                if (!cancel) cs?.cancel()
            }, ModalityState.any())
            return
        }
        cs?.cancel()
    }

    @RequiresEdt
    private fun update(state: SonderrAppStateDto) {
        checkEdt()
        if (state.status != SonderrAppStatusDto.READY || ready != null) return
        val cs = scope ?: return
        shell?.let { updateProject(it) }
        val panel = createReadyComponent(cs)
        ready = panel
        val root = shell
        if (panel is SettingsOverlayPanel) panel.setOverlayHost(root)
        if (root != null) setContent(root, panel)
        onReadyComponentCreated(panel)
    }

    private fun setContent(root: SettingsOverlayPanel, component: JComponent) {
        if (root is SettingsPanel) {
            root.setContent(component)
            return
        }
        root.content.removeAll()
        root.content.add(component, BorderLayout.CENTER)
        root.revalidate()
        root.repaint()
    }

    private fun unavailable(): JComponent {
        val title = JBLabel(SonderrBundle.message("settings.cli.unavailable.title"))
        title.font = JBFont.h3().asBold()
        val message = JBLabel(SonderrBundle.message("settings.cli.unavailable.message"))
        message.setAllowAutoWrapping(true)
        return Stack.vertical(UiStyle.Gap.sm()).apply {
            border = JBUI.Borders.empty(UiStyle.Gap.pad())
            next(title)
            next(message)
        }
    }

    private fun updateProject(src: JComponent) {
        project = CommonDataKeys.PROJECT.getData(DataManager.getInstance().getDataContext(src)) ?: project
    }

    protected abstract fun createReadyComponent(cs: CoroutineScope): JComponent

    protected open fun isModifiedReady(): Boolean = false

    protected open fun applyReady() = Unit

    protected open fun resetReady() = Unit

    protected open fun preferredReady(): JComponent? = null

    protected open fun focusReady(label: String) = Unit

    protected open fun onReadyComponentCreated(component: JComponent) = Unit
    protected open fun cancelScopeBeforeReadyDispose(): Boolean = false
    protected open fun disposeReadyComponent(component: JComponent) = Unit
    protected open fun scrollReadyShell(): Boolean = true

    private fun checkEdt() {
        check(ApplicationManager.getApplication().isDispatchThread) { "Settings configurable UI must run on EDT" }
    }

    private companion object {
        val edt = Dispatchers.EDT + ModalityState.any().asContextElement()
    }
}

abstract class SonderrReadyConfigurable : SonderrReadyConfigurableBase(), Configurable.NoScroll
