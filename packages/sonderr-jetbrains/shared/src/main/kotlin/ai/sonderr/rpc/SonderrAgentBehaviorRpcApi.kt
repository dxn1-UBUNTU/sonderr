package ai.sonderr.rpc

import ai.sonderr.rpc.dto.AgentDetailDto
import ai.sonderr.rpc.dto.AgentCreateDto
import ai.sonderr.rpc.dto.CommandFileDto
import ai.sonderr.rpc.dto.CommandDto
import ai.sonderr.rpc.dto.McpConfigDto
import ai.sonderr.rpc.dto.McpServerConfigDto
import ai.sonderr.rpc.dto.McpStatusDto
import ai.sonderr.rpc.dto.SkillDto
import com.intellij.platform.rpc.RemoteApiProviderService
import fleet.rpc.RemoteApi
import fleet.rpc.Rpc
import fleet.rpc.remoteApiDescriptor

@Rpc
interface SonderrAgentBehaviorRpcApi : RemoteApi<Unit> {
    companion object {
        suspend fun getInstance(): SonderrAgentBehaviorRpcApi {
            return RemoteApiProviderService.resolve(remoteApiDescriptor<SonderrAgentBehaviorRpcApi>())
        }
    }

    suspend fun agents(directory: String): List<AgentDetailDto>

    suspend fun skills(directory: String): List<SkillDto>

    suspend fun removeSkill(directory: String, location: String): Boolean

    suspend fun reloadSkills(directory: String): Boolean

    suspend fun saveSkill(directory: String, location: String, content: String): Boolean

    suspend fun saveSkills(directory: String, edits: Map<String, String>): Boolean

    suspend fun removeAgent(directory: String, name: String): Boolean

    suspend fun createAgent(directory: String, input: AgentCreateDto): Boolean

    suspend fun commands(directory: String): List<CommandDto>

    suspend fun commandFiles(directory: String): List<CommandFileDto>

    suspend fun removeCommand(directory: String, location: String): Boolean

    suspend fun reloadCommands(directory: String): Boolean

    suspend fun saveCommands(directory: String, edits: Map<String, String>): Boolean

    suspend fun mcpStatus(directory: String): List<McpStatusDto>

    suspend fun mcpConfig(directory: String): Map<String, McpServerConfigDto>

    suspend fun saveMcp(directory: String, name: String, scope: String, config: McpConfigDto?): Boolean

    suspend fun mcpConnect(directory: String, name: String): Boolean

    suspend fun mcpDisconnect(directory: String, name: String): Boolean

    suspend fun mcpAuthenticate(directory: String, name: String): Boolean

    suspend fun claudeCodeCompat(): Boolean

    suspend fun setClaudeCodeCompat(value: Boolean): Boolean
}
