package ai.sonderr.client.vfs

import com.intellij.openapi.components.Service
import java.util.concurrent.ConcurrentHashMap

@Service(Service.Level.APP)
class SonderrVirtualFileKindRegistry {
    private val kinds = ConcurrentHashMap<String, SonderrVirtualFileKind>()

    fun register(kind: SonderrVirtualFileKind) {
        kinds[kind.id] = kind
    }

    fun unregister(id: String) {
        kinds.remove(id)
    }

    fun clear() {
        kinds.clear()
    }

    fun get(id: String): SonderrVirtualFileKind? = kinds[id]
}
