package ai.sonderr.client

import ai.sonderr.client.agentManager.SidePanelKeys
import ai.sonderr.client.agentManager.SidePanelMode
import ai.sonderr.client.agentManager.applySidePanelMode
import ai.sonderr.client.plugin.SonderrBundle
import ai.sonderr.client.util.edtWait
import com.intellij.testFramework.fixtures.BasePlatformTestCase
import com.intellij.ui.content.ContentFactory
import javax.swing.JPanel

class SonderrToolWindowFactoryTest : BasePlatformTestCase() {
    fun `test content labels are short`() {
        assertEquals("Chat", SonderrBundle.message("sidePanel.mode.branch"))
        assertEquals("Agents", SonderrBundle.message("sidePanel.mode.agentManager"))
    }

    fun `test content records side panel mode`() = edtWait {
        val content = ContentFactory.getInstance().createContent(JPanel(), "Chat", false)

        content.applySidePanelMode(SidePanelMode.CHAT)

        assertEquals(SidePanelMode.CHAT, content.getUserData(SidePanelKeys.CONTENT_MODE))
    }
}
