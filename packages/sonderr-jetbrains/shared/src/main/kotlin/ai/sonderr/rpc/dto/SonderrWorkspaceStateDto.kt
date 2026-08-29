package ai.sonderr.rpc.dto

import kotlinx.serialization.Serializable

@Serializable
enum class SonderrWorkspaceStatusDto {
    PENDING,
    LOADING,
    READY,
    UNSUPPORTED,
    MISSING,
    ERROR,
}

@Serializable
data class SonderrWorkspaceLoadProgressDto(
    val providers: Boolean = false,
    val agents: Boolean = false,
    val commands: Boolean = false,
    val skills: Boolean = false,
)

@Serializable
data class SonderrWorkspaceStateDto(
    val status: SonderrWorkspaceStatusDto,
    val progress: SonderrWorkspaceLoadProgressDto? = null,
    val providers: ProvidersDto? = null,
    val agents: AgentsDto? = null,
    val commands: List<CommandDto> = emptyList(),
    val skills: List<SkillDto> = emptyList(),
    val error: String? = null,
    val errors: List<LoadErrorDto> = emptyList(),
)

@Serializable
data class ModelsWorkspaceDto(
    val providers: ProvidersDto? = null,
    val agents: AgentsDto? = null,
    val errors: List<LoadErrorDto> = emptyList(),
)
