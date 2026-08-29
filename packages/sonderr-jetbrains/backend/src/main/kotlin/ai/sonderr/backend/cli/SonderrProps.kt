package ai.sonderr.backend.cli

import java.util.Properties

object SonderrProps {
    private val props by lazy {
        val stream = SonderrProps::class.java.classLoader.getResourceAsStream("sonderr.properties")
            ?: throw IllegalStateException("sonderr.properties resource not found")
        stream.use {
            Properties().apply { load(it) }
        }
    }

    fun cliVersion(): String = props.getProperty("cli.version")
        ?: throw IllegalStateException("cli.version missing from sonderr.properties")

    fun pinned(): Boolean = pinned(props)

    internal fun pinned(props: Properties): Boolean = props.getProperty("cli.pinned")?.toBoolean() ?: true
}
