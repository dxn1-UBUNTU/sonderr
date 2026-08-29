package ai.sonderr.client.settings.profile

import ai.sonderr.client.plugin.SonderrBundle
import ai.sonderr.client.settings.auth.DeviceOAuthInfo
import ai.sonderr.client.settings.auth.DeviceOAuthPanel
import ai.sonderr.client.settings.auth.DeviceOAuthText
import ai.sonderr.client.ui.UiStyle
import ai.sonderr.client.util.UiTimerSource
import ai.sonderr.client.util.UiTimers
import ai.sonderr.rpc.dto.SonderrAppStatusDto
import com.intellij.openapi.util.IconLoader
import com.intellij.ui.components.JBLabel
import com.intellij.util.concurrency.annotations.RequiresEdt
import com.intellij.util.ui.AsyncProcessIcon
import com.intellij.util.ui.JBUI
import java.awt.BorderLayout
import java.awt.CardLayout
import java.awt.FlowLayout
import java.awt.GridBagConstraints
import java.awt.GridBagLayout
import javax.swing.JButton
import javax.swing.JComponent
import javax.swing.JPanel
import javax.swing.SwingConstants

internal enum class OutMode { CONNECTING, APP_ERROR, INITIATING, AUTH, LOGIN_ERROR, EMPTY }

/**
 * Retained logged-out UI. Internally uses a [CardLayout] to switch between
 * connecting, error, device-auth, initiating, login-error, and not-logged-in states
 * without rebuilding components on every state change.
 */
