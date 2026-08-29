package ai.sonderr.client.session

import ai.sonderr.client.app.SonderrAppService
import ai.sonderr.client.app.SonderrSessionService
import ai.sonderr.client.app.SonderrWorkspaceService
import ai.sonderr.client.app.Workspace
import ai.sonderr.client.migration.FakeMigrationUiController
import ai.sonderr.client.migration.MigrationUiController
import ai.sonderr.client.session.ui.SessionRootPanel
import ai.sonderr.client.session.ui.prompt.PromptPanel
import ai.sonderr.client.session.controller.SessionController
import ai.sonderr.client.testing.FakeAppRpcApi
import ai.sonderr.client.testing.FakeSessionRpcApi
import ai.sonderr.client.testing.FakeWorkspaceRpcApi
import ai.sonderr.client.testing.TestCoroutines
import ai.sonderr.client.session.SessionRef
import ai.sonderr.client.session.scroll.SessionScroll
import ai.sonderr.rpc.dto.ChatEventDto
import ai.sonderr.rpc.dto.SonderrAppStateDto
import ai.sonderr.rpc.dto.SonderrAppStatusDto
import ai.sonderr.rpc.dto.SonderrWorkspaceStateDto
import ai.sonderr.rpc.dto.SonderrWorkspaceStatusDto
import ai.sonderr.rpc.dto.MessageDto
import ai.sonderr.rpc.dto.MessageTimeDto
import ai.sonderr.rpc.dto.MessageWithPartsDto
import ai.sonderr.rpc.dto.PartDto
import ai.sonderr.rpc.dto.SessionDto
import ai.sonderr.rpc.dto.SessionTimeDto
import com.intellij.testFramework.fixtures.BasePlatformTestCase
import com.intellij.openapi.util.Disposer
import ai.sonderr.client.testing.pumpEdt
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import java.awt.Container
import java.awt.event.ActionEvent
import java.awt.event.MouseEvent
import java.awt.event.MouseWheelEvent
import javax.swing.JComponent
import javax.swing.JLabel
import javax.swing.JScrollBar

@Suppress("UnstableApiUsage")
abstract class SessionUiTestBase : BasePlatformTestCase() {
    private lateinit var coroutines: TestCoroutines
    protected lateinit var scope: CoroutineScope
    protected lateinit var sessions: SonderrSessionService
    protected lateinit var app: SonderrAppService
    protected lateinit var workspaces: SonderrWorkspaceService
    protected lateinit var workspaceRpc: FakeWorkspaceRpcApi
    protected lateinit var rpc: FakeSessionRpcApi
    protected lateinit var appRpc: FakeAppRpcApi
    protected lateinit var workspace: Workspace
    protected lateinit var ui: SessionUi

    override fun setUp() {
        super.setUp()
        coroutines = TestCoroutines()
        scope = coroutines.scope

        rpc = FakeSessionRpcApi()
        appRpc = FakeAppRpcApi().also {
            it.state.value = SonderrAppStateDto(SonderrAppStatusDto.READY)
        }
        workspaceRpc = FakeWorkspaceRpcApi().also {
            it.state.value = SonderrWorkspaceStateDto(status = SonderrWorkspaceStatusDto.READY)
        }

        sessions = SonderrSessionService(project, scope, rpc)
        app = SonderrAppService(scope, appRpc)
        workspaces = SonderrWorkspaceService(scope, workspaceRpc)
        workspace = workspaces.workspace("/test")

        ui = newUi()
        layout()
    }

    override fun tearDown() {
        try {
            Disposer.dispose(ui)
            coroutines.close()
        } finally {
            super.tearDown()
        }
    }

    protected fun newUi(
        id: String? = null,
        displayMs: Long = 0,
        open: ((SessionRef) -> Unit)? = null,
        migration: MigrationUiController = FakeMigrationUiController(),
        manager: SessionManager? = null,
    ): SessionUi {
        val owner = manager ?: open?.let { fn ->
            object : SessionManager {
                override fun newSession() {}
                override fun showHistory(back: (() -> Unit)?) {}
                override fun openSession(ref: SessionRef) = fn(ref)
            }
        }
        return SessionUi(
            project, workspace, sessions, app, scope,
            ref = SessionRef.from(id),
            displayMs = displayMs,
            manager = owner,
            workspaces = workspaces,
            migration = migration,
        ).apply {
            setSize(800, 600)
        }
    }

    protected fun layout() {
        ui.doLayout()
        val root = find<SessionRootPanel>(ui)
        root.doLayout()
        root.content.doLayout()
        // The prompt sits inside an Align inside the bottom Stack container (which also holds the
        // branch dock). Lay out the Stack before the Align so the prompt receives its full width.
        find<PromptPanel>(ui).parent.parent.doLayout()
        find<PromptPanel>(ui).parent.doLayout()
        scrollComponent().doLayout()
        (scrollView() as? Container)?.doLayout()
    }

    protected fun settle() {
        coroutines.drain()
    }

    protected fun settleShort(ms: Long) = runBlocking {
        delay(ms)
        pumpEdt()
    }

    protected fun showMessages() {
        controller().prompt("hello")
        settle()
        layout()
    }

