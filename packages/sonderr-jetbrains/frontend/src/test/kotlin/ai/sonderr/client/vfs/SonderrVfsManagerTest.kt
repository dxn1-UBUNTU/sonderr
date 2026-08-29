package ai.sonderr.client.vfs

import ai.sonderr.client.util.edtWait
import com.intellij.openapi.Disposable
import com.intellij.openapi.components.service
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.project.Project
import com.intellij.testFramework.fixtures.BasePlatformTestCase
import com.intellij.util.ui.components.BorderLayoutPanel
import javax.swing.JComponent

@Suppress("UnstableApiUsage")
class SonderrVfsManagerTest : BasePlatformTestCase() {
    private val kind = "test-close"

    override fun setUp() {
        super.setUp()
        service<SonderrEditorKindRegistry>().register(TestKind)
    }

    override fun tearDown() {
        try {
            service<SonderrEditorKindRegistry>().unregister(kind)
            SonderrVirtualFileSystem.getInstance().clear()
        } finally {
            super.tearDown()
        }
    }

    fun `test close closes the open editor and releases the cache`() {
        val params = mapOf("path" to "/repo/wt")
        val vfs = project.service<SonderrVfsManager>()
        val manager = FileEditorManager.getInstance(project)

        edtWait { assertTrue(vfs.open(kind, params)) }
        assertTrue(manager.openFiles.any { it is SonderrVirtualFile })

        edtWait { vfs.close(kind, params) }

        assertTrue(manager.openFiles.none { it is SonderrVirtualFile })
        assertNull(SonderrVirtualFileSystem.getInstance().cached(SonderrPath(kind, params)))
    }

    fun `test close matches by canonical params after the cache was released`() {
        // Two params so canonicalization sorts them; open and close use different insertion orders.
        val opened = linkedMapOf("path" to "/repo/wt", "extra" to "1")
        val closed = linkedMapOf("extra" to "1", "path" to "/repo/wt")
        val vfs = project.service<SonderrVfsManager>()
        val manager = FileEditorManager.getInstance(project)

        edtWait { assertTrue(vfs.open(kind, opened)) }
        assertTrue(manager.openFiles.any { it is SonderrVirtualFile })

        // Drop the VFS cache entry so close() must fall back to scanning the open editors.
        SonderrVirtualFileSystem.getInstance().release(SonderrPath(kind, opened))
        assertNull(SonderrVirtualFileSystem.getInstance().cached(SonderrPath(kind, opened)))

        edtWait { vfs.close(kind, closed) }

        assertTrue(manager.openFiles.none { it is SonderrVirtualFile })
    }

    private object TestKind : SonderrEditorKind {
        override val id: String = "test-close"

        override fun title(params: Map<String, String>): String = "Test"

        override fun createContent(project: Project, file: SonderrVirtualFile, parent: Disposable): JComponent =
            BorderLayoutPanel()
    }
}
