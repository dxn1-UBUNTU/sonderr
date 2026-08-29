package ai.sonderr.client.actions

import com.intellij.openapi.actionSystem.ActionPlaces

internal object SonderrActionPlaces {
    const val CONNECTION_RETRY = "Sonderr.ConnectionRetry"

    fun connectionRetryPopup() = ActionPlaces.getActionGroupPopupPlace(CONNECTION_RETRY)
}
