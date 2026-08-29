package ai.sonderr.backend.app

import ai.sonderr.jetbrains.api.model.SonderrNotifications200ResponseInner
import ai.sonderr.jetbrains.api.model.SonderrProfile200Response
import ai.sonderr.backend.migration.LegacyMigrationDetection
import ai.sonderr.rpc.dto.ConfigDto

/**
 * Full application lifecycle state, combining CLI transport connection
 * status with data-loading progress.
 *
 * [ConnectionState] stays internal to [SonderrConnectionService] for the
 * transport layer. This sealed class is what the frontend observes.
 */
sealed class SonderrAppState {
    data object Disconnected : SonderrAppState()
    data class Downloading(val percent: Int, val version: String, val platform: String) : SonderrAppState()
    data object Connecting : SonderrAppState()
    data class Loading(val progress: LoadProgress) : SonderrAppState()
    data class MigrationRequired(val detection: LegacyMigrationDetection) : SonderrAppState()
    data class Ready(val data: AppData, val rev: Long = 0) : SonderrAppState()
    data class Error(val message: String, val errors: List<LoadError> = emptyList()) : SonderrAppState()
}

/**
 * Tracks which global data fetches have completed during the [SonderrAppState.Loading] phase.
 */
data class LoadProgress(
    val config: Boolean = false,
    val notifications: Boolean = false,
    val profile: ProfileResult = ProfileResult.PENDING,
)

/** Outcome of the profile fetch. */
enum class ProfileResult { PENDING, LOADED, NOT_LOGGED_IN }

/**
 * Error detail for a single resource that failed to load.
 */
data class LoadError(
    val resource: String,
    val status: Int? = null,
    val detail: String? = null,
)

data class ConfigWarning(
    val path: String,
    val message: String,
    val detail: String? = null,
)

/**
 * All global data that has been successfully loaded.
 * Present only in [SonderrAppState.Ready].
 */
data class AppData(
    val profile: SonderrProfile200Response?,
    val config: ConfigDto,
    val notifications: List<SonderrNotifications200ResponseInner>,
    val warnings: List<ConfigWarning> = emptyList(),
)
