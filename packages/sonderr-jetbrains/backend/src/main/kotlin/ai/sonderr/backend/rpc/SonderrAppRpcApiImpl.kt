@file:Suppress("UnstableApiUsage")

package ai.sonderr.backend.rpc

import ai.sonderr.backend.app.SonderrAppState
import ai.sonderr.backend.app.SonderrBackendAppService
import ai.sonderr.backend.telemetry.SonderrBackendTelemetry
import ai.sonderr.backend.app.ConfigWarning
import ai.sonderr.backend.app.LoadError
import ai.sonderr.backend.app.LoadProgress
import ai.sonderr.backend.app.ProfileResult
import ai.sonderr.backend.cli.SonderrCliPlatform
import ai.sonderr.backend.cli.SonderrProps
import ai.sonderr.backend.cli.SonderrRepoCli
import ai.sonderr.jetbrains.api.model.SonderrProfile200Response
import ai.sonderr.log.SonderrLog
import ai.sonderr.log.LogConfig
import ai.sonderr.rpc.dto.ConfigPatchDto
import ai.sonderr.rpc.SonderrAppRpcApi
import ai.sonderr.rpc.dto.ConfigWarningDto
import ai.sonderr.rpc.dto.DeviceAuthDto
import ai.sonderr.rpc.dto.HealthDto
import ai.sonderr.rpc.dto.SonderrAppStateDto
import ai.sonderr.rpc.dto.SonderrAppStatusDto
import ai.sonderr.rpc.dto.LoadErrorDto
import ai.sonderr.rpc.dto.LoadProgressDto
import ai.sonderr.rpc.dto.LogConfigDto
import ai.sonderr.rpc.dto.LogFileDto
import ai.sonderr.rpc.dto.ModelFavoriteUpdateDto
import ai.sonderr.rpc.dto.ModelSelectionUpdateDto
import ai.sonderr.rpc.dto.ModelStateDto
import ai.sonderr.rpc.dto.ModelVariantUpdateDto
import ai.sonderr.rpc.dto.ProfileBalanceDto
import ai.sonderr.rpc.dto.ProfileDto
import ai.sonderr.rpc.dto.ProfileSonderrPassDto
import ai.sonderr.rpc.dto.ProfileOrganizationDto
import ai.sonderr.rpc.dto.ProfileStatusDto
import ai.sonderr.rpc.dto.TelemetryCaptureDto
import com.intellij.openapi.components.service
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withContext
import java.nio.file.Files

/**
 * Backend implementation of [SonderrAppRpcApi].
 *
 * Delegates directly to the app-level [SonderrBackendAppService] —
 * no project resolution needed since all operations are app-scoped.
 */
class SonderrAppRpcApiImpl : SonderrAppRpcApi {

    private val app: SonderrBackendAppService get() = service()

    override suspend fun connect() = app.connect()

    override suspend fun state(): Flow<SonderrAppStateDto> =
        app.appState.map(::dto).distinctUntilChanged()

    override suspend fun health(): HealthDto = app.health()

    override suspend fun cliVersion(): String = SonderrProps.cliVersion()

    override suspend fun cliPlatform(): String = SonderrCliPlatform.current()

    override suspend fun cliBundled(): Boolean = SonderrRepoCli.available()

    override suspend fun retry() = app.retry()

    override suspend fun restart() = app.restart()

    override suspend fun reinstall() = app.reinstall()

    override suspend fun modelState(): ModelStateDto {
        app.requireReady()
        return app.models.state()
    }

    override suspend fun updateModelFavorite(update: ModelFavoriteUpdateDto): ModelStateDto {
        app.requireReady()
        return app.models.favorite(update)
    }

    override suspend fun updateModelSelection(update: ModelSelectionUpdateDto): ModelStateDto {
        app.requireReady()
        return app.models.selection(update)
    }

    override suspend fun clearModelSelection(agent: String): ModelStateDto {
        app.requireReady()
        return app.models.clear(agent)
    }

    override suspend fun updateModelVariant(update: ModelVariantUpdateDto): ModelStateDto {
        app.requireReady()
        return app.models.variant(update)
    }

    override suspend fun updateConfig(patch: ConfigPatchDto): SonderrAppStateDto {
        app.requireReady()
        return appStateDto(app.updateConfig(patch))
    }

    override suspend fun applyLogConfig(config: LogConfigDto) {
        LogConfig.apply(config.level, config.contentMode, config.previewMax)
    }

