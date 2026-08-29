package ai.sonderr.backend.rpc

import ai.sonderr.backend.app.SonderrAppState
import ai.sonderr.backend.app.SonderrBackendAppService
import ai.sonderr.backend.testing.FakeCliServer
import ai.sonderr.backend.testing.MockCliServer
import ai.sonderr.backend.testing.TestLog
import ai.sonderr.rpc.dto.WorkspaceFileDto
import ai.sonderr.rpc.dto.SonderrWorkspaceStatusDto
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeoutOrNull
import java.nio.file.Files
import kotlin.test.AfterTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class SonderrWorkspaceRpcApiImplTest {
    private val mock = MockCliServer()
    private val log = TestLog()
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private val apps = mutableListOf<SonderrBackendAppService>()

    @AfterTest
    fun tearDown() = runBlocking {
        apps.forEach { it.dispose() }
        apps.clear()
        scope.cancel()
        mock.close()
    }

    @Test
    fun `searches files and directories through core`() = runBlocking {
        mock.findFiles = """["src/Main.kt",".sonderr/worktrees/hidden.kt"]"""
        mock.findDirectories = """["src/","docs/"]"""
        val dir = Files.createTempDirectory("sonderr-search")
        try {
            val app = app()

            val result = SonderrWorkspaceRpcApiImpl(app).searchFiles(dir.toString(), "src", 3)

            assertEquals(
                listOf(
                    WorkspaceFileDto("src", "src", directory = true),
                    WorkspaceFileDto("docs", "docs", directory = true),
                    WorkspaceFileDto("src/Main.kt", "Main.kt"),
                ),
                result.files,
            )
            assertEquals(2, mock.requestCount("/find/file"))
            assertTrue(mock.findFilePaths.any { it.contains("type=file") && it.contains("query=src") })
            assertTrue(mock.findFilePaths.any { it.contains("type=directory") && it.contains("query=src") })
        } finally {
            delete(dir)
        }
    }

    @Test
    fun `state maps unsupported workspace`() = runBlocking {
        val app = app()
        val rpc = SonderrWorkspaceRpcApiImpl(app)

        val state = withTimeoutOrNull(15_000) {
            rpc.state("/${'$'}devcontainer.ij/abc@u~run~user~1001~podman~podman.sock/workspaces/project")
                .first { it.status == SonderrWorkspaceStatusDto.UNSUPPORTED }
        }

        assertNotNull(state)
        assertEquals(SonderrWorkspaceStatusDto.UNSUPPORTED, state.status)
        assertEquals("devcontainer_virtual_filesystem", state.error)
    }

    private suspend fun app(): SonderrBackendAppService {
        val app = SonderrBackendAppService.create(scope, FakeCliServer(mock), log).also { apps.add(it) }
        app.connect()
        val state = assertNotNull(
            withTimeoutOrNull(35_000) {
                app.appState.first {
                    it is SonderrAppState.Ready || it is SonderrAppState.Error || it is SonderrAppState.MigrationRequired
                }
            },
            "App startup timed out in ${app.appState.value}; logs=${log.messages}",
        )
        assertIs<SonderrAppState.Ready>(state, "App startup failed; logs=${log.messages}")
        return app
    }

    private fun delete(dir: java.nio.file.Path) {
        Files.walk(dir).use { paths ->
            paths.sorted(Comparator.reverseOrder()).forEach { Files.deleteIfExists(it) }
        }
    }
}
