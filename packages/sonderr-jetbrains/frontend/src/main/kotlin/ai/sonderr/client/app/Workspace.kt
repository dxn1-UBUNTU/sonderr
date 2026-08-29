package ai.sonderr.client.app

import ai.sonderr.rpc.dto.SonderrWorkspaceStateDto
import kotlinx.coroutines.flow.StateFlow

/**
 * A workspace for a single directory. Mirrors the CLI concept of a
 * workspace — a directory with its providers, agents, commands, skills.
 *
 * Immutable reference — [state] flows internally as the workspace loads.
 * Lifecycle managed by [SonderrWorkspaceService].
 */
class Workspace(
    val directory: String,
    val state: StateFlow<SonderrWorkspaceStateDto>,
    val reload: () -> Unit,
    val refreshConfigFiles: () -> Unit = {},
)
