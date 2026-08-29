@file:Suppress("UnstableApiUsage")

package ai.sonderr.rpc

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
import com.intellij.platform.rpc.RemoteApiProviderService
import fleet.rpc.RemoteApi
import fleet.rpc.Rpc
import fleet.rpc.remoteApiDescriptor

@Rpc
interface SonderrProviderRpcApi : RemoteApi<Unit> {
    companion object {
        suspend fun getInstance(): SonderrProviderRpcApi {
            return RemoteApiProviderService.resolve(remoteApiDescriptor<SonderrProviderRpcApi>())
        }
    }

    suspend fun state(directory: String): ProviderSettingsDto
    suspend fun connect(input: ProviderConnectDto): ProviderActionResultDto
    suspend fun authorize(input: ProviderOAuthAuthorizeDto): ProviderOAuthReadyDto
    suspend fun callback(input: ProviderOAuthCallbackDto): ProviderActionResultDto
    suspend fun disconnect(input: ProviderDisconnectDto): ProviderActionResultDto
    suspend fun enable(input: ProviderEnableDto): ProviderActionResultDto
    suspend fun saveCustom(input: CustomProviderSaveDto): ProviderActionResultDto
    suspend fun fetchCustomModels(input: CustomModelFetchDto): CustomModelFetchResultDto
}
