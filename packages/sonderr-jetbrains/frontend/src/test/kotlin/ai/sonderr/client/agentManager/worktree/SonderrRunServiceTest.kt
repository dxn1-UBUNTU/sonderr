package ai.sonderr.client.agentManager.worktree

import ai.sonderr.client.testing.FakeRunRpcApi
import ai.sonderr.client.testing.TestCoroutines
import ai.sonderr.client.testing.pumpEdt
import ai.sonderr.rpc.dto.RunResultDto
import com.intellij.testFramework.fixtures.BasePlatformTestCase
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import java.util.concurrent.atomic.AtomicReference

class SonderrRunServiceTest : BasePlatformTestCase() {
    private lateinit var coroutines: TestCoroutines
    private lateinit var rpc: FakeRunRpcApi
    private lateinit var service: SonderrRunService

    override fun setUp() {
        super.setUp()
        coroutines = TestCoroutines()
        rpc = FakeRunRpcApi()
        service = SonderrRunService(coroutines.scope, rpc)
    }

    override fun tearDown() {
        try {
            coroutines.close(::pumpEdt)
        } finally {
            super.tearDown()
        }
    }

    fun `test backend failure maps to an error result instead of propagating`() {
        rpc.fail = RuntimeException("boom")
        val run = AtomicReference<RunResultDto>()
        val build = AtomicReference<RunResultDto>()
        val stop = AtomicReference<Boolean>()
        coroutines.scope.launch { run.set(service.run(ROOT, "id", WT)) }
        coroutines.scope.launch { build.set(service.build(ROOT, WT, clean = false)) }
        coroutines.scope.launch { stop.set(service.stop(ROOT, "id", WT)) }

        assertTrue(coroutines.pumpUntil { run.get() != null && build.get() != null && stop.get() != null })
        assertEquals("boom", run.get().error)
        assertEquals("boom", build.get().error)
        assertEquals(false, stop.get())
    }

    fun `test cancellation is rethrown, not swallowed into a result`() {
        rpc.fail = CancellationException("cancelled")
        val cancelled = AtomicReference(false)
        val result = AtomicReference<RunResultDto>()
        coroutines.scope.launch {
            try {
                result.set(service.run(ROOT, "id", WT))
            } catch (e: CancellationException) {
                cancelled.set(true)
            }
        }

        assertTrue(coroutines.pumpUntil { cancelled.get() })
        assertNull(result.get())
    }

    private companion object {
        private const val ROOT = "/real/repo"
        private const val WT = "$ROOT/.sonderr/worktrees/feature"
    }
}
