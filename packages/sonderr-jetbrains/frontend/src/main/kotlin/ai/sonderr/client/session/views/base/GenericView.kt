package ai.sonderr.client.session.views.base

import ai.sonderr.client.session.model.Content
import ai.sonderr.client.session.model.Generic
import ai.sonderr.client.session.ui.style.SessionEditorStyle
import ai.sonderr.client.session.ui.style.SessionUiStyle
import ai.sonderr.client.ui.UiStyle
import com.intellij.ui.components.JBLabel

/**
 * Fallback renderer for part types that have no dedicated view.
 *
 * Rather than silently dropping unknown content (which could lead to
 * confusing empty gaps), this shows a dim label with the raw type name.
 * This makes it easy to spot new part types that need a proper renderer.
 */
class GenericView private constructor(
    content: Generic,
    private val label: JBLabel,
) : AbstractSessionPartView(label, JBLabel()) {

    constructor(content: Generic) : this(content, JBLabel("[${content.type}]"))

    override val contentId: String = content.id

    init {
        label.foreground = SessionUiStyle.Text.Secondary.foreground()
        applyStyle(SessionEditorStyle.current())
        syncExpandable(false)
        border = null
    }

    override fun update(content: Content) {}  // generic content has no updatable state

    /** Exposed for tests. */
    fun labelText(): String = label.text

    override fun applyStyle(style: SessionEditorStyle) {
        if (label.font == style.smallFont) return
        label.font = style.smallFont
        revalidate()
        repaint()
    }

    override fun dumpLabel() = "GenericView#$contentId(${label.text})"
}
