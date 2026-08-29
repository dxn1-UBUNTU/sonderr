package ai.sonderr.client.vfs

import com.intellij.openapi.Disposable
import com.intellij.openapi.project.Project
import com.intellij.util.concurrency.annotations.RequiresEdt
import javax.swing.JComponent

interface SonderrEditorView {
    fun title(params: Map<String, String>): String

    @RequiresEdt
    fun createContent(project: Project, file: SonderrVirtualFile, parent: Disposable): JComponent

    fun preferredFocus(component: JComponent): JComponent? = null
}

interface SonderrEditorKind : SonderrVirtualFileKind, SonderrEditorView {
    val source: SonderrEditorView? get() = null
}
