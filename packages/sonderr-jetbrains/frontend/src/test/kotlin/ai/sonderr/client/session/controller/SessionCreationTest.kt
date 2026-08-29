package ai.sonderr.client.session.controller

import ai.sonderr.rpc.dto.ConfigDto
import ai.sonderr.rpc.dto.SonderrAppStateDto
import ai.sonderr.rpc.dto.SonderrAppStatusDto
import ai.sonderr.rpc.dto.ModelDto
import ai.sonderr.rpc.dto.ModelStateDto
import ai.sonderr.rpc.dto.ProviderDto

class SessionCreationTest : SessionControllerTestBase() {

    fun `test prompt creates session on first call`() {
        val m = controller()
        val events = collect(m)
        flush()
        events.clear()

        edt { m.prompt("hello") }
        flush()

        assertEquals(1, rpc.creates)
        assertEquals(1, rpc.prompts.size)
        assertEquals("ses_test", rpc.prompts[0].first)
        assertControllerEvents("ViewChanged session", events)
        assertSession(
            """
            [app: DISCONNECTED] [workspace: PENDING]
            """,
            m,
        )
    }

    fun `test prompt reuses existing session`() {
        val m = controller()

        edt { m.prompt("first") }
        flush()
        edt { m.prompt("second") }
        flush()

        assertEquals(1, rpc.creates)
        assertEquals(2, rpc.prompts.size)
        assertEquals("ses_test", rpc.prompts[1].first)
    }

    fun `test same-turn first prompts share session creation`() {
        val m = controller()

        edt {
            m.prompt("first")
            m.prompt("second")
        }
        flush()

        assertEquals(1, rpc.creates)
        assertEquals(listOf("ses_test", "ses_test"), rpc.prompts.map { it.first })
        assertEquals(listOf("first", "second"), rpc.prompts.map { it.third.parts.single().text.toString() }.sorted())
    }

    fun `test same-turn first prompt and command share session creation`() {
        val m = controller()

        edt {
            m.prompt("first")
            m.command("deploy", "prod")
        }
        flush()

        assertEquals(1, rpc.creates)
        assertEquals("ses_test", rpc.prompts.single().first)
        assertEquals("ses_test", rpc.commands.single().id)
    }

    fun `test prompt with existing ID skips creation`() {
        val m = controller("existing")
        collect(m)
        flush()

        edt { m.prompt("hello") }
        flush()

        assertEquals(0, rpc.creates)
        assertEquals(1, rpc.prompts.size)
        assertEquals("existing", rpc.prompts[0].first)
    }

    fun `test prompt sends selected model agent and variant`() {
        appRpc.models = ModelStateDto(variant = mapOf("sonderr/gpt-5" to "medium"))
        appRpc.state.value = SonderrAppStateDto(SonderrAppStatusDto.READY, config = ConfigDto(model = "sonderr/gpt-5"))
        projectRpc.state.value = workspaceReady(
            providers = listOf(
                ProviderDto(
                    id = "sonderr",
                    name = "Sonderr",
                    models = mapOf(
                        "gpt-5" to ModelDto(id = "gpt-5", name = "GPT-5", variants = listOf("low", "medium", "high")),
                    ),
                ),
            ),
        )
        val m = controller("existing")
        collect(m)
        flush()

        edt { m.prompt("hello") }
        flush()

        val prompt = rpc.prompts.single().third
        assertEquals("sonderr", prompt.providerID)
        assertEquals("gpt-5", prompt.modelID)
        assertEquals("code", prompt.agent)
        assertEquals("medium", prompt.variant)
    }
}
