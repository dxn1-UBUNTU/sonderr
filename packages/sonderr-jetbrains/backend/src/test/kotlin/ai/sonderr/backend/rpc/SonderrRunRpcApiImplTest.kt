package ai.sonderr.backend.rpc

import com.intellij.testFramework.fixtures.BasePlatformTestCase
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking

class SonderrRunRpcApiImplTest : BasePlatformTestCase() {
    fun testResolvesProjectByDirectory() = runBlocking {
        val api = SonderrRunRpcApiImpl()
        val dir = requireNotNull(project.basePath)
        assertNull(api.configs(dir).error)
        // A trailing slash must resolve the same project the workspace API would.
        assertNull(api.configs("$dir/").error)
        assertNotNull(api.configs("/sonderr/definitely/missing").error)
        assertNotNull(api.run("/sonderr/definitely/missing", "id", "/wt").error)
        assertNotNull(api.build("/sonderr/definitely/missing", "/wt", false).error)
        assertFalse(api.stop("/sonderr/definitely/missing", "id", "/wt"))
        assertFalse(api.focus("/sonderr/definitely/missing", "id", "/wt"))
        assertFalse(api.release("/sonderr/definitely/missing", "/wt"))
        // States for an unresolved project degrade to an empty list instead of failing the stream.
        assertTrue(api.states("/sonderr/definitely/missing").first().isEmpty())
    }
}
