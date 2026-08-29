package ai.sonderr.client.ui

import ai.sonderr.client.plugin.SonderrBundle
import ai.sonderr.rpc.dto.GhState
import ai.sonderr.rpc.dto.WorktreePrDto
import com.intellij.xml.util.XmlStringUtil

/**
 * Shared PR badge helpers used by both the Agent Manager worktree views and the chat session header.
 * Lives in the neutral `ui` package so `session/ui/header/` does not depend on the Agent Manager
 * package.
 */

internal fun style(state: GhState): UiStyle.Badge.Style = when (state) {
    GhState.OPEN -> UiStyle.Badge.PullRequestOpen
    GhState.DRAFT -> UiStyle.Badge.PullRequestDraft
    GhState.MERGED -> UiStyle.Badge.PullRequestMerged
    GhState.CLOSED -> UiStyle.Badge.PullRequestClosed
}

internal fun stateLabel(state: GhState): String = when (state) {
    GhState.OPEN -> SonderrBundle.message("worktree.pr.state.open")
    GhState.DRAFT -> SonderrBundle.message("worktree.pr.state.draft")
    GhState.MERGED -> SonderrBundle.message("worktree.pr.state.merged")
    GhState.CLOSED -> SonderrBundle.message("worktree.pr.state.closed")
}

internal fun prTooltip(pull: WorktreePrDto, name: String? = null): String {
    val title = pull.title.trim()
    val head = buildString {
        append(stateLabel(pull.state))
        append(" #")
        append(pull.number)
        if (title.isNotBlank()) {
            append(' ')
            append(title)
        }
    }
    val lines = listOfNotNull(
        head,
        name?.takeIf { title.isNotBlank() }?.let { "($it)" },
        SonderrBundle.message("worktree.pr.tooltip.open"),
    ).map(XmlStringUtil::escapeString)
    return XmlStringUtil.wrapInHtml(lines.joinToString("<br>"))
}
