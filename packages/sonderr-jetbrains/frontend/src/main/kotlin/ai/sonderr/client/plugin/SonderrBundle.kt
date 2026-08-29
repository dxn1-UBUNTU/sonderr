package ai.sonderr.client.plugin

import com.intellij.DynamicBundle
import org.jetbrains.annotations.PropertyKey

private const val BUNDLE = "messages.SonderrBundle"

object SonderrBundle : DynamicBundle(BUNDLE) {
    fun message(@PropertyKey(resourceBundle = BUNDLE) key: String, vararg params: Any): String {
        return getMessage(key, *params)
    }

    fun optional(key: String): String? {
        if (!containsKey(key)) return null
        return getMessage(key)
    }
}
