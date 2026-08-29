package ai.sonderr.client.settings.autoapprove

import ai.sonderr.client.app.SonderrAppService
import ai.sonderr.client.app.SonderrWorkspaceService
import ai.sonderr.client.plugin.SonderrBundle
import ai.sonderr.client.settings.base.BaseSettingsUi
import ai.sonderr.client.ui.UiStyle
import ai.sonderr.log.SonderrLog
import ai.sonderr.rpc.dto.ConfigPatchDto
import ai.sonderr.rpc.dto.SonderrAppStateDto
import ai.sonderr.rpc.dto.SonderrAppStatusDto
import com.intellij.openapi.components.service
import com.intellij.ui.DocumentAdapter
import com.intellij.ui.SearchTextField
import com.intellij.util.concurrency.annotations.RequiresEdt
import com.intellij.util.ui.JBUI
import kotlinx.coroutines.CoroutineScope
import javax.swing.event.DocumentEvent

internal class AutoApproveSettingsUi(
    cs: CoroutineScope,
    private val app: SonderrAppService = service(),
    workspaces: SonderrWorkspaceService = service(),
    private val picker: LevelPicker = PopupLevelPicker,
) : BaseSettingsUi<AutoApproveContent, PermissionDraft, ConfigPatchDto, SonderrAppStateDto, Unit>(
    cs,
    PermissionDraft(),
    app,
    workspaces,
    loginBanner = false,
) {
    private val search = SearchTextField(false)

    init {
        search.textEditor.emptyText.text = SonderrBundle.message("settings.autoApprove.filter")
        search.border = JBUI.Borders.empty(UiStyle.Gap.md(), 0)
        search.textEditor.document.addDocumentListener(object : DocumentAdapter() {
            override fun textChanged(e: DocumentEvent) = form.filter(search.text)
        })
        setHeader(search)
        startSettings(AutoApproveContent({ updateDraft(it) }, picker))
    }

    override fun change(from: PermissionDraft, to: PermissionDraft): ConfigPatchDto? = patch(from, to)

    override fun save(change: ConfigPatchDto, done: (SonderrAppStateDto?) -> Unit) {
        app.updateConfigAsync(change, done)
    }

    override fun base(result: SonderrAppStateDto): PermissionDraft = permissionDraft(result.config)

    override fun draft(state: SonderrAppStateDto): PermissionDraft = permissionDraft(state.config)

    override fun saved(base: PermissionDraft, draft: PermissionDraft): Boolean = savedMatches(base, draft)

    override fun pendingText(): String = SonderrBundle.message("settings.autoApprove.save.pending")

    override fun failedText(): String = SonderrBundle.message("settings.autoApprove.save.failed")

    override suspend fun loadWorkspace(root: String) = Unit

    override fun applyWorkspace(result: Unit) = Unit

    override fun logSaveStarted(change: ConfigPatchDto) = LOG.info("auto-approve settings save: started")

    override fun logSaveCompleted(change: ConfigPatchDto) = LOG.info("auto-approve settings save: completed")

    override fun logSaveFailed(change: ConfigPatchDto) = LOG.warn("auto-approve settings save: failed")

    override fun logSaveFailedAfterDispose(change: ConfigPatchDto) = LOG.warn("auto-approve settings save: failed after dispose")

    override fun logSaveCompletedAfterDispose(change: ConfigPatchDto) = LOG.info("auto-approve settings save: completed after dispose")

    @RequiresEdt
    override fun syncContent() {
        val ready = appState.status == SonderrAppStatusDto.READY
        val editable = ready && !saving
        form.sync(draft, editable)
        top.hideBanner()
        val err = saveError
        if (saving) {
            showProgress(SonderrBundle.message("settings.autoApprove.save.pending"))
            return
        }
        if (err != null) {
            showError(err)
            return
        }
        if (!ready) {
            showProgress(SonderrBundle.message("settings.cli.unavailable.message"))
            return
        }
        clearProgress()
    }

    private companion object {
        val LOG = SonderrLog.create(AutoApproveSettingsUi::class.java)
    }
}