internal class LoggedOutProfileUi(
    private val login: () -> Unit,
    private val retry: () -> Unit,
    private val cancel: () -> Unit,
    private val browse: (String) -> Unit,
    private val timers: UiTimerSource = UiTimers,
) : JPanel(BorderLayout()) {

    private val cards = JPanel(CardLayout())
    private val cardLayout = cards.layout as CardLayout
    private var mode: OutMode? = null

    // -- retained buttons --
    val loginBtn = JButton(SonderrBundle.message("profile.action.login"))
        .also { it.addActionListener { login() } }

    private val retryBtnConnecting = JButton(SonderrBundle.message("profile.action.retry"))
        .also { it.addActionListener { retry() } }

    private val retryBtnError = JButton(SonderrBundle.message("profile.action.retry"))
        .also { it.addActionListener { retry() } }

    private val authRetryBtn = JButton(SonderrBundle.message("profile.login.tryAgain"))
        .also { it.addActionListener { login() } }

    private val auth = DeviceOAuthPanel(
        DeviceOAuthText(
            title = SonderrBundle.message("profile.login.title"),
            qrDescription = SonderrBundle.message("profile.login.qr.description"),
        ),
        cancel = cancel,
        browse = browse,
        prefix = "sonderr.login",
        timers = timers,
    )

    private val initiatingIcon = AsyncProcessIcon("SonderrInitiating").also { it.suspend() }

    private val logoLabel = JBLabel(IconLoader.getIcon("/icons/sonderr-profile.svg", LoggedOutProfileUi::class.java)).apply {
        name = "sonderr.profile.logo.loggedOut"
        horizontalAlignment = SwingConstants.CENTER
        accessibleContext.accessibleName = SonderrBundle.message("settings.sonderr.displayName")
    }

    private val errLabel = JBLabel().apply {
        foreground = UiStyle.Colors.errorLabelForeground()
        horizontalAlignment = SwingConstants.CENTER
    }

    init {
        cards.add(connectingCard(), OutMode.CONNECTING.name)
        cards.add(appErrorCard(), OutMode.APP_ERROR.name)
        cards.add(emptyCard(), OutMode.EMPTY.name)
        cards.add(initiatingCard(), OutMode.INITIATING.name)
        cards.add(auth, OutMode.AUTH.name)
        cards.add(loginErrorCard(), OutMode.LOGIN_ERROR.name)
        add(cards, BorderLayout.NORTH)
    }

    // ---- card builders (called once in init) ----

    private fun connectingCard(): JPanel {
        val p = padded()
        p.add(JBLabel(SonderrBundle.message("profile.status.connecting")).apply {
            foreground = UiStyle.Colors.weak()
            horizontalAlignment = SwingConstants.CENTER
        }, gbc(0))
        p.add(retryBtnConnecting, gbc(1, UiStyle.Gap.sm()).centered())
        return p
    }

    private fun appErrorCard(): JPanel {
        val p = padded()
        p.add(JBLabel(SonderrBundle.message("profile.status.error")).apply {
            foreground = UiStyle.Colors.errorLabelForeground()
            horizontalAlignment = SwingConstants.CENTER
        }, gbc(0))
        p.add(retryBtnError, gbc(1, UiStyle.Gap.sm()).centered())
        return p
    }

    private fun emptyCard(): JPanel {
        val p = padded()
        p.add(logoLabel, gbc(0).centered())
        p.add(JBLabel(SonderrBundle.message("profile.notLoggedIn")).apply {
            foreground = UiStyle.Colors.weak()
            horizontalAlignment = SwingConstants.CENTER
        }, gbc(1, UiStyle.Gap.pad()))
        p.add(loginBtn, gbc(2, UiStyle.Gap.sm()).centered())
        return p
    }

    private fun initiatingCard(): JPanel {
        val p = padded()
        val row = JPanel(FlowLayout(FlowLayout.CENTER, UiStyle.Gap.sm(), 0)).apply {
            isOpaque = false
            add(initiatingIcon)
            add(JBLabel(SonderrBundle.message("profile.login.starting")).apply {
                foreground = UiStyle.Colors.weak()
            })
        }
        p.add(row, gbc(0).centered())
        return p
    }

    private fun loginErrorCard(): JPanel {
        val p = padded()
        p.add(errLabel, gbc(0))
        p.add(authRetryBtn, gbc(1, UiStyle.Gap.sm()).centered())
        return p
    }

    // ---- update ----

    @RequiresEdt
    fun update(status: SonderrAppStatusDto, login: LoginState) {
        val target = resolveMode(status, login)

        if (target == OutMode.AUTH && login is LoginState.Pending) {
            val auth = login.auth
            this.auth.update(DeviceOAuthInfo(auth.verificationUrl, auth.code, auth.expiresIn, login.started))
        }

        if (target == OutMode.LOGIN_ERROR && login is LoginState.Error) {
            errLabel.text = login.message
        }

        if (mode != target) {
            if (mode == OutMode.AUTH) {
                auth.dispose()
            }
            if (mode == OutMode.INITIATING) initiatingIcon.suspend()
            cardLayout.show(cards, target.name)
            mode = target
            if (target == OutMode.INITIATING) initiatingIcon.resume()
            revalidate()
            repaint()
        }
    }

    @RequiresEdt
    fun preferredFocus(): JComponent = loginBtn

    /** Stop the timer and suspend all animated icons. Safe to call multiple times. */
    @RequiresEdt
    fun dispose() {
        initiatingIcon.suspend()
        auth.dispose()
    }

    private fun resolveMode(status: SonderrAppStatusDto, login: LoginState): OutMode = when {
        status == SonderrAppStatusDto.DISCONNECTED || status == SonderrAppStatusDto.DOWNLOADING || status == SonderrAppStatusDto.CONNECTING || status == SonderrAppStatusDto.MIGRATION_REQUIRED -> OutMode.CONNECTING
        status == SonderrAppStatusDto.ERROR -> OutMode.APP_ERROR
        login is LoginState.Initiating -> OutMode.INITIATING
        login is LoginState.Pending -> OutMode.AUTH
        login is LoginState.Error -> OutMode.LOGIN_ERROR
        else -> OutMode.EMPTY
    }

    // ---- helpers ----

    private fun padded() = JPanel(GridBagLayout()).apply {
        border = JBUI.Borders.empty(UiStyle.Gap.pad())
    }

    private fun gbc(y: Int, top: Int = 0) = GridBagConstraints().apply {
        gridx = 0
        gridy = y
        weightx = 1.0
        fill = GridBagConstraints.HORIZONTAL
        insets = JBUI.insetsTop(top)
    }

    private fun GridBagConstraints.centered(): GridBagConstraints = apply {
        fill = GridBagConstraints.NONE
        anchor = GridBagConstraints.CENTER
    }
}
