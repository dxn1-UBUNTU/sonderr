package ai.sonderr.client.vfs

import com.intellij.openapi.components.Service
import com.intellij.openapi.components.service
import java.util.concurrent.ConcurrentHashMap

@Service(Service.Level.APP)
class SonderrEditorKindRegistry {
    private val kinds = ConcurrentHashMap<String, SonderrEditorKind>()

    fun register(kind: SonderrEditorKind) {
        kinds[kind.id] = kind
        service<SonderrVirtualFileKindRegistry>().register(kind)
    }

    fun unregister(id: String) {
        kinds.remove(id)
        service<SonderrVirtualFileKindRegistry>().unregister(id)
    }

    fun clear() {
        kinds.keys.forEach { id -> unregister(id) }
    }

    fun get(id: String): SonderrEditorKind? = kinds[id]
}
