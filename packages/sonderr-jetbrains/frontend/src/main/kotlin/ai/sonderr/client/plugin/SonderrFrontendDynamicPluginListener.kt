package ai.sonderr.client.plugin

import ai.sonderr.SonderrPlugin
import ai.sonderr.client.agentManager.worktree.unregisterWorktreeSessionEditorKind
import ai.sonderr.client.session.ui.attachment.unregisterAttachmentEditorKind
import ai.sonderr.client.ui.diagram.ui.DiagramWindows
import ai.sonderr.client.ui.diagram.ui.unregisterDiagramEditorKind
import ai.sonderr.client.vfs.SonderrEditorKindRegistry
import ai.sonderr.client.vfs.SonderrVirtualFileSystem
import ai.sonderr.log.SonderrLog
import com.intellij.ide.plugins.DynamicPluginListener
import com.intellij.ide.plugins.IdeaPluginDescriptor
import com.intellij.openapi.components.service
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.project.ProjectManager
import com.intellij.openapi.wm.ToolWindowManager
import javax.swing.SwingUtilities

class SonderrFrontendDynamicPluginListener : DynamicPluginListener {
    override fun beforePluginUnload(pluginDescriptor: IdeaPluginDescriptor, isUpdate: Boolean) {
        if (pluginDescriptor.pluginId != SonderrPlugin.id) return
        SonderrFrontendUnloadCleanup.cleanup(isUpdate)
    }
}

object SonderrFrontendUnloadCleanup {
    private val log = SonderrLog.create(SonderrFrontendUnloadCleanup::class.java)

    fun cleanup(isUpdate: Boolean) {
        log.info("Cleaning up Sonderr frontend for plugin unload (isUpdate=$isUpdate)")
        runEdt {
            ProjectManager.getInstance().openProjects.forEach { project ->
                if (project.isDisposed) return@forEach
                project.getServiceIfCreated(DiagramWindows::class.java)?.closeAll()
                ToolWindowManager.getInstance(project).getToolWindow("Sonderr")
                    ?.contentManager
                    ?.removeAllContents(true)
                val editors = FileEditorManager.getInstance(project).openFiles
                    .filter { it.fileSystem === SonderrVirtualFileSystem.getInstance() }
                editors.forEach { file -> FileEditorManager.getInstance(project).closeFile(file) }
            }
        }
        unregisterAttachmentEditorKind()
        unregisterWorktreeSessionEditorKind()
        unregisterDiagramEditorKind()
        service<SonderrEditorKindRegistry>().clear()
        SonderrVirtualFileSystem.getInstance().clear()
    }

    private fun runEdt(block: () -> Unit) {
        if (SwingUtilities.isEventDispatchThread()) {
            block()
            return
        }
        SwingUtilities.invokeAndWait(block)
    }
}
