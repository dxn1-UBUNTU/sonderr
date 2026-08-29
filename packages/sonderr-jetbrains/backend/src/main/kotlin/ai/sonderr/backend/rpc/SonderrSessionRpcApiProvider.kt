@file:Suppress("UnstableApiUsage")

package ai.sonderr.backend.rpc

import ai.sonderr.rpc.SonderrSessionRpcApi
import com.intellij.platform.rpc.backend.RemoteApiProvider
import fleet.rpc.remoteApiDescriptor

internal class SonderrSessionRpcApiProvider : RemoteApiProvider {
    override fun RemoteApiProvider.Sink.remoteApis() {
        remoteApi(remoteApiDescriptor<SonderrSessionRpcApi>()) {
            SonderrSessionRpcApiImpl()
        }
    }
}
