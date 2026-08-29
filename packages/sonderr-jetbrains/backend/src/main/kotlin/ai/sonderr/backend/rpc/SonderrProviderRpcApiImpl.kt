@file:Suppress("UnstableApiUsage")

package ai.sonderr.backend.rpc

import ai.sonderr.backend.provider.SonderrBackendProviderSettingsManager
import ai.sonderr.rpc.SonderrProviderRpcApi
import ai.sonderr.rpc.dto.CustomModelFetchDto
import ai.sonderr.rpc.dto.CustomModelFetchResultDto
import ai.sonderr.rpc.dto.CustomProviderSaveDto
import ai.sonderr.rpc.dto.ProviderActionResultDto
import ai.sonderr.rpc.dto.ProviderConnectDto
import ai.sonderr.rpc.dto.ProviderDisconnectDto
import ai.sonderr.rpc.dto.ProviderEnableDto
import ai.sonderr.rpc.dto.ProviderOAuthAuthorizeDto
import ai.sonderr.rpc.dto.ProviderOAuthCallbackDto
import ai.sonderr.rpc.dto.ProviderOAuthReadyDto
import ai.sonderr.rpc.dto.ProviderSettingsDto
import com.intellij.openapi.components.service
import ai.sonderr.backend.app.SonderrBackendAppService
import ai.sonderr.log.SonderrLog

internal class SonderrProviderRpcApiImpl : SonderrProviderRpcApi {
    companion object {
        private val LOG = SonderrLog.create(SonderrProviderRpcApiImpl::class.java)
    }

    private val manager: SonderrBackendProviderSettingsManager
        get() = SonderrBackendProviderSettingsManager(service<SonderrBackendAppService>())

    override suspend fun state(directory: String): ProviderSettingsDto = logged("state dir=$directory") { manager.state(directory) }
    override suspend fun connect(input: ProviderConnectDto): ProviderActionResultDto = logged("connect provider=${input.providerId}") { manager.connect(input) }
    override suspend fun authorize(input: ProviderOAuthAuthorizeDto): ProviderOAuthReadyDto = logged("authorize provider=${input.providerId}") { manager.authorize(input) }
    override suspend fun callback(input: ProviderOAuthCallbackDto): ProviderActionResultDto = logged("callback provider=${input.providerId}") { manager.callback(input) }
    override suspend fun disconnect(input: ProviderDisconnectDto): ProviderActionResultDto = logged("disconnect provider=${input.providerId}") { manager.disconnect(input) }
    override suspend fun enable(input: ProviderEnableDto): ProviderActionResultDto = logged("enable provider=${input.providerId}") { manager.enable(input) }
    override suspend fun saveCustom(input: CustomProviderSaveDto): ProviderActionResultDto = logged("save custom provider=${input.id}") { manager.saveCustom(input) }
    override suspend fun fetchCustomModels(input: CustomModelFetchDto): CustomModelFetchResultDto = logged("fetch custom models") { manager.fetch(input) }

    private suspend fun <T> logged(name: String, block: suspend () -> T): T {
        val start = System.currentTimeMillis()
        LOG.info("provider rpc $name: start")
        return try {
            val result = block()
            LOG.info("provider rpc $name: completed durationMs=${System.currentTimeMillis() - start}")
            result
        } catch (e: Exception) {
            LOG.warn("provider rpc $name: failed durationMs=${System.currentTimeMillis() - start}", e)
            throw e
        }
    }
}
