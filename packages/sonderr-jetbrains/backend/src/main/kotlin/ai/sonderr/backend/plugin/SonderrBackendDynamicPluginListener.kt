package ai.sonderr.backend.plugin

import ai.sonderr.SonderrPlugin
import ai.sonderr.backend.app.SonderrBackendAppService
import ai.sonderr.log.SonderrLog
import com.intellij.ide.plugins.DynamicPluginListener
import com.intellij.ide.plugins.IdeaPluginDescriptor
import com.intellij.openapi.components.service

class SonderrBackendDynamicPluginListener : DynamicPluginListener {
    private val log = SonderrLog.create(SonderrBackendDynamicPluginListener::class.java)

    override fun beforePluginUnload(pluginDescriptor: IdeaPluginDescriptor, isUpdate: Boolean) {
        if (pluginDescriptor.pluginId != SonderrPlugin.id) return
        log.info("Shutting down Sonderr backend for plugin unload (isUpdate=$isUpdate)")
        service<SonderrBackendAppService>().shutdownForUnload()
    }
}
