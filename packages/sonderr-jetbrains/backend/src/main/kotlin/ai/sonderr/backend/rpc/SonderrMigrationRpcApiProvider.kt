@file:Suppress("UnstableApiUsage")

package ai.sonderr.backend.rpc

import ai.sonderr.rpc.SonderrMigrationRpcApi
import com.intellij.platform.rpc.backend.RemoteApiProvider
import fleet.rpc.remoteApiDescriptor

internal class SonderrMigrationRpcApiProvider : RemoteApiProvider {
    override fun RemoteApiProvider.Sink.remoteApis() {
        remoteApi(remoteApiDescriptor<SonderrMigrationRpcApi>()) {
            SonderrMigrationRpcApiImpl()
        }
    }
}
