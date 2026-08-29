package ai.sonderr.client.session.views.tool

import ai.sonderr.cli.SonderrCliParser
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class SonderrCliParserTest {
    @Test
    fun `tag extracts trimmed tool xml value`() {
        val text = """
            <path>
              /tmp/example.txt
            </path>
            <type>file</type>
        """.trimIndent()

        assertEquals("/tmp/example.txt", SonderrCliParser.tag(text, "path"))
        assertEquals("file", SonderrCliParser.tag(text, "type"))
    }

    @Test
    fun `tag returns null for blank or missing value`() {
        assertNull(SonderrCliParser.tag("<path>   </path>", "path"))
        assertNull(SonderrCliParser.tag("<type>file</type>", "path"))
    }
}
