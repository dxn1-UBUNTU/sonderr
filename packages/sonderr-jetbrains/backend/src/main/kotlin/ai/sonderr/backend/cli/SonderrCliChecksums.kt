package ai.sonderr.backend.cli

import java.util.Properties

object SonderrCliChecksums {
    private const val RESOURCE = "sonderr-cli-checksums.properties"

    private val values by lazy {
        val stream = SonderrCliChecksums::class.java.classLoader.getResourceAsStream(RESOURCE)
            ?: return@lazy emptyMap()
        stream.use {
            Properties().apply { load(it) }
                .entries
                .associate { item -> item.key.toString() to item.value.toString() }
        }
    }

    fun load(): Map<String, String> = values
}
