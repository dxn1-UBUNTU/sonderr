package ai.sonderr.backend.rpc

import ai.sonderr.backend.app.LoadError
import ai.sonderr.backend.workspace.AgentData
import ai.sonderr.backend.workspace.AgentInfo
import ai.sonderr.backend.workspace.CommandInfo
import ai.sonderr.backend.workspace.SonderrWorkspaceLoadProgress
import ai.sonderr.backend.workspace.ModelInfo
import ai.sonderr.backend.workspace.ProviderData
import ai.sonderr.backend.workspace.ProviderInfo
import ai.sonderr.backend.workspace.SkillInfo
import ai.sonderr.rpc.dto.ModelAutoRoutingDto
import ai.sonderr.rpc.dto.ModelCacheCostDto
import ai.sonderr.rpc.dto.ModelCapabilitiesDto
import ai.sonderr.rpc.dto.ModelCostDto
import ai.sonderr.rpc.dto.AgentDto
import ai.sonderr.rpc.dto.AgentsDto
import ai.sonderr.rpc.dto.CommandDto
import ai.sonderr.rpc.dto.SonderrWorkspaceLoadProgressDto
import ai.sonderr.rpc.dto.LoadErrorDto
import ai.sonderr.rpc.dto.ModelDto
import ai.sonderr.rpc.dto.ModelInputCapabilitiesDto
import ai.sonderr.rpc.dto.ModelLimitDto
import ai.sonderr.rpc.dto.ModelOptionsDto
import ai.sonderr.rpc.dto.ModelTerminalBenchDto
import ai.sonderr.rpc.dto.ProviderDto
import ai.sonderr.rpc.dto.ProvidersDto
import ai.sonderr.rpc.dto.SkillDto

internal object SonderrWorkspaceDtoMapper {
    fun error(e: LoadError) = LoadErrorDto(
        resource = e.resource,
        status = e.status,
        detail = e.detail,
    )

    fun progress(p: SonderrWorkspaceLoadProgress) = SonderrWorkspaceLoadProgressDto(
        providers = p.providers,
        agents = p.agents,
        commands = p.commands,
        skills = p.skills,
    )

    fun providers(d: ProviderData) = ProvidersDto(
        providers = d.providers.map(::provider),
        connected = d.connected,
        defaults = d.defaults,
    )

    fun agents(d: AgentData) = AgentsDto(
        agents = d.agents.map(::agent),
        all = d.all.map(::agent),
        default = d.default,
    )

    fun command(c: CommandInfo) = CommandDto(
        name = c.name,
        description = c.description,
        agent = c.agent,
        model = c.model,
        variant = c.variant,
        source = c.source,
        hints = c.hints,
        subtask = c.subtask,
    )

    fun skill(s: SkillInfo) = SkillDto(
        name = s.name,
        description = s.description,
        location = s.location,
        content = s.content,
        editable = false,
    )

    private fun provider(p: ProviderInfo) = ProviderDto(
        id = p.id,
        name = p.name,
        source = p.source,
        models = p.models.mapValues { (_, m) -> model(m) },
    )

    private fun model(m: ModelInfo) = ModelDto(
        id = m.id,
        name = m.name,
        inputPrice = m.inputPrice,
        outputPrice = m.outputPrice,
        contextLength = m.contextLength,
        releaseDate = m.releaseDate,
        latest = m.latest,
        attachment = m.attachment,
        reasoning = m.reasoning,
        temperature = m.temperature,
        toolCall = m.toolCall,
        free = m.free,
        byok = m.byok,
        status = m.status,
        recommendedIndex = m.recommendedIndex,
        variants = m.variants,
        limit = m.limit?.let { ModelLimitDto(it.context, it.input, it.output) },
        cost = m.cost?.let { cost ->
            ModelCostDto(
                input = cost.input,
                output = cost.output,
                cache = cost.cache?.let { ModelCacheCostDto(it.read, it.write) },
            )
        },
        capabilities = m.capabilities?.let { cap ->
            ModelCapabilitiesDto(
                reasoning = cap.reasoning,
                input = cap.input?.let { ModelInputCapabilitiesDto(it.text, it.image, it.audio, it.video, it.pdf) },
            )
        },
        options = m.options?.let { ModelOptionsDto(it.description) },
        autoRouting = m.autoRouting?.let { ModelAutoRoutingDto(it.models) },
        terminalBench = m.terminalBench?.let { ModelTerminalBenchDto(it.overallScore, it.avgAttemptCostUsd) },
        mayTrainOnYourPrompts = m.mayTrainOnYourPrompts,
    )

    private fun agent(a: AgentInfo) = AgentDto(
        name = a.name,
        displayName = a.displayName,
        description = a.description,
        mode = a.mode,
        native = a.native,
        hidden = a.hidden,
        color = a.color,
        deprecated = a.deprecated,
    )
}
