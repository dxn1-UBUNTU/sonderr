package ai.sonderr.client.session.views

import ai.sonderr.client.plugin.SonderrBundle
import ai.sonderr.client.session.ui.SessionView
import ai.sonderr.client.session.views.base.DialogView
import ai.sonderr.client.session.ui.selection.SessionSelection
import ai.sonderr.client.session.ui.style.SessionEditorStyle
import com.intellij.util.concurrency.annotations.RequiresEdt
import java.awt.Container
import javax.swing.JButton

/**
 * Retained inline view shown at the bottom of the transcript when a session
 * enters [ai.sonderr.client.session.model.SessionState.LoginRequired].
 *
 * Mirrors the anchored placement of [PermissionView] and [question.QuestionView]:
 * it stays as a stable child inside [ai.sonderr.client.session.ui.SessionMessageListPanel]
 * and is toggled visible/hidden via [show]/[hideView].
 */
class LoginRequiredView(
    private val openProfile: () -> Unit,
    private val dismiss: () -> Unit,
    selection: SessionSelection? = null,
    focus: (() -> Unit)? = null,
) : DialogView(selection, focus), SessionView {

    override val sessionViewKind = SessionView.Kind.Default

    private val ID_DISMISS = "dismiss"
    private val ID_OPEN = "open"

    init {
        isOpaque = false
        isVisible = false

        setHeader(SonderrBundle.message("session.login.required.title"))
        setActions(listOf(
            DialogView.Action(ID_DISMISS, SonderrBundle.message("session.login.required.dismiss"), primary = false) { dismiss() },
            DialogView.Action(ID_OPEN, SonderrBundle.message("session.login.required.button"), primary = true) { openProfile() },
        ))
    }

    /** Make the view visible with [message] shown as the description. */
    @RequiresEdt
    fun show(message: String) {
        setDescription(message)
        isVisible = true
        refresh()
    }

    /** Hide the view. */
    @RequiresEdt
    fun hideView() {
        if (!isVisible) return
        isVisible = false
        refresh()
    }

    @RequiresEdt
    override fun applyStyle(style: SessionEditorStyle) {
        super.applyStyle(style)
    }

    // Test helpers — return generic JButton to keep SessionQuestionButton internal
    internal fun openProfileButton() = button(SonderrBundle.message("session.login.required.button"))
    internal fun dismissButton() = button(SonderrBundle.message("session.login.required.dismiss"))

    private fun button(text: String) = buttons(this).first { it.text == text }

    private fun buttons(root: Container): List<JButton> {
        val result = mutableListOf<JButton>()
        if (root is JButton) result.add(root)
        for (child in root.components) {
            if (child is Container) result.addAll(buttons(child))
        }
        return result
    }

}
