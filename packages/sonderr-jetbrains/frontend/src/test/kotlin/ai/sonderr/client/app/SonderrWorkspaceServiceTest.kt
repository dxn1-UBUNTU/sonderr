package ai.sonderr.client.app

import ai.sonderr.client.testing.FakeWorkspaceRpcApi
import ai.sonderr.rpc.dto.WorkspaceFileDto
import com.intellij.testFramework.fixtures.BasePlatformTestCase
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withContext

@Suppress("UnstableApiUsage")
class SonderrWorkspaceServiceTest : BasePlatformTestCase() {
    private lateinit var scope: CoroutineScope
    private lateinit var rpc: FakeWorkspaceRpcApi
    private lateinit var service: SonderrWorkspaceService

    override fun setUp() {
        super.setUp()
        scope = CoroutineScope(SupervisorJob())
        rpc = FakeWorkspaceRpcApi()
        service = SonderrWorkspaceService(scope, rpc)
    }

    override fun tearDown() {
        try {
            scope.cancel()
        } finally {
            super.tearDown()
        }
    }

    fun `test openPath opens first file match`() = runBlocking {
        rpc.fileMatches = listOf(
            WorkspaceFileDto("/test/.sonderr/plans/a.md", "a.md"),
            WorkspaceFileDto("/other/.sonderr/plans/a.md", "a.md"),
        )

        val ok = withContext(Dispatchers.Default) {
            service.openPath("/test", ".sonderr/plans/a.md")
        }

        assertTrue(ok)
        assertEquals(listOf("/test" to ".sonderr/plans/a.md"), rpc.fileCalls)
        assertEquals(listOf("/test/.sonderr/plans/a.md"), rpc.opened)
    }

    fun `test openPath passes line and column to backend`() = runBlocking {
        rpc.fileMatches = listOf(WorkspaceFileDto("/test/src/Foo.kt", "Foo.kt"))

        val ok = withContext(Dispatchers.Default) {
            service.openPath("/test", "src/Foo.kt", line = 12, column = 3)
        }

        assertTrue(ok)
        assertEquals(listOf(FakeWorkspaceRpcApi.Opened("/test/src/Foo.kt", 12, 3)), rpc.openedFiles)
    }

    fun `test openPath returns false when no match exists`() = runBlocking {
        val ok = withContext(Dispatchers.Default) {
            service.openPath("/test", ".sonderr/plans/missing.md")
        }

        assertFalse(ok)
        assertEquals(listOf("/test" to ".sonderr/plans/missing.md"), rpc.fileCalls)
        assertTrue(rpc.opened.isEmpty())
    }

    fun `test openPath returns false when backend open fails`() = runBlocking {
        rpc.fileMatches = listOf(WorkspaceFileDto("/test/.sonderr/plans/a.md", "a.md"))
        rpc.openResult = false

        val ok = withContext(Dispatchers.Default) {
            service.openPath("/test", ".sonderr/plans/a.md")
        }

        assertFalse(ok)
        assertEquals(listOf("/test/.sonderr/plans/a.md"), rpc.opened)
    }

    fun `test searchFiles rethrows cancellation`() = runBlocking {
        val err = CancellationException("stale completion")
        rpc.search = { throw err }

        val seen = try {
            withContext(Dispatchers.Default) {
                service.searchFiles("/test", "dep")
            }
            fail("expected cancellation")
            null
        } catch (e: CancellationException) {
            e
        }

        assertEquals(err.message, seen?.message)
        assertEquals(listOf("dep"), rpc.searchQueries)
    }

    fun `test refreshConfigFiles logs backend failure and completes`() = runBlocking {
        rpc.refreshConfigThrows = IllegalStateException("backend unavailable")

        val job = service.refreshConfigFiles("/test")
        job.join()

        assertTrue(job.isCompleted)
        assertEquals(listOf("/test"), rpc.refreshedConfigs.toList())
        assertEquals(0, rpc.localConfigPathCalls)
        assertEquals(0, rpc.globalConfigPathCalls)
    }

    fun `test searchFiles sends query to RPC`() = runBlocking {
        withContext(Dispatchers.Default) {
            service.searchFiles("/test", "src")
        }

        assertEquals(listOf("src"), rpc.searchQueries)
    }
}
