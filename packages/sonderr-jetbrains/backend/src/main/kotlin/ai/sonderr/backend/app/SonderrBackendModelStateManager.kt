package ai.sonderr.backend.app

import ai.sonderr.backend.cli.SonderrCliDataParser
import ai.sonderr.log.SonderrLog
import ai.sonderr.rpc.dto.ModelFavoriteUpdateDto
import ai.sonderr.rpc.dto.ModelSelectionDto
import ai.sonderr.rpc.dto.ModelSelectionUpdateDto
import ai.sonderr.rpc.dto.ModelStateDto
import ai.sonderr.rpc.dto.ModelVariantUpdateDto
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import okhttp3.OkHttpClient
import okhttp3.Request
import java.nio.file.Files
import java.nio.file.Path
import kotlin.io.path.createDirectories
import kotlin.io.path.exists
import kotlin.io.path.readText
import kotlin.io.path.writeText

class SonderrBackendModelStateManager(
    private val log: SonderrLog,
) {
    companion object {
        private val DEFAULT_DIR = Path.of(System.getProperty("user.home"), ".local", "state", "sonderr")
    }

    private val mutex = Mutex()

    private var client: OkHttpClient? = null
    private var base: String? = null
    private var file: Path? = null

    fun start(http: OkHttpClient, port: Int) {
        client = http
        base = "http://127.0.0.1:$port"
        file = null
    }

    fun stop() {
        client = null
        base = null
        file = null
    }

    suspend fun state(): ModelStateDto = mutex.withLock {
        SonderrCliDataParser.parseModelState(read().orEmpty())
    }

    suspend fun favorite(update: ModelFavoriteUpdateDto): ModelStateDto = mutex.withLock {
        val raw = read()
        val key = update.providerID to update.modelID
        val state = SonderrCliDataParser.parseModelState(raw.orEmpty())
        val current = state.favorite
        val exists = current.any { it.providerID to it.modelID == key }
        val next = when (update.action) {
            "add" -> if (exists) current else listOf(ModelSelectionDto(update.providerID, update.modelID)) + current
            "remove" -> current.filterNot { it.providerID to it.modelID == key }
            else -> current
        }
        val updated = state.copy(favorite = next)
        write(SonderrCliDataParser.buildModelStateJson(raw, updated))
        updated
    }

    suspend fun selection(update: ModelSelectionUpdateDto): ModelStateDto = mutex.withLock {
        val raw = read()
        val state = SonderrCliDataParser.parseModelState(raw.orEmpty())
        val next = state.model + (update.agent to ModelSelectionDto(update.providerID, update.modelID))
        val updated = state.copy(model = next)
        write(SonderrCliDataParser.buildModelStateJson(raw, updated))
        updated
    }

    suspend fun clear(agent: String): ModelStateDto = mutex.withLock {
        val raw = read()
        val state = SonderrCliDataParser.parseModelState(raw.orEmpty())
        val updated = state.copy(model = state.model - agent)
        write(SonderrCliDataParser.buildModelStateJson(raw, updated))
        updated
    }

    suspend fun variant(update: ModelVariantUpdateDto): ModelStateDto = mutex.withLock {
        val raw = read()
        val state = SonderrCliDataParser.parseModelState(raw.orEmpty())
        val updated = state.copy(variant = state.variant + (update.key to update.value))
        write(SonderrCliDataParser.buildModelStateJson(raw, updated))
        updated
    }

    private fun read(): String? {
        val path = resolve() ?: return null
        if (!path.exists()) return null
        return try {
            path.readText()
        } catch (e: Exception) {
            log.warn("model state read failed: ${e.message}")
            null
        }
    }

    private fun write(raw: String) {
        val path = resolve() ?: return
        path.parent?.createDirectories()
        path.writeText(raw)
    }

    private fun resolve(): Path? {
        file?.let { return it }
        val http = client ?: return null
        val url = base ?: return null
        val request = Request.Builder().url("$url/path").get().build()
        return try {
            http.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    log.warn("path fetch failed: HTTP ${response.code}")
                    return null
                }
                val raw = response.body?.string() ?: return null
                val dir = SonderrCliDataParser.parsePathState(raw)?.let(Path::of) ?: DEFAULT_DIR
                Files.createDirectories(dir)
                dir.resolve("model.json").also { file = it }
            }
        } catch (e: Exception) {
            log.warn("path fetch failed: ${e.message}")
            Files.createDirectories(DEFAULT_DIR)
            DEFAULT_DIR.resolve("model.json").also { file = it }
        }
    }

}
