package ai.sonderr.client.session.controller

import ai.sonderr.client.session.model.SessionModelEvent
import ai.sonderr.rpc.dto.AgentDto
import ai.sonderr.rpc.dto.ConfigDto
import ai.sonderr.rpc.dto.DiffFileDto
import ai.sonderr.rpc.dto.SonderrAppStateDto
import ai.sonderr.rpc.dto.SonderrAppStatusDto
import ai.sonderr.rpc.dto.MessageSummaryDto
import ai.sonderr.rpc.dto.MessageTimeDto
import ai.sonderr.rpc.dto.MessageWithPartsDto
import ai.sonderr.rpc.dto.ModelDto
import ai.sonderr.rpc.dto.ProviderDto
import kotlinx.coroutines.CompletableDeferred

class HistoryLoadingTest : SessionControllerTestBase() {

    fun `test existing session loads history on init`() {
        val m = msg("msg1", "ses_test", "user").copy(
            summary = MessageSummaryDto(listOf(DiffFileDto("src/A.kt", 2, 1, "@@ patch"))),
        )
        val part = part("prt1", "ses_test", "msg1", "text", text = "hello")
        rpc.history.add(MessageWithPartsDto(m, listOf(part)))

        val c = controller("ses_test")
        val modelEvents = collectModelEvents(c)
        flush()

        assertModelEvents("HistoryLoaded", modelEvents)
        assertModel(
            """
            user#msg1
            text#prt1:
              hello
            """,
            c,
        )
        assertEquals("src/A.kt", c.model.message("msg1")?.info?.summary?.diffs?.single()?.file)
    }

    fun `test non-empty history shows messages view`() {
        rpc.history.add(MessageWithPartsDto(msg("msg1", "ses_test", "user"), emptyList()))

        val c = controller("ses_test")
        val events = collect(c)
        flush()

        // ViewChanged progress fires immediately on controller construction (step 3 of plan).
        // ViewChanged session fires after non-empty history is loaded.
        assertControllerEvents("""
            AccountOverlayChanged hide
            AppChanged
            WorkspaceChanged
            ViewChanged progress
            ViewChanged session
        """, events)

        assertSession(
            """
            user#msg1

            [app: DISCONNECTED] [workspace: PENDING]
            """,
            c,
        )
    }

    fun `test empty explicit session history shows empty view`() {
        rpc.recent.add(session("ses_recent"))

        val c = controller("ses_test")
        val events = collect(c)
        val modelEvents = collectModelEvents(c)
        flush()

        assertTrue(rpc.recentCalls.isEmpty())
        assertModelEvents("HistoryLoaded", modelEvents)
        assertControllerEvents("""
            AccountOverlayChanged hide
            AccountOverlayChanged show loggedIn=false
            AppChanged
            WorkspaceChanged
            ViewChanged progress
            ViewChanged empty
        """, events)
        assertSession(
            """
            [app: DISCONNECTED] [workspace: PENDING]
            """,
            c,
            show = false,
        )
    }

    fun `test prompt during history load keeps the session view`() {
        val gate = CompletableDeferred<Unit>()
        rpc.historyGate = gate

        val c = controller("ses_test")
        val events = collect(c)
        edt { c.prompt("hello") }
        gate.complete(Unit)
        flush()

        assertControllerEvents("""
            AccountOverlayChanged hide
            AppChanged
            WorkspaceChanged
            ViewChanged progress
            ViewChanged session
        """, events)
    }

    fun `test loaded history derives agent from latest message`() {
        appRpc.state.value = SonderrAppStateDto(SonderrAppStatusDto.READY, config = ConfigDto(model = "sonderr/gpt-5"))
        projectRpc.state.value = workspaceReady(agents = agents(), default = "plan")
        rpc.history.add(MessageWithPartsDto(msg("msg1", "ses_test", "user").copy(agent = "plan", time = MessageTimeDto(1.0)), emptyList()))
        rpc.history.add(MessageWithPartsDto(msg("msg2", "ses_test", "assistant").copy(agent = "code", time = MessageTimeDto(2.0)), emptyList()))

        val c = controller("ses_test")
        flush()

        assertEquals("code", c.model.agent)
    }

    fun `test loaded history derives model from latest user message`() {
        appRpc.state.value = SonderrAppStateDto(SonderrAppStatusDto.READY, config = ConfigDto(model = "sonderr/gpt-5"))
        projectRpc.state.value = workspaceReady(
            agents = agents(),
            default = "plan",
            providers = listOf(
                ProviderDto(
                    id = "sonderr",
                    name = "Sonderr",
                    models = mapOf("gpt-5" to ModelDto(id = "gpt-5", name = "GPT-5")),
                ),
                ProviderDto(
                    id = "anthropic",
                    name = "Anthropic",
                    models = mapOf("claude" to ModelDto(id = "claude", name = "Claude")),
                ),
            ),
            connected = listOf("sonderr", "anthropic"),
            defaults = mapOf("plan" to "sonderr/gpt-5", "code" to "sonderr/gpt-5"),
        )
        rpc.history.add(MessageWithPartsDto(msg("msg1", "ses_test", "user").copy(
            agent = "code",
            providerID = "anthropic",
            modelID = "claude",
            time = MessageTimeDto(1.0),
        ), emptyList()))

        val c = controller("ses_test")
        flush()

        assertEquals("code", c.model.agent)
        assertEquals("anthropic/claude", c.model.model)
        assertFalse(c.model.modelOverride)
    }

    fun `test empty loaded history keeps workspace default agent`() {
        appRpc.state.value = SonderrAppStateDto(SonderrAppStatusDto.READY, config = ConfigDto(model = "sonderr/gpt-5"))
        projectRpc.state.value = workspaceReady(agents = agents(), default = "plan")

        val c = controller("ses_test")
        flush()

        assertEquals("plan", c.model.agent)
    }

    private fun agents() = listOf(
        AgentDto(name = "plan", displayName = "Plan", mode = "plan"),
        AgentDto(name = "code", displayName = "Code", mode = "code"),
    )
}