    override suspend fun backendLogFile(): LogFileDto? = withContext(Dispatchers.IO) {
        val path = SonderrLog.logFile()
        if (!Files.exists(path)) return@withContext null
        LogFileDto(path.fileName.toString(), Files.readString(path))
    }

    override suspend fun refreshProfile(): ProfileDto? = app.refreshProfile()?.let(::profileDto)

    override suspend fun startLogin(directory: String?): DeviceAuthDto = app.startLogin(directory)

    override suspend fun completeLogin(directory: String?): ProfileDto? = app.completeLogin(directory)?.let(::profileDto)

    override suspend fun logout(): Boolean = app.logout()

    override suspend fun setOrganization(organizationId: String?): ProfileDto? =
        app.setOrganization(organizationId)?.let(::profileDto)

    override suspend fun captureTelemetry(capture: TelemetryCaptureDto) {
        service<SonderrBackendTelemetry>().capture(app.http, app.port, capture.event, capture.properties)
    }

    private fun dto(state: SonderrAppState): SonderrAppStateDto =
        appStateDto(state)
}

internal fun appStateDto(state: SonderrAppState): SonderrAppStateDto =
    when (state) {
        SonderrAppState.Disconnected -> SonderrAppStateDto(SonderrAppStatusDto.DISCONNECTED)
        is SonderrAppState.Downloading -> SonderrAppStateDto(
            status = SonderrAppStatusDto.DOWNLOADING,
            downloadPercent = state.percent,
            downloadVersion = state.version,
            downloadPlatform = state.platform,
        )
        SonderrAppState.Connecting -> SonderrAppStateDto(SonderrAppStatusDto.CONNECTING)
        is SonderrAppState.Loading -> SonderrAppStateDto(
            status = SonderrAppStatusDto.LOADING,
            progress = progress(state.progress),
        )
        is SonderrAppState.MigrationRequired -> SonderrAppStateDto(
            status = SonderrAppStatusDto.MIGRATION_REQUIRED,
            migration = MigrationRpcMapper.toDto(state.detection),
        )
        is SonderrAppState.Ready -> SonderrAppStateDto(
            status = SonderrAppStatusDto.READY,
            progress = LoadProgressDto(
                config = true,
                notifications = true,
                profile = if (state.data.profile != null) ProfileStatusDto.LOADED
                    else ProfileStatusDto.NOT_LOGGED_IN,
            ),
            warnings = state.data.warnings.map(::warning),
            config = state.data.config,
            profile = state.data.profile?.let(::profileDto),
        )
        is SonderrAppState.Error -> SonderrAppStateDto(
            status = SonderrAppStatusDto.ERROR,
            error = state.message,
            errors = state.errors.map(::error),
        )
    }

internal fun profileDto(p: SonderrProfile200Response): ProfileDto = ProfileDto(
    email = p.profile.email,
    name = p.profile.name,
    organizations = p.profile.organizations.orEmpty().map { org ->
        ProfileOrganizationDto(id = org.id, name = org.name, role = org.role)
    },
    // The pinned CLI release does not expose hasPersonalAccount yet, so default to
    // showing the personal account. Flip back to p.profile.hasPersonalAccount once a
    // CLI release ships the field.
    hasPersonalAccount = true,
    balance = p.balance?.balance?.let { ProfileBalanceDto(balance = it) },
    sonderrPass = p.sonderrPass?.let {
        val base = it.currentPeriodBaseCreditsUsd ?: return@let null
        val usage = it.currentPeriodUsageUsd ?: return@let null
        val bonus = it.currentPeriodBonusCreditsUsd ?: return@let null
        ProfileSonderrPassDto(
            currentPeriodBaseCreditsUsd = base,
            currentPeriodUsageUsd = usage,
            currentPeriodBonusCreditsUsd = bonus,
            nextBillingAt = it.nextBillingAt,
        )
    },
    currentOrgId = p.currentOrgId,
)

private fun progress(p: LoadProgress) = LoadProgressDto(
    config = p.config,
    notifications = p.notifications,
    profile = when (p.profile) {
        ProfileResult.PENDING -> ProfileStatusDto.PENDING
        ProfileResult.LOADED -> ProfileStatusDto.LOADED
        ProfileResult.NOT_LOGGED_IN -> ProfileStatusDto.NOT_LOGGED_IN
    },
)

private fun error(e: LoadError) = LoadErrorDto(
    resource = e.resource,
    status = e.status,
    detail = e.detail,
)

private fun warning(w: ConfigWarning) = ConfigWarningDto(
    path = w.path,
    message = w.message,
    detail = w.detail,
)
