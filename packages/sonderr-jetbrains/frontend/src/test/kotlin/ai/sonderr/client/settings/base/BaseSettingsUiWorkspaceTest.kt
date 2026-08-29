package ai.sonderr.client.settings.base

import ai.sonderr.client.util.edtWait
import ai.sonderr.client.app.SonderrAppService
import ai.sonderr.client.app.SonderrWorkspaceService
import ai.sonderr.client.testing.FakeAppRpcApi
import ai.sonderr.client.testing.FakeWorkspaceRpcApi
import ai.sonderr.rpc.dto.ConfigDto
import ai.sonderr.rpc.dto.SonderrAppStateDto
import ai.sonderr.rpc.dto.SonderrAppStatusDto
import ai.sonderr.rpc.dto.ModelSelectionDto
import ai.sonderr.rpc.dto.ModelStateDto
import com.intellij.openapi.application.ApplicationManager
import com.intellij.testFramework.fixtures.BasePlatformTestCase
import com.intellij.util.ui.UIUtil
import java.util.concurrent.CopyOnWriteArrayList
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking

class BaseSettingsUiWorkspaceTest : BasePlatformTestCase() {
    private lateinit var appScope: CoroutineScope
    private lateinit var uiScope: CoroutineScope
    private lateinit var rpc: FakeAppRpcApi
    private lateinit var workspaceRpc: FakeWorkspaceRpcApi
    private lateinit var app: SonderrAppService
    private lateinit var workspaces: SonderrWorkspaceService
    private var panel: FakePanel? = null

    override fun setUp() {
        super.setUp()
        appScope = CoroutineScope(SupervisorJob())
        uiScope = CoroutineScope(SupervisorJob())
        rpc = FakeAppRpcApi()
        workspaceRpc = FakeWorkspaceRpcApi()
        app = SonderrAppService(appScope, rpc)
        workspaces = SonderrWorkspaceService(appScope, workspaceRpc)
    }

    override fun tearDown() {
        try {
            val view = panel
            if (view != null) edt { view.dispose() }
            panel = null
            uiScope.cancel()
            appScope.cancel()
        } finally {
            super.tearDown()
        }
    }

    fun `test startup accepts ready app state and loads resolved workspace`() {
        rpc.state.value = state("new")
        workspaceRpc.directory = "/resolved"
        val view = create("/hint")

        flushUntil { edt { view.value() == "new" && view.roots == listOf("/resolved") && view.loaded() } }

        edt {
            assertEquals("new", view.value())
            assertEquals("/resolved", view.dir())
            assertTrue(view.loaded())
            assertFalse(view.loading())
            assertFalse(view.loadOnEdt)
        }
    }

    fun `test non ready app state calls unavailable hook`() {
        rpc.state.value = state("ready")
        val view = create("/test")
        flushUntil { edt { view.value() == "ready" } }
        val before = edt { view.unavailable }

        rpc.state.value = SonderrAppStateDto(SonderrAppStatusDto.DISCONNECTED)
        flushUntil { edt { view.unavailable > before } }

        edt { assertFalse(view.loading()) }
    }

    fun `test model state updates are delivered on edt`() {
        rpc.models = ModelStateDto(favorite = listOf(ModelSelectionDto("sonderr", "new")))
        rpc.state.value = state("ready")
        val view = create("/test")

        flushUntil { edt { view.favoriteCount == 1 } }

        edt {
            assertEquals(1, view.favoriteCount)
            assertTrue(view.modelsOnEdt)
        }
    }

    private fun create(hint: String): FakePanel {
        val view = edt { FakePanel(uiScope, app, workspaces, hint) }
        panel = view
        return view
    }

    private fun state(model: String) = SonderrAppStateDto(
        SonderrAppStatusDto.READY,
        config = ConfigDto(model = model),
    )

    private fun <T> edt(block: () -> T): T = edtWait(block)

    private fun flushUntil(done: () -> Boolean) = runBlocking {
        repeat(20) {
            delay(100)
            edt { UIUtil.dispatchAllInvocationEvents() }
            if (done()) return@runBlocking
        }
        edt { UIUtil.dispatchAllInvocationEvents() }
        assertTrue(done())
    }

    private data class Draft(val value: String)
    private data class Change(val value: String)

    private class FakeContent : BaseContentPanel()

    private class FakePanel(
        cs: CoroutineScope,
        app: SonderrAppService,
        workspaces: SonderrWorkspaceService,
        hint: String,
    ) : BaseSettingsUi<FakeContent, Draft, Change, Draft, String>(
        cs,
        Draft("old"),
        app,
        workspaces,
        hint,
    ) {
        val roots = CopyOnWriteArrayList<String>()
        var unavailable = 0
            private set
        var favoriteCount = 0
            private set
        var loadOnEdt = true
            private set
        var modelsOnEdt = false
            private set

        init {
            startSettings(FakeContent())
        }

        fun value(): String = draft.value

        fun dir(): String? = projectDirectory

        fun loading(): Boolean = workspaceLoading

        fun loaded(): Boolean = workspaceLoaded

        override fun change(from: Draft, to: Draft): Change? = if (from == to) null else Change(to.value)

        override fun save(change: Change, done: (Draft?) -> Unit) = done(Draft(change.value))

        override fun base(result: Draft): Draft = result

        override fun draft(state: SonderrAppStateDto): Draft = Draft(state.config?.model ?: "none")

        override suspend fun loadWorkspace(root: String): String {
            loadOnEdt = ApplicationManager.getApplication().isDispatchThread
            roots += root
            return root
        }

        override fun applyWorkspace(result: String) = Unit

        override fun unavailable(state: SonderrAppStateDto) {
            unavailable++
        }

        override fun models(state: ModelStateDto) {
            favoriteCount = state.favorite.size
            modelsOnEdt = ApplicationManager.getApplication().isDispatchThread
        }

        override fun syncContent() = Unit

        override fun pendingText(): String = "Saving"

        override fun failedText(): String = "Failed"
    }
}
