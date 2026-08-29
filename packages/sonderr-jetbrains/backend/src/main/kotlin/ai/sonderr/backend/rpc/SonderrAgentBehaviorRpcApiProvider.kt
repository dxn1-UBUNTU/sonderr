@file:Suppress("UnstableApiUsage")

package ai.sonderr.backend.rpc

import ai.sonderr.rpc.SonderrAgentBehaviorRpcApi
import com.intellij.platform.rpc.backend.RemoteApiProvider
import fleet.rpc.remoteApiDescriptor

internal class SonderrAgentBehaviorRpcApiProvider : RemoteApiProvider {
    override fun RemoteApiProvider.Sink.remoteApis() {
        remoteApi(remoteApiDescriptor<SonderrAgentBehaviorRpcApi>()) {
            SonderrAgentBehaviorRpcApiImpl()
        }
    }
}
