package ai.sonderr.client.vfs

import ai.sonderr.client.agentManager.worktree.ensureWorktreeSessionEditorKind
import ai.sonderr.client.diff.ensureDiffEditorKind
import ai.sonderr.client.session.subagent.ensureSubagentSessionEditorKind
import ai.sonderr.client.session.ui.attachment.ensureAttachmentEditorKind
import ai.sonderr.client.ui.diagram.ui.ensureDiagramEditorKind
import com.intellij.openapi.components.service
import com.intellij.openapi.fileEditor.FileEditor
import com.intellij.openapi.fileEditor.FileEditorPolicy
import com.intellij.openapi.fileEditor.FileEditorProvider
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import com.intellij.openapi.vfs.VirtualFile

class SonderrFileEditorProvider : FileEditorProvider, DumbAware {
    override fun accept(project: Project, file: VirtualFile): Boolean {
        return sonderrKind(file) != null
    }

    override fun acceptRequiresReadAction(): Boolean = false

    override fun createEditor(project: Project, file: VirtualFile): FileEditor {
        ensureSonderrKinds()
        val path = sonderrPath(file) ?: error("Invalid Sonderr virtual file: ${file.path}")
        val sonderr = file as? SonderrVirtualFile ?: SonderrVirtualFile(path)
        val kind = service<SonderrEditorKindRegistry>().get(sonderr.path.kind) ?: error("Unknown Sonderr editor kind: ${sonderr.path.kind}")
        return SonderrFileEditor(project, file, sonderr, kind)
    }

    override fun disposeEditor(editor: FileEditor) {
        Disposer.dispose(editor)
    }

    override fun getEditorTypeId(): String = EDITOR_TYPE_ID
    override fun getPolicy(): FileEditorPolicy = FileEditorPolicy.HIDE_OTHER_EDITORS

    companion object {
        const val EDITOR_TYPE_ID = "SonderrVfsEditor"
    }
}

internal fun sonderrKind(file: VirtualFile): SonderrEditorKind? {
    ensureSonderrKinds()
    val path = sonderrPath(file) ?: return null
    return service<SonderrEditorKindRegistry>().get(path.kind)
}

internal fun sonderrPath(file: VirtualFile): SonderrPath? {
    if (file is SonderrVirtualFile) return file.path
    if (file.fileSystem.protocol != SonderrVirtualFileSystem.PROTOCOL && !file.url.startsWith("${SonderrVirtualFileSystem.PROTOCOL}://")) return null
    return SonderrVirtualFileSystem.decode(file.path) ?: SonderrVirtualFileSystem.decode(file.url)
}

private fun ensureSonderrKinds() {
    ensureAttachmentEditorKind()
    ensureDiffEditorKind()
    ensureSubagentSessionEditorKind()
    ensureWorktreeSessionEditorKind()
    ensureDiagramEditorKind()
}
