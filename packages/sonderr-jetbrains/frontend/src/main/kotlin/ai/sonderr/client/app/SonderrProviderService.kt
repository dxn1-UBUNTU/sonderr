@file:Suppress("UnstableApiUsage")

package ai.sonderr.client.app

import ai.sonderr.log.SonderrLog
import ai.sonderr.rpc.SonderrProviderRpcApi
import ai.sonderr.rpc.dto.CustomModelFetchDto
import ai.sonderr.rpc.dto.CustomModelFetchResultDto
import ai.sonderr.rpc.dto.CustomProviderSaveDto
import ai.sonderr.rpc.dto.LoadErrorDto
import ai.sonderr.rpc.dto.ProviderActionResultDto
import ai.sonderr.rpc.dto.ProviderConnectDto
import ai.sonderr.rpc.dto.ProviderDisconnectDto
import ai.sonderr.rpc.dto.ProviderEnableDto
import ai.sonderr.rpc.dto.ProviderOAuthAuthorizeDto
import ai.sonderr.rpc.dto.ProviderOAuthCallbackDto
import ai.sonderr.rpc.dto.ProviderOAuthReadyDto
import ai.sonderr.rpc.dto.ProviderSettingsDto
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.service
import fleet.rpc.client.durable
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.withTimeout

@Service(Service.Level.APP)
class SonderrProviderService internal constructor(
    private val cs: CoroutineScope,
    private val rpc: SonderrProviderRpcApi?,
) {
    constructor(cs: CoroutineScope) : this(cs, null)

    companion object {
        private val LOG = SonderrLog.create(SonderrProviderService::class.java)
        private const val RPC_TIMEOUT_MS = 20_000L
        internal const val OAUTH_RPC_TIMEOUT_MS = 90_000L
    }

    private suspend fun <T> call(name: String, timeoutMs: Long = RPC_TIMEOUT_MS, block: suspend SonderrProviderRpcApi.() -> T): T {
        val start = System.currentTimeMillis()
        LOG.info("provider settings rpc $name: start")
        val api = rpc
        return try {
            val result = withTimeout(timeoutMs) {
                if (api != null) block(api) else durable { block(SonderrProviderRpcApi.getInstance()) }
            }
            LOG.info("provider settings rpc $name: completed durationMs=${System.currentTimeMillis() - start}")
            result
        } catch (e: Exception) {
            LOG.warn("provider settings rpc $name: failed durationMs=${System.currentTimeMillis() - start}", e)
            throw e
        }
    }

    suspend fun state(directory: String): ProviderSettingsDto = try {
        call("state dir=$directory") { state(directory) }
    } catch (e: Exception) {
        LOG.warn("provider settings lookup failed for directory=$directory", e)
        ProviderSettingsDto(errors = listOf(LoadErrorDto(resource = "providers", detail = e.message)))
    }

    suspend fun connect(input: ProviderConnectDto): ProviderActionResultDto = action(input.directory) { connect(input) }
    suspend fun authorize(input: ProviderOAuthAuthorizeDto): ProviderOAuthReadyDto = call("authorize provider=${input.providerId}", OAUTH_RPC_TIMEOUT_MS) { authorize(input) }
    suspend fun callback(input: ProviderOAuthCallbackDto): ProviderActionResultDto = action(input.directory, OAUTH_RPC_TIMEOUT_MS) { callback(input) }
    suspend fun disconnect(input: ProviderDisconnectDto): ProviderActionResultDto = action(input.directory) { disconnect(input) }
    suspend fun enable(input: ProviderEnableDto): ProviderActionResultDto = action(input.directory) { enable(input) }
    suspend fun saveCustom(input: CustomProviderSaveDto): ProviderActionResultDto = action(input.directory) { saveCustom(input) }
    suspend fun fetchCustomModels(input: CustomModelFetchDto): CustomModelFetchResultDto = call("fetch custom models") { fetchCustomModels(input) }

    private suspend fun action(directory: String, timeoutMs: Long = RPC_TIMEOUT_MS, block: suspend SonderrProviderRpcApi.() -> ProviderActionResultDto): ProviderActionResultDto {
        LOG.info("provider settings action: start dir=$directory")
        val result = try {
            call("action dir=$directory", timeoutMs, block)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            LOG.warn("provider settings action failed for directory=$directory", e)
            return ProviderActionResultDto(state(directory), error = e.message)
        }
        service<SonderrWorkspaceService>().reload(directory)
        service<SonderrAppService>().refreshProfileAsync()
        LOG.info("provider settings action: completed dir=$directory")
        return result
    }
}
