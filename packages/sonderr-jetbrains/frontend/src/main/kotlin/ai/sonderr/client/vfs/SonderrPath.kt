package ai.sonderr.client.vfs

import kotlinx.serialization.Serializable

@Serializable
data class SonderrPath(
    val kind: String,
    val params: Map<String, String> = emptyMap(),
) {
    fun canonical(): SonderrPath = copy(params = canonicalParams(params))
}

internal fun canonicalParams(params: Map<String, String>): Map<String, String> {
    if (params.size < 2) return params
    return params.toSortedMap()
}
