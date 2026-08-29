package ai.sonderr.client.agentManager.worktree

import ai.sonderr.client.SonderrNotifications
import ai.sonderr.client.app.sonderrRoot
import ai.sonderr.client.plugin.SonderrBundle
import ai.sonderr.client.telemetry.Telemetry
import ai.sonderr.client.ui.ToolbarButtonAction
import ai.sonderr.client.ui.hoverTextButton
import ai.sonderr.client.util.edt
import ai.sonderr.rpc.dto.RunConfigDto
import ai.sonderr.rpc.dto.RunConfigListDto
import ai.sonderr.rpc.dto.RunStateDto
import com.intellij.execution.runners.ExecutionUtil
import com.intellij.icons.AllIcons
import com.intellij.ide.DataManager
import com.intellij.openapi.Disposable
import com.intellij.openapi.components.service
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.popup.JBPopupFactory
import com.intellij.openapi.util.Disposer
import com.intellij.util.concurrency.annotations.RequiresEdt
import ai.sonderr.log.SonderrLog
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import javax.swing.SwingConstants

/**
 * The worktree editor's Run control: a header button that opens a popup listing the project's
 * supported run configurations (see the backend `WorktreeRunAdapter`) and the processes currently
 * running in this worktree. The backend project key is the resolved backend root, not the frontend
 * project path, which is synthetic in split mode. The button shows the platform live indicator
 * while anything runs; output lives in the native Run tool window.
 *
 * Live state comes from the shared project [WorktreeRunStatusService], so N open worktree editors
 * share a single backend stream instead of each opening their own.
 */
internal class WorktreeRunControl(
    private val project: Project,
    private val parent: Disposable,
    private val worktree: String,
    private val frame: () -> Unit,
) {
    private companion object {
        private val LOG = SonderrLog.create(WorktreeRunControl::class.java)
    }

    private val cs = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private var states: List<RunStateDto> = emptyList() // EDT-only

    // The trailing "▾" marks the button as a dropdown -- matches the arrow suffix convention used
    // by the other pickers (ModelPicker, ReasoningPicker, SessionAccountOverlay).
    val button = hoverTextButton(
        ToolbarButtonAction(AllIcons.Actions.Execute, "${SonderrBundle.message("worktree.run.action")} ▾") { open() },
        tooltip = SonderrBundle.message("worktree.run.tooltip"),
    )

    init {
        val key = normalizeWorktreePath(worktree)
        val handle = project.service<WorktreeRunStatusService>().attach()
        // Register cleanup before launching so the shared-stream ref and the scope are always
        // released even if the collector never gets a chance to run.
        Disposer.register(parent) {
            handle.close()
            cs.cancel()
        }
        cs.launch {
            project.service<WorktreeRunStatusService>().states
                .collectLatest { all ->
                    val mine = all.filter { normalizeWorktreePath(it.worktree) == key }
                    alive { sync(mine) }
                }
        }
    }

    @RequiresEdt
    private fun sync(next: List<RunStateDto>) {
        if (states == next) return
        states = next
        button.icon = if (next.isEmpty()) AllIcons.Actions.Execute else ExecutionUtil.getLiveIndicator(AllIcons.Actions.Execute)
    }

    @RequiresEdt
    private fun open() {
        cs.launch {
            val repo = root() ?: return@launch
            val list = service<SonderrRunService>().configs(repo)
            alive { popup(repo, list) }
        }
    }

    @RequiresEdt
    private fun popup(repo: String, list: RunConfigListDto) {
        val group = WorktreeRunPopup.group(
            configs = list.configs,
            error = list.error,
            states = states,
            run = { cfg -> start(repo, cfg) },
            stop = { state ->
                Telemetry.send("Worktree Run Config Stopped", mapOf("surface" to "worktree_toolbar"))
                service<SonderrRunService>().stopInBackground(repo, state.id, worktree)
            },
            output = { state -> service<SonderrRunService>().focusInBackground(repo, state.id, worktree) },
            frame = frame,
            buildable = list.buildable,
            build = { clean -> build(repo, clean) },
        )
        val popup = JBPopupFactory.getInstance().createActionGroupPopup(
            SonderrBundle.message("worktree.run.popup.title"),
            group,
            DataManager.getInstance().getDataContext(button),
            JBPopupFactory.ActionSelectionAid.SPEEDSEARCH,
            true,
        )
        popup.setAdText(SonderrBundle.message("worktree.run.hint"), SwingConstants.LEFT)
        popup.showUnderneathOf(button)
    }

    private fun start(repo: String, cfg: RunConfigDto) {
        Telemetry.send("Worktree Run Config Started", mapOf("type" to cfg.type, "surface" to "worktree_toolbar"))
        service<SonderrRunService>().runInBackground(repo, cfg.id, worktree) { result ->
            val error = result.error ?: return@runInBackground
            alive { SonderrNotifications.error(project, SonderrBundle.message("worktree.run.failed", cfg.name, error)) }
        }
    }

    private fun build(repo: String, clean: Boolean) {
        val name = SonderrBundle.message(if (clean) "worktree.run.rebuild" else "worktree.run.build")
        Telemetry.send("Worktree Build Started", mapOf("mode" to if (clean) "rebuild" else "build", "surface" to "worktree_toolbar"))
        service<SonderrRunService>().buildInBackground(repo, worktree, clean) { result ->
            val error = result.error ?: return@buildInBackground
            alive { SonderrNotifications.error(project, SonderrBundle.message("worktree.run.failed", name, error)) }
        }
    }

    private fun alive(block: () -> Unit) = edt({ !project.isDisposed && !Disposer.isDisposed(parent) }, block)

    private suspend fun root(): String? = project.sonderrRoot()
}
