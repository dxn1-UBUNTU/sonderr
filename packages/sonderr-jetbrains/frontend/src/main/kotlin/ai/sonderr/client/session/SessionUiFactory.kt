package ai.sonderr.client.session

import ai.sonderr.client.app.SonderrAppService
import ai.sonderr.client.app.SonderrSessionService
import ai.sonderr.client.app.Workspace
import ai.sonderr.client.util.UiTimerSource
import ai.sonderr.client.util.UiTimers
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.service
import com.intellij.openapi.project.Project
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob

@Service(Service.Level.APP)
class SessionUiFactory(
    private val cs: CoroutineScope,
) {
    fun create(
        project: Project,
        workspace: Workspace,
        manager: SessionManager,
        ref: SessionRef? = null,
        timers: UiTimerSource = UiTimers,
    ): SessionUi = SessionUi(
        project = project,
        workspace = workspace,
        sessions = project.service<SonderrSessionService>(),
        app = service<SonderrAppService>(),
        cs = scope(),
        ref = ref,
        manager = manager,
        timers = timers,
    )

    fun scope(): CoroutineScope {
        val parent = cs.coroutineContext[Job]
        return CoroutineScope(cs.coroutineContext + SupervisorJob(parent))
    }
}
