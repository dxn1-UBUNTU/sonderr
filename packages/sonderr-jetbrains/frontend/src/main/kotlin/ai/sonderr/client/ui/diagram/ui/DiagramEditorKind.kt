package ai.sonderr.client.ui.diagram.ui

import ai.sonderr.client.plugin.SonderrBundle
import ai.sonderr.client.ui.CodeViewField
import ai.sonderr.client.ui.codeViewScroll
import ai.sonderr.client.ui.md.hybrid.MdLanguage
import ai.sonderr.client.vfs.SonderrEditorKind
import ai.sonderr.client.vfs.SonderrEditorKindRegistry
import ai.sonderr.client.vfs.SonderrEditorView
import ai.sonderr.client.vfs.SonderrVfsManager
import ai.sonderr.client.vfs.SonderrVirtualFile
import com.intellij.ide.DataManager
import com.intellij.openapi.Disposable
import com.intellij.openapi.actionSystem.CommonDataKeys
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.service
import com.intellij.openapi.editor.EditorFactory
import com.intellij.openapi.fileTypes.FileType
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import com.intellij.ui.components.JBLabel
import com.intellij.ui.components.JBScrollPane
import com.intellij.util.concurrency.annotations.RequiresEdt
import com.intellij.util.ui.Centerizer
import java.security.MessageDigest
import java.util.Collections
import javax.swing.JComponent

private const val TOKEN = "token"

/**
 * Hands the mermaid source of an "Open in Editor" click to the editor that opens for it.
 *
 * Application level because [SonderrEditorKind.isValid] has no project and the fence text is not
 * project scoped. Bounded by a small access-ordered LRU so the sources of long-closed tabs are not
 * retained for the IDE session's lifetime. The token is a content hash, so reopening the same
 * diagram resolves to the same virtual file and therefore reuses its tab.
 */
@Service(Service.Level.APP)
internal class DiagramStore {
    private val items = Collections.synchronizedMap(
        object : LinkedHashMap<String, String>(16, 0.75f, true) {
            override fun removeEldestEntry(eldest: Map.Entry<String, String>): Boolean = size > MAX
        },
    )

    fun put(source: String): String = token(source).also { items[it] = source }

    fun get(token: String): String? = items[token]

    private companion object {
        const val MAX = 32
    }
}

private fun token(source: String): String {
    val bytes = MessageDigest.getInstance("SHA-256").digest(source.toByteArray(Charsets.UTF_8))
    return bytes.take(16).joinToString("") { "%02x".format(it) }
}

private fun source(params: Map<String, String>): String? {
    val token = params[TOKEN]?.takeIf { it.isNotBlank() } ?: return null
    return service<DiagramStore>().get(token)
}

private fun mmd(): FileType = MdLanguage.type("mmd")

/**
 * Diagram editor tab: the rendered diagram plus a read-only view of its mermaid source.
 *
 * The source view is a second [SonderrEditorView], so the platform composes both into one tab with a
 * bottom tab strip (see `EditorComposite`) instead of us hand-rolling a toggle.
 */
internal object DiagramEditorKind : SonderrEditorKind {
    const val ID = "diagram"

    override val id: String = ID

    override fun title(params: Map<String, String>): String = SonderrBundle.message("diagram.title")

    // No fileType override on purpose: the tab file must stay binary (see SonderrVirtualFileKind.fileType).
    // The mermaid type is only used for highlighting the source view below.

    override fun presentablePath(params: Map<String, String>): String =
        SonderrBundle.message("diagram.path", params[TOKEN].orEmpty())

    override fun isValid(params: Map<String, String>): Boolean = source(params) != null

    override val source: SonderrEditorView get() = DiagramSourceView

    @RequiresEdt
    override fun createContent(project: Project, file: SonderrVirtualFile, parent: Disposable): JComponent {
        val text = source(file.path.params) ?: return center(SonderrBundle.message("diagram.missing"))
        return diagramContent(text, parent)
    }
}

private object DiagramSourceView : SonderrEditorView {
    override fun title(params: Map<String, String>): String = SonderrBundle.message("diagram.source")

    @RequiresEdt
    override fun createContent(project: Project, file: SonderrVirtualFile, parent: Disposable): JComponent {
        val text = source(file.path.params) ?: return center(SonderrBundle.message("diagram.missing"))
        val field = CodeViewField(text, mmd(), editable = false)
        Disposer.register(parent) {
            field.editor?.let(EditorFactory.getInstance()::releaseEditor)
        }
        return codeViewScroll(field)
    }

    // Stateless on purpose: this view is a singleton shared by every open diagram tab.
    override fun preferredFocus(component: JComponent): JComponent? =
        (component as? JBScrollPane)?.viewport?.view as? JComponent
}

private fun center(text: String): JComponent = Centerizer(JBLabel(text))

fun ensureDiagramEditorKind() {
    service<SonderrEditorKindRegistry>().register(DiagramEditorKind)
}

internal fun unregisterDiagramEditorKind() {
    service<SonderrEditorKindRegistry>().unregister(DiagramEditorKind.ID)
}

/**
 * Opens the mermaid source of a rendered diagram as an editor tab.
 *
 * Routed through the Sonderr virtual file system, the same way session attachments open, so the tab is
 * identified by content and reuses the shared editor-kind plumbing.
 */
@RequiresEdt
internal fun openDiagram(anchor: JComponent, source: String): Boolean {
    val ctx = DataManager.getInstance().getDataContext(anchor)
    val project = CommonDataKeys.PROJECT.getData(ctx) ?: return false
    ensureDiagramEditorKind()
    val token = service<DiagramStore>().put(source)
    return project.service<SonderrVfsManager>().open(DiagramEditorKind.ID, mapOf(TOKEN to token))
}
