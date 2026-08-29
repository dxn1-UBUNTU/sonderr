package ai.sonderr.client.session.subagent

import ai.sonderr.client.app.SonderrAppService
import ai.sonderr.client.app.SonderrSessionService
import ai.sonderr.client.app.SonderrWorkspaceService
import ai.sonderr.client.session.SessionActivityKind
import ai.sonderr.client.session.SessionUi
import ai.sonderr.client.testing.FakeAppRpcApi
import ai.sonderr.client.testing.FakeSessionRpcApi
import ai.sonderr.client.testing.FakeWorkspaceRpcApi
import ai.sonderr.client.testing.TestCoroutines
import ai.sonderr.client.util.UiTimers
import ai.sonderr.rpc.dto.SonderrAppStateDto
import ai.sonderr.rpc.dto.SonderrAppStatusDto
import ai.sonderr.rpc.dto.SonderrWorkspaceStateDto
import ai.sonderr.rpc.dto.SonderrWorkspaceStatusDto
import com.intellij.testFramework.fixtures.BasePlatformTestCase

class SubagentSessionEditorHostTest : BasePlatformTestCase() {
    private lateinit var coroutines: TestCoroutines

    override fun setUp() {
        super.setUp()
        coroutines = TestCoroutines()
    }

    override fun tearDown() {
        try {
            coroutines.close()
        } finally {
            super.tearDown()
        }
    }

    fun testSubagentHostCapabilities() {
        val host = host()

        assertTrue(host.readonly)
        assertTrue(host.hostedInEditorTab)
        assertFalse(host.showsBranchDock)
    }

    fun testOpenPresentsSessionUi() {
        val host = host()

        host.open("ses_child")
        coroutines.drain()

        assertTrue(host.component.components.any { it is SessionUi })
        assertNotNull(host.currentFocus())
    }

    fun testNewSessionAndHistoryAreNoOps() {
        val host = host()

        host.newSession()
        host.showHistory()

        assertEquals(0, host.component.componentCount)
    }

    private fun host(): SubagentSessionEditorHost {
        val sessions = SonderrSessionService(project, coroutines.scope, FakeSessionRpcApi())
        val app = SonderrAppService(coroutines.scope, FakeAppRpcApi().also {
            it.state.value = SonderrAppStateDto(SonderrAppStatusDto.READY)
        })
        val workspaces = SonderrWorkspaceService(coroutines.scope, FakeWorkspaceRpcApi().also {
            it.state.value = SonderrWorkspaceStateDto(SonderrWorkspaceStatusDto.READY)
        })
        val workspace = workspaces.workspace("/test")
        return SubagentSessionEditorHost(
            parent = testRootDisposable,
            project = project,
            workspace = workspace,
            create = { project, workspace, manager, ref, timers ->
                SessionUi(
                    project = project,
                    workspace = workspace,
                    sessions = sessions,
                    app = app,
                    cs = coroutines.scope,
                    ref = ref,
                    manager = manager,
                    workspaces = workspaces,
                    timers = timers,
                )
            },
            status = { emptyMap<String, SessionActivityKind>() },
            timers = UiTimers,
            request = {},
        )
    }
}
