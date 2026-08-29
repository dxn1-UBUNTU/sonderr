package ai.sonderr.backend.cli

import kotlin.test.Test
import kotlin.test.assertEquals
import java.io.File
import java.nio.file.Files

class SonderrCliConfigPathTest {

    @Test
    fun `sonderr config dir overrides XDG config home`() {
        val dir = Files.createTempDirectory("sonderr-config-dir").toFile()
        val xdg = Files.createTempDirectory("sonderr-xdg-config").toFile()

        val path = SonderrCliConfigPath.resolve(
            mapOf(
                "SONDERR_CONFIG_DIR" to dir.absolutePath,
                "XDG_CONFIG_HOME" to xdg.absolutePath,
            ),
        )

        assertEquals(dir.absoluteFile, path.absoluteFile)
    }

    @Test
    fun `XDG config home resolves to sonderr subdirectory`() {
        val xdg = Files.createTempDirectory("sonderr-xdg-config").toFile()

        val path = SonderrCliConfigPath.resolve(mapOf("XDG_CONFIG_HOME" to xdg.absolutePath))

        assertEquals(File(xdg, "sonderr").absoluteFile, path.absoluteFile)
    }

    @Test
    fun `default config home matches CLI xdg fallback`() {
        val home = Files.createTempDirectory("sonderr-home").toFile()

        val path = SonderrCliConfigPath.resolve(mapOf("HOME" to home.absolutePath))

        assertEquals(File(File(home, ".config"), "sonderr").absoluteFile, path.absoluteFile)
    }

    @Test
    fun `USERPROFILE backs up HOME for default config home`() {
        val home = Files.createTempDirectory("sonderr-userprofile").toFile()

        val path = SonderrCliConfigPath.resolve(
            mapOf(
                "HOME" to "",
                "USERPROFILE" to home.absolutePath,
            ),
        )

        assertEquals(File(File(home, ".config"), "sonderr").absoluteFile, path.absoluteFile)
    }

    @Test
    fun `blank config env values are ignored`() {
        val home = Files.createTempDirectory("sonderr-home").toFile()

        val path = SonderrCliConfigPath.resolve(
            mapOf(
                "SONDERR_CONFIG_DIR" to " ",
                "XDG_CONFIG_HOME" to "",
                "HOME" to home.absolutePath,
            ),
        )

        assertEquals(File(File(home, ".config"), "sonderr").absoluteFile, path.absoluteFile)
    }

    @Test
    fun `legacy settings file resolves under global config dir`() {
        val home = Files.createTempDirectory("sonderr-home").toFile()

        val path = SonderrCliConfigPath.legacySettingsFile(mapOf("HOME" to home.absolutePath))

        assertEquals(File(File(File(home, ".config"), "sonderr"), "legacy-settings.json").absoluteFile, path.absoluteFile)
    }
}