    protected fun fillTranscript(count: Int, start: Int = 0) {
        repeat(count) { offset ->
            val i = start + offset
            val id = "msg_$i"
            emit(ChatEventDto.MessageUpdated("ses_test", message(id)), flush = false)
            emit(ChatEventDto.PartUpdated("ses_test", part("part_$i", id, "text", text(i))), flush = false)
        }
        settle()
        forceFlush()
        drainScroll()
    }

    protected fun emit(event: ChatEventDto, flush: Boolean = true) {
        runBlocking { rpc.events.emit(event) }
        if (flush) {
            settle()
            forceFlush()
        }
    }

    protected fun forceFlush() {
        controller().flushEvents()
        pumpEdt()
    }

    protected fun forceFlushWithoutDispatch() {
        controller().flushEvents()
    }

    protected fun drainScroll() {
        repeat(4) {
            layout()
            pumpEdt()
        }
    }

    private fun scroll(): SessionScroll = ui.scroll

    protected fun scrollComponent(): JComponent = scroll().component

    protected fun scrollView(): JComponent? = scroll().view

    protected fun scrollBar(): JScrollBar = scroll().bar

    protected fun jumpButton(): JLabel = scroll().jump

    protected fun click(label: JLabel) {
        val event = MouseEvent(label, MouseEvent.MOUSE_CLICKED, System.currentTimeMillis(), 0, 1, 1, 1, false)
        for (listener in label.mouseListeners) listener.mouseClicked(event)
    }

    protected fun bottom(bar: JScrollBar): Int = (bar.maximum - bar.visibleAmount).coerceAtLeast(0)

    protected fun setBottom(bar: JScrollBar) {
        setValue(bar, bottom(bar))
    }

    protected fun setValue(bar: JScrollBar, value: Int) {
        wheelNoop()
        setValuePassive(bar, value)
    }

    protected fun setValuePassive(bar: JScrollBar, value: Int) {
        bar.value = value.coerceIn(bar.minimum, bottom(bar))
    }

    // Simulate keyboard scrolling: the scroll pane's key bindings move the bar synchronously
    // while a KeyEvent is the current AWT event. Move the bar from an IdeEventQueue dispatcher so it
    // runs while EventQueue.getCurrentEvent() is the KeyEvent, exactly like production key bindings.
    // Simulate keyboard scrolling: keyboard PageUp/PageDown/Home/End fire the scroll pane's own
    // scroll actions through its WHEN_ANCESTOR_OF_FOCUSED_COMPONENT bindings. Invoke the same action
    // SessionScroll wraps so the user-gesture flag and real scrolling happen exactly as in production.
    protected fun keyScroll(action: String) {
        val map = scrollComponent().actionMap
        val entry = map.get(action) ?: error("missing scroll action $action")
        entry.actionPerformed(ActionEvent(scrollComponent(), ActionEvent.ACTION_PERFORMED, action))
    }

    protected fun wheelNoop() {
        val event = MouseWheelEvent(scrollComponent(), MouseEvent.MOUSE_WHEEL, System.currentTimeMillis(), 0, 1, 1, 0, false, MouseWheelEvent.WHEEL_UNIT_SCROLL, 1, 1)
        for (listener in scrollComponent().mouseWheelListeners) listener.mouseWheelMoved(event)
    }

    protected fun assertBottom(bar: JScrollBar) {
        assertTrue("value=${bar.value} bottom=${bottom(bar)} max=${bar.maximum} visible=${bar.visibleAmount}", bar.value >= bottom(bar) - 1)
    }

    protected inline fun <reified T> find(root: Container): T {
        return find(root, T::class.java) ?: error("missing ${T::class.java.simpleName}")
    }

    protected fun <T> find(root: Container, cls: Class<T>): T? {
        if (cls.isInstance(root)) return cls.cast(root)
        for (child in root.components) {
            if (cls.isInstance(child)) return cls.cast(child)
            if (child is Container) {
                val item = find(child, cls)
                if (item != null) return item
            }
        }
        return null
    }

    protected fun controller(): SessionController {
        val field = SessionUi::class.java.getDeclaredField("controller")
        field.isAccessible = true
        return field.get(ui) as SessionController
    }

    protected fun session(id: String) = SessionDto(
        id = id,
        projectID = "prj",
        directory = "/test",
        title = "Recent $id",
        version = "1",
        time = SessionTimeDto(created = 1.0, updated = 2.0),
    )

    protected fun message(id: String) = MessageDto(
        id = id,
        sessionID = "ses_test",
        role = "user",
        time = MessageTimeDto(created = 0.0),
    )

    protected fun part(id: String, mid: String, type: String, text: String? = null) = PartDto(
        id = id,
        sessionID = "ses_test",
        messageID = mid,
        type = type,
        text = text,
    )

    protected fun history(count: Int): List<MessageWithPartsDto> = List(count) { i ->
        val id = "hist_$i"
        MessageWithPartsDto(message(id), listOf(part("hist_part_$i", id, "text", text(i))))
    }

    protected fun text(i: Int): String = "line $i\n".repeat(12)
}
