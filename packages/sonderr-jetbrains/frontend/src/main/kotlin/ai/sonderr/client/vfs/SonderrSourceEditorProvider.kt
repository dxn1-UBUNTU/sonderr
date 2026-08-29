package ai.sonderr.client.vfs

import com.intellij.openapi.components.service
import com.intellij.openapi.fileEditor.FileEditor
import com.intellij.openapi.fileEditor.FileEditorPolicy
import com.intellij.openapi.fileEditor.FileEditorProvider
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import com.intellij.openapi.vfs.VirtualFile

class SonderrSourceEditorProvider : FileEditorProvider, DumbAware {
    override fun accept(project: Project, file: VirtualFile): Boolean {
        return sonderrKind(file)?.source != null
    }

    override fun acceptRequiresReadAction(): Boolean = false

    override fun createEditor(project: Project, file: VirtualFile): FileEditor {
        val path = sonderrPath(file) ?: error("Invalid Sonderr virtual file: ${file.path}")
        val sonderr = file as? SonderrVirtualFile ?: SonderrVirtualFile(path)
        val kind = service<SonderrEditorKindRegistry>().get(sonderr.path.kind) ?: error("Unknown Sonderr editor kind: ${sonderr.path.kind}")
        val view = kind.source ?: error("Sonderr editor kind has no source view: ${sonderr.path.kind}")
        return SonderrFileEditor(project, file, sonderr, view)
    }

    override fun disposeEditor(editor: FileEditor) {
        Disposer.dispose(editor)
    }

    override fun getEditorTypeId(): String = EDITOR_TYPE_ID
    override fun getPolicy(): FileEditorPolicy = FileEditorPolicy.HIDE_OTHER_EDITORS

    companion object {
        const val EDITOR_TYPE_ID = "SonderrVfsSourceEditor"
    }
}
