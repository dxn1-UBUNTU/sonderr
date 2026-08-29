@file:Suppress("UnstableApiUsage")

package ai.sonderr.backend.rpc

import ai.sonderr.rpc.SonderrAppRpcApi
import com.intellij.platform.rpc.backend.RemoteApiProvider
import fleet.rpc.remoteApiDescriptor

internal class SonderrAppRpcApiProvider : RemoteApiProvider {
    override fun RemoteApiProvider.Sink.remoteApis() {
        remoteApi(remoteApiDescriptor<SonderrAppRpcApi>()) {
            SonderrAppRpcApiImpl()
        }
    }
}
