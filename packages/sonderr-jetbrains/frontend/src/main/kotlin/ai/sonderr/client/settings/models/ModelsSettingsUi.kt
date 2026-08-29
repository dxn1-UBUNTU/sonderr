package ai.sonderr.client.settings.models

import ai.sonderr.client.app.SonderrAppService
import ai.sonderr.client.app.SonderrWorkspaceService
import ai.sonderr.client.plugin.SonderrBundle
import ai.sonderr.client.session.ui.ReasoningPicker
import ai.sonderr.client.session.ui.model.ModelPicker
import ai.sonderr.client.session.ui.model.modelItems
import ai.sonderr.client.settings.base.BaseContentPanel
import ai.sonderr.client.settings.base.BaseSettingsUi
import ai.sonderr.client.settings.base.SettingsBannerKind
import ai.sonderr.client.settings.base.SettingsRow
import ai.sonderr.client.settings.base.SettingsRows
import ai.sonderr.client.ui.layout.HAlign
import ai.sonderr.client.ui.layout.VAlign
import ai.sonderr.client.ui.layout.align
import ai.sonderr.log.SonderrLog
import ai.sonderr.rpc.dto.AgentDto
import ai.sonderr.rpc.dto.ConfigPatchDto
import ai.sonderr.rpc.dto.SonderrAppStateDto
import ai.sonderr.rpc.dto.SonderrAppStatusDto
import ai.sonderr.rpc.dto.LoadErrorDto
import ai.sonderr.rpc.dto.ModelStateDto
import ai.sonderr.rpc.dto.ModelsWorkspaceDto
import ai.sonderr.rpc.dto.ProvidersDto
import com.intellij.openapi.components.service
import com.intellij.util.concurrency.annotations.RequiresEdt
import kotlinx.coroutines.CoroutineScope

