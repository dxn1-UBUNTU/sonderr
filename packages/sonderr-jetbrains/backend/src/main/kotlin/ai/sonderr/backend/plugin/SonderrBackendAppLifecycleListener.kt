package ai.sonderr.backend.plugin

import ai.sonderr.backend.app.SonderrBackendAppService
import ai.sonderr.log.SonderrLog
import com.intellij.ide.AppLifecycleListener
import com.intellij.openapi.components.serviceIfCreated

class SonderrBackendAppLifecycleListener : AppLifecycleListener {
    private val log = SonderrLog.create(SonderrBackendAppLifecycleListener::class.java)

    override fun appWillBeClosed(isRestart: Boolean) {
        log.info("appWillBeClosed(isRestart=$isRestart) — stopping Sonderr CLI")
        runCatching {
            serviceIfCreated<SonderrBackendAppService>()?.shutdownForAppClose()
        }.onFailure { log.warn("Failed to stop CLI on app close", it) }
    }
}
