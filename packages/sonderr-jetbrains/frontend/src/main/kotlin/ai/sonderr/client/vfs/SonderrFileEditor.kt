package ai.sonderr.client.vfs

import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.util.concurrency.annotations.RequiresEdt
import javax.swing.JComponent

class SonderrFileEditor(
    private val project: Project,
    private val file: VirtualFile,
    private val sonderr: SonderrVirtualFile,
    private val view: SonderrEditorView,
) : SonderrFileEditorBase() {
    private val ui: JComponent by lazy { view.createContent(project, sonderr, this) }

    @RequiresEdt
    override fun getComponent(): JComponent = ui

    override fun getPreferredFocusedComponent(): JComponent? = view.preferredFocus(ui)
    override fun getName(): String = view.title(sonderr.path.params)
    override fun getFile(): VirtualFile = file
    override fun isValid(): Boolean = super.isValid() && sonderr.isValid

    override fun dispose() {
        SonderrVirtualFileSystem.getInstance().release(sonderr.path)
        super.dispose()
    }
}
