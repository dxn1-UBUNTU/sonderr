package ai.sonderr.client.agentManager

import ai.sonderr.client.agentManager.worktree.PendingWorktreeSession
import ai.sonderr.client.agentManager.worktree.WorktreeSessionEditorKind
import ai.sonderr.client.agentManager.worktree.WorktreeSessionFileType
import ai.sonderr.client.agentManager.worktree.WorktreeNameCache
import ai.sonderr.client.agentManager.worktree.ensureWorktreeSessionEditorKind
import ai.sonderr.client.agentManager.worktree.unregisterWorktreeSessionEditorKind
import ai.sonderr.client.agentManager.worktree.worktreeSessionParams
import ai.sonderr.client.vfs.SonderrEditorKindRegistry
import ai.sonderr.client.vfs.SonderrPath
import ai.sonderr.client.vfs.SonderrVirtualFileKindRegistry
import ai.sonderr.client.vfs.SonderrVirtualFileSystem
import ai.sonderr.rpc.dto.GhState
import ai.sonderr.rpc.dto.WorktreePrDto
import ai.sonderr.rpc.dto.WorktreeDto
import com.intellij.openapi.components.service
import com.intellij.openapi.vfs.VirtualFilePathWrapper
import com.intellij.testFramework.fixtures.BasePlatformTestCase

class WorktreeSessionEditorKindTest : BasePlatformTestCase() {
    override fun tearDown() {
        try {
            service<WorktreeNameCache>().clear()
        } finally {
            super.tearDown()
        }
    }

    fun `test worktree session params use only the worktree path`() {
        val item = WorktreeDto("/repo/.sonderr/worktrees/feature-x", "feature-x", "feature/x", "/repo/.sonderr/worktrees/feature-x")
        val params = worktreeSessionParams(item)

        assertEquals(mapOf("path" to item.path), params)
    }

    fun `test a moved session is queued out of band so the tab identity stays the path`() {
        val item = WorktreeDto("/repo/.sonderr/worktrees/feature-x", "feature-x", "feature/x", "/repo/.sonderr/worktrees/feature-x")
        service<PendingWorktreeSession>().put(item.path, "ses_fork")

        // The queued session must not leak into the editor identity, or Agent Manager's path-only
        // open/close/rename would address a different file than the tab a move produced.
        assertEquals(mapOf("path" to item.path), worktreeSessionParams(item))
        // Keyed by normalized path, and consumed once so a later open starts a fresh session.
        assertEquals("ses_fork", service<PendingWorktreeSession>().take(item.path + "/"))
        assertNull(service<PendingWorktreeSession>().take(item.path))
    }

    fun `test worktree session kind creates a custom virtual file type`() {
        ensureWorktreeSessionEditorKind()
        val fs = SonderrVirtualFileSystem.getInstance()
        val path = SonderrPath(WorktreeSessionEditorKind.ID, mapOf("path" to "/repo/.sonderr/worktrees/feature-x"))
        val file = fs.findOrCreateFile(path)

        assertNotNull(file)
        assertSame(WorktreeSessionFileType, file!!.fileType)
        assertEquals("feature-x", file.name)
        assertEquals("/repo/.sonderr/worktrees/feature-x", (file as VirtualFilePathWrapper).presentablePath)
        assertNotNull(service<SonderrEditorKindRegistry>().get(WorktreeSessionEditorKind.ID))
        assertNotNull(service<SonderrVirtualFileKindRegistry>().get(WorktreeSessionEditorKind.ID))

        unregisterWorktreeSessionEditorKind()
        fs.clear()

        assertNull(service<SonderrEditorKindRegistry>().get(WorktreeSessionEditorKind.ID))
        assertNull(service<SonderrVirtualFileKindRegistry>().get(WorktreeSessionEditorKind.ID))
        assertNull(fs.findOrCreateFile(path))
    }

    fun `test worktree session title uses cached label`() {
        val path = "/repo/.sonderr/worktrees/feature-x"
        service<WorktreeNameCache>().put(path, "Feature Label")

        assertEquals("Feature Label", WorktreeSessionEditorKind.title(mapOf("path" to path)))
    }

    fun `test worktree session title uses same winning label as worktree list`() {
        val path = "/repo/.sonderr/worktrees/feature-x"
        service<WorktreeNameCache>().put(path, "Feature Label")
        service<WorktreeNameCache>().putPr(path, WorktreePrDto(path, 3, GhState.OPEN, "https://example.test/pr/3", "PR Label"))

        assertEquals("PR Label", WorktreeSessionEditorKind.title(mapOf("path" to path)))
    }
}
