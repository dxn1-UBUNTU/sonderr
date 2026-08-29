package ai.sonderr.client.session.subagent

import ai.sonderr.client.plugin.SonderrBundle
import ai.sonderr.client.vfs.SonderrEditorKindRegistry
import ai.sonderr.client.vfs.SonderrPath
import ai.sonderr.client.vfs.SonderrVirtualFileKindRegistry
import ai.sonderr.client.vfs.SonderrVirtualFileSystem
import com.intellij.openapi.components.service
import com.intellij.openapi.fileTypes.FileTypes
import com.intellij.openapi.vfs.VirtualFilePathWrapper
import com.intellij.testFramework.fixtures.BasePlatformTestCase

class SubagentSessionEditorKindTest : BasePlatformTestCase() {
    override fun tearDown() {
        try {
            service<SubagentTitleCache>().clear()
        } finally {
            super.tearDown()
        }
    }

    fun testSubagentSessionParamsUseStableIdentityFields() {
        val params = subagentSessionParams("ses_child", "/repo")
        val path = SonderrPath(SubagentSessionEditorKind.ID, params).canonical()
        val json = SonderrVirtualFileSystem.getInstance().getPath(path)
        val decoded = SonderrVirtualFileSystem.decode(json)

        assertEquals(path, decoded)
        assertEquals(SubagentSessionEditorKind.ID, path.kind)
        assertEquals("ses_child", params["sessionId"])
        assertEquals("/repo", params["directory"])
        assertFalse(json.contains("title", ignoreCase = true))
    }

    fun testSubagentSessionKindCreatesVirtualFile() {
        ensureSubagentSessionEditorKind()
        val fs = SonderrVirtualFileSystem.getInstance()
        val path = SonderrPath(SubagentSessionEditorKind.ID, subagentSessionParams("ses_child", "/repo"))
        val file = fs.findOrCreateFile(path)

        assertNotNull(file)
        assertSame(FileTypes.UNKNOWN, file!!.fileType)
        assertNotNull(SubagentSessionEditorKind.icon(path.params))
        assertEquals(SonderrBundle.message("session.subagent.title"), file.name)
        assertEquals(SonderrBundle.message("session.subagent.path", "ses_child"), (file as VirtualFilePathWrapper).presentablePath)
        assertNotNull(service<SonderrEditorKindRegistry>().get(SubagentSessionEditorKind.ID))
        assertNotNull(service<SonderrVirtualFileKindRegistry>().get(SubagentSessionEditorKind.ID))

        unregisterSubagentSessionEditorKind()
        fs.clear()

        assertNull(service<SonderrEditorKindRegistry>().get(SubagentSessionEditorKind.ID))
        assertNull(service<SonderrVirtualFileKindRegistry>().get(SubagentSessionEditorKind.ID))
        assertNull(fs.findOrCreateFile(path))
    }

    fun testSubagentSessionTitleUsesCache() {
        service<SubagentTitleCache>().put("ses_child", "Explore Agent - Find files")

        assertEquals("Explore Agent - Find files", SubagentSessionEditorKind.title(subagentSessionParams("ses_child", "/repo")))
    }

    fun testSubagentSessionTitleFallsBack() {
        assertEquals(SonderrBundle.message("session.subagent.title"), SubagentSessionEditorKind.title(subagentSessionParams("ses_child", "/repo")))
    }

    fun testSubagentTitleCacheEvictsLeastRecentlyUsed() {
        val cache = service<SubagentTitleCache>()
        repeat(200) { cache.put("ses_$it", "Title $it") }

        // Oldest untouched entries are evicted; recent ones survive.
        assertNull(cache.title("ses_0"))
        assertEquals("Title 199", cache.title("ses_199"))
    }

    fun testSubagentSessionKindRequiresSessionAndDirectory() {
        assertFalse(SubagentSessionEditorKind.isValid(subagentSessionParams("", "/repo")))
        assertFalse(SubagentSessionEditorKind.isValid(subagentSessionParams("ses_child", "")))
        assertTrue(SubagentSessionEditorKind.isValid(subagentSessionParams("ses_child", "/repo")))
    }
}