internal class ModelsSettingsUi(
    cs: CoroutineScope,
    private val app: SonderrAppService = service(),
    private val workspaces: SonderrWorkspaceService = service(),
    directory: String? = null,
) : BaseSettingsUi<ModelsSettingsContent, ModelsDraft, ConfigPatchDto, SonderrAppStateDto, ModelsWorkspaceDto>(
    cs,
    ModelsDraft(),
    app,
    workspaces,
    directory,
) {

    companion object {
        private val LOG = SonderrLog.create(ModelsSettingsUi::class.java)
    }

    private val defaults get() = form.defaults
    private val small get() = form.small
    private val subagent get() = form.subagent
    private val variant get() = form.variant
    private val variantRow get() = form.variantRow
    private val pickers get() = form.pickers

    private var providers: ProvidersDto? = null
    private var agents: List<AgentDto> = emptyList()
    private var errors: List<LoadErrorDto> = emptyList()
    private var allItems: List<ModelPicker.Item> = emptyList()

    init {
        startSettings(ModelsSettingsContent(app, { updateDraft(it) }, ::selectSubagent))
    }

    override fun change(from: ModelsDraft, to: ModelsDraft): ConfigPatchDto? = patch(from, to).takeIf {
        it.values.isNotEmpty() || it.agents.isNotEmpty()
    }

    override fun save(change: ConfigPatchDto, done: (SonderrAppStateDto?) -> Unit) {
        app.updateConfigAsync(change, done)
    }

    override fun base(result: SonderrAppStateDto): ModelsDraft = modelsDraft(result.config, agents)

    override fun draft(state: SonderrAppStateDto): ModelsDraft = modelsDraft(state.config, agents)

    override fun saved(base: ModelsDraft, draft: ModelsDraft): Boolean = savedMatches(base, draft)

    override fun pendingText(): String = SonderrBundle.message("settings.models.save.pending")

    override fun failedText(): String = SonderrBundle.message("settings.models.save.failed")

    override fun logSaveStarted(change: ConfigPatchDto) = LOG.info("model settings save: started ${summary(change)}")

    override fun logSaveCompleted(change: ConfigPatchDto) = LOG.info("model settings save: completed ${summary(change)}")

    override fun logSaveFailed(change: ConfigPatchDto) = LOG.warn("model settings save: failed ${summary(change)}")

    override fun logSaveFailedAfterDispose(change: ConfigPatchDto) = LOG.warn("model settings save: failed after dispose ${summary(change)}")

    override fun logSaveCompletedAfterDispose(change: ConfigPatchDto) = LOG.info("model settings save: completed after dispose ${summary(change)}")

    override fun unavailable(state: SonderrAppStateDto) {
        if (!workspaceLoaded && providers == null) {
            agents = emptyList()
            errors = emptyList()
        }
    }

    override fun models(state: ModelStateDto) = Unit

    override fun clearWorkspaceError() {
        errors = emptyList()
    }

    override suspend fun loadWorkspace(root: String): ModelsWorkspaceDto = workspaces.models(root)

    override fun applyWorkspace(result: ModelsWorkspaceDto) {
        providers = result.providers
        agents = result.agents?.agents ?: emptyList()
        errors = result.errors
    }

    @RequiresEdt
    override fun syncContent() {
        allItems = items(false)
        val smallItems = items(true)
        val state = modelsStatus(
            ready = appState.status == SonderrAppStatusDto.READY && hasProjectDirectory,
            loading = workspaceLoading || (appState.status == SonderrAppStatusDto.READY && !workspaceLoaded && hasProjectDirectory),
            providers = providers,
            items = allItems.size,
            errors = errors,
            saving = saving,
        )
        val ready = state == ModelsStatus.READY || state == ModelsStatus.MODES_FAILED
        val editable = !saving && (ready || state == ModelsStatus.LOADING)
        val bannerVisible = modelsLoginBannerVisible(
            ready = appState.status == SonderrAppStatusDto.READY,
            authenticated = appState.profile != null,
        )
        syncModelBanner(state, bannerVisible)
        val err = saveError
        if (saving || state == ModelsStatus.SAVING) {
            showProgress(SonderrBundle.message("settings.models.save.pending"))
        } else if (err != null) {
            showError(err)
        } else if (state == ModelsStatus.UNAVAILABLE || state == ModelsStatus.LOADING) {
            showProgress(SonderrBundle.message("settings.models.loading"))
        } else {
            clearProgress()
        }
        var layout = false
        defaults.setItems(allItems, draft.model)
        small.setItems(smallItems, draft.small)
        subagent.setItems(allItems, draft.subagent)
        listOf(defaults, small, subagent).forEach { it.isEnabled = editable }
        layout = syncVariant(editable) || layout
        layout = syncModes(editable) || layout
        if (layout) {
            revalidate()
            repaint()
        }
    }

    @RequiresEdt
    private fun syncModelBanner(state: ModelsStatus, login: Boolean) {
        syncLoginBanner(login) {
            if ((saving || state == ModelsStatus.LOADING || state == ModelsStatus.SAVING) && top.isVisible) return@syncLoginBanner
            when (state) {
                ModelsStatus.LOAD_FAILED -> top.showBanner(
                    SonderrBundle.message("settings.models.load.failed"),
                    emptyList(),
                    SettingsBannerKind.ERROR,
                )
                ModelsStatus.NO_PROVIDERS -> top.showBanner(SonderrBundle.message("settings.models.noProviders"), emptyList())
                ModelsStatus.MODES_FAILED -> top.showBanner(SonderrBundle.message("settings.models.modes.failed"), emptyList())
                else -> top.hideBanner()
            }
        }
    }

    private fun items(includeSmall: Boolean): List<ModelPicker.Item> = modelItems(providers, includeSmall)

    @RequiresEdt
    private fun syncVariant(ready: Boolean): Boolean {
        val item = allItems.firstOrNull { it.key == draft.subagent || it.id == draft.subagent }
        val valid = item?.variants.orEmpty()
        if (draft.variant != null && draft.variant !in valid) draft = draft.copy(variant = valid.firstOrNull())
        if (draft.subagent != null && valid.isEmpty() && draft.variant != null) draft = draft.copy(variant = null)
        variant.setItems(valid.map { ReasoningPicker.Item(it, variantTitle(it)) }, draft.variant)
        variant.isEnabled = ready && valid.isNotEmpty()
        val visible = valid.isNotEmpty()
        val changed = variantRow.isVisible != visible
        variantRow.isVisible = visible
        variant.isVisible = visible
        return changed
    }

    @RequiresEdt
    private fun syncModes(ready: Boolean): Boolean {
        var layout = false
        val names = agents.map { it.name }
        if (names != pickers.keys.toList()) {
            form.modes.removeAll()
            pickers.clear()
            agents.forEach { agent ->
                val picker = ModelSettingPicker()
                picker.picker.favorites = { app.favorites.value }
                picker.picker.onFavoriteToggle = { app.toggleModelFavorite(it.provider, it.id) }
                picker.picker.onSelect = { item -> updateDraft { copy(agents = this.agents + (agent.name to item.key)) } }
                picker.picker.onClear = { updateDraft { copy(agents = this.agents + (agent.name to null)) } }
                pickers[agent.name] = picker
                form.modes.row(agent.name, SettingsRow(
                    agent.displayName ?: title(agent.name),
                    agent.description,
                    picker,
                ))
            }
            layout = true
        }
        agents.forEach { agent ->
            val name = agent.name
            val picker = pickers[name] ?: return@forEach
            form.modes.update(name, agent.displayName ?: title(name), agent.description, picker)
            val value = draft.agents[name]
            picker.setItems(allItems, value)
            picker.isEnabled = ready
        }
        return layout
    }

    private fun selectSubagent(item: ModelPicker.Item) {
        val variant = if (draft.subagent == item.key && draft.variant in item.variants) draft.variant else item.variants.firstOrNull()
        updateDraft { copy(subagent = item.key, variant = variant) }
    }
}

