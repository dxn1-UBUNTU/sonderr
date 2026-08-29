package ai.sonderr.client.session.views.tool

import ai.sonderr.client.plugin.SonderrBundle
import ai.sonderr.client.session.model.ToolApproval

data class ToolApprovalNote(
    val decision: String,
    val details: String,
) {
    val text: String get() = listOf(decision, details).filter { it.isNotBlank() }.joinToString(" ")
}

fun describeToolApproval(approval: ToolApproval?): ToolApprovalNote? {
    if (approval == null) return null
    val manual = approval.source == "manual"
    val decision = if (manual) {
        SonderrBundle.message("session.part.tool.approval.manual")
    } else {
        SonderrBundle.message("session.part.tool.approval.auto")
    }
    val parts = buildList {
        if (!manual) source(approval)?.let(::add)
        rule(approval)?.let(::add)
        outside(approval)?.let(::add)
    }
    return ToolApprovalNote(decision, parts.joinToString(" "))
}

private fun source(approval: ToolApproval): String? = when (approval.source) {
    "agent" -> approval.agent
        ?.let { SonderrBundle.message("session.part.tool.approval.source.agent", it) }
        ?: SonderrBundle.message("session.part.tool.approval.source.agent.default")
    "global" -> SonderrBundle.message("session.part.tool.approval.source.global")
    "project" -> SonderrBundle.message("session.part.tool.approval.source.project")
    "yolo" -> SonderrBundle.message("session.part.tool.approval.source.yolo")
    "session" -> SonderrBundle.message("session.part.tool.approval.source.session")
    "default" -> SonderrBundle.message("session.part.tool.approval.source.default")
    else -> null
}

private fun rule(approval: ToolApproval): String? {
    val permission = approval.rulePermission ?: return null
    val pattern = approval.rulePattern ?: return null
    if (permission == "*" && pattern == "*") return null
    return SonderrBundle.message("session.part.tool.approval.rule", permission, pattern)
}

private fun outside(approval: ToolApproval): String? {
    if (!approval.outsideWorkspace) return null
    val path = approval.outsideWorkspacePath?.takeIf { it.isNotBlank() } ?: return null
    return SonderrBundle.message("session.part.tool.approval.outsideWorkspace", tail(path))
}