private fun summary(patch: ConfigPatchDto): String {
    val values = patch.values.keys.sorted().joinToString(",").ifEmpty { "none" }
    return "values=$values agents=${patch.agents.size}"
}

internal class ModelsSettingsContent(
    app: SonderrAppService,
    update: (ModelsDraft.() -> ModelsDraft) -> Unit,
    select: (ModelPicker.Item) -> Unit,
) : BaseContentPanel() {
    val defaults = ModelSettingPicker()
    val small = ModelSettingPicker()
    val subagent = ModelSettingPicker()
    val variant = ReasoningPicker()
    val variantRow = SettingsRow(
        SonderrBundle.message("settings.models.subagentVariant.title"),
        SonderrBundle.message("settings.models.subagentVariant.description"),
        variant.align(HAlign.RIGHT, VAlign.CENTER),
    )
    val modes: SettingsRows
    val pickers = linkedMapOf<String, ModelSettingPicker>()

    init {
        defaults.picker.onSelect = { update { copy(model = it.key) } }
        defaults.picker.onClear = { update { copy(model = null) } }
        small.picker.onSelect = { update { copy(small = it.key) } }
        small.picker.onClear = { update { copy(small = null) } }
        small.picker.includeSmall = true
        subagent.picker.onSelect = { item -> select(item) }
        subagent.picker.onClear = { update { copy(subagent = null, variant = null) } }
        variant.onSelect = { item -> update { copy(variant = item.id) } }
        listOf(defaults, small, subagent).forEach { picker ->
            picker.picker.favorites = { app.favorites.value }
            picker.picker.onFavoriteToggle = { app.toggleModelFavorite(it.provider, it.id) }
        }

        val rows = SettingsRows()
        next(rows)
        rows.row(SettingsRow(
            SonderrBundle.message("settings.models.defaultModel.title"),
            SonderrBundle.message("settings.models.defaultModel.description"),
            defaults,
        ))
        rows.row(SettingsRow(
            SonderrBundle.message("settings.models.smallModel.title"),
            SonderrBundle.message("settings.models.smallModel.description"),
            small,
        ))
        rows.row(SettingsRow(
            SonderrBundle.message("settings.models.subagentModel.title"),
            SonderrBundle.message("settings.models.subagentModel.description"),
            subagent,
        ))
        rows.row(variantRow)
        modes = section(
            SonderrBundle.message("settings.models.modeModels.title"),
            SonderrBundle.message("settings.models.modeModels.description"),
        )
    }
}

private fun variantTitle(value: String): String = value.replaceFirstChar { it.titlecase() }

private fun title(value: String): String = value.replace('-', ' ').replace('_', ' ').replaceFirstChar { it.titlecase() }
