package ai.sonderr.client.settings.agents

import ai.sonderr.client.app.SonderrAgentBehaviorService
import ai.sonderr.client.plugin.SonderrBundle
import ai.sonderr.client.settings.base.SettingsListPanel
import ai.sonderr.client.settings.base.SettingsMessageException
import ai.sonderr.client.ui.UiStyle
import ai.sonderr.client.ui.layout.Stack
import ai.sonderr.client.ui.list.ActiveListBadge
import ai.sonderr.client.ui.list.ActiveListCell
import ai.sonderr.client.ui.list.ActiveListConfig
import ai.sonderr.client.ui.list.ActiveListItem
import ai.sonderr.client.ui.list.ActiveListSelection
import ai.sonderr.log.SonderrLog
import ai.sonderr.rpc.dto.McpConfigDto
import ai.sonderr.rpc.dto.McpServerConfigDto
import ai.sonderr.rpc.dto.McpStatusDto
import com.intellij.icons.AllIcons
import com.intellij.openapi.application.EDT
import com.intellij.openapi.application.ModalityState
import com.intellij.openapi.application.asContextElement
import com.intellij.openapi.components.service
import com.intellij.openapi.ui.Messages
import com.intellij.ui.components.JBLabel
import com.intellij.util.ui.UIUtil
import javax.swing.JComponent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

private val edt = Dispatchers.EDT + ModalityState.any().asContextElement()

class McpConfigurable : AgentBehaviorConfigurableBase<JComponent>() {
    override fun getId(): String = ID
    override fun getDisplayName(): String = SonderrBundle.message("settings.agentBehavior.mcp.displayName")
    override fun create(cs: CoroutineScope, dir: String): JComponent = McpSettingsUi(cs, dir)
    override fun update(ui: JComponent, dir: String) {
        (ui as? McpSettingsUi)?.setDirectory(dir)
    }
    override fun scrollReadyShell() = false

    companion object { const val ID = "ai.sonderr.jetbrains.settings.agentBehavior.mcp" }
}

internal class McpSettingsUi(
    cs: CoroutineScope,
    dir: String,
    private val create: (String, McpConfigDto) -> McpEditDialogHandle = ::McpEditDialog,
) : SettingsListPanel(cs, ActiveListConfig.Equal.copy(description = false)) {
    private var dir = dir

    private var servers: Map<String, McpServerConfigDto> = emptyMap()

    init {
        start()
    }

    fun setDirectory(value: String) {
        if (value == dir) return
        dir = value
        reload()
    }

    override suspend fun fetch(): List<ActiveListItem> {
        val behavior = service<SonderrAgentBehaviorService>()
        val cfg = behavior.mcpConfig(dir)
        withContext(edt) { servers = cfg }
        val statuses = if (dir.isBlank()) {
            LOG.warn("mcp settings fetch skipped runtime status: missing project directory config=${cfg.size}")
            emptyMap()
        } else {
            behavior.mcpStatus(dir).associateBy { it.name }
        }
        val names = (cfg.keys + statuses.keys).sorted()
        LOG.info("mcp settings fetch dir=$dir config=${cfg.size} runtime=${statuses.size} total=${names.size}")
        if (names.isEmpty()) {
            LOG.warn("mcp settings fetch returned no servers dir=$dir")
        }
        return names.map { name -> item(name, cfg[name]?.config, statuses[name]) }
    }

    override fun onCell(key: String, cellId: String) {
        when (cellId) {
            CONNECT_CELL -> mutate(key) { service<SonderrAgentBehaviorService>().mcpConnect(dir, key) }
            DISCONNECT_CELL -> mutate(key) { service<SonderrAgentBehaviorService>().mcpDisconnect(dir, key) }
            AUTH_CELL -> mutate(key) { service<SonderrAgentBehaviorService>().mcpAuthenticate(dir, key) }
            EDIT_CELL -> edit(key)
            REMOVE_CELL -> remove(key)
        }
    }

    override fun searchPlaceholder() = SonderrBundle.message("settings.agentBehavior.mcp.search")

    override fun toolbarRight(): JComponent = Stack.horizontal(UiStyle.Gap.sm())
        .next(JBLabel(SonderrBundle.message("settings.agentBehavior.mcp.addHint")).apply {
            foreground = UIUtil.getContextHelpForeground()
        })

    private fun item(name: String, cfg: McpConfigDto?, status: McpStatusDto?) = object : ActiveListItem {
        override val key = name
        override val title = name
        override val description = description(cfg, status)
        override val badges = badges(cfg, status)
        override val cells = cells(cfg, status)
    }

    private fun description(cfg: McpConfigDto?, status: McpStatusDto?): String? {
        val parts = listOfNotNull(
            cfg?.url?.takeIf { it.isNotBlank() },
            cfg?.command?.takeIf { it.isNotEmpty() }?.joinToString(" "),
            status?.error?.takeIf { it.isNotBlank() },
        )
        return parts.joinToString(" - ").takeIf { it.isNotBlank() }
    }

    private fun badges(cfg: McpConfigDto?, status: McpStatusDto?): List<ActiveListBadge> = listOfNotNull(
        ActiveListBadge(statusLabel(status), statusStyle(status)).takeIf { status != null },
        ActiveListBadge(cfg?.type ?: SonderrBundle.message("settings.agentBehavior.mcp.configured")).takeIf { cfg != null },
    )

    private fun cells(cfg: McpConfigDto?, status: McpStatusDto?): List<ActiveListCell> = listOfNotNull(
        connect(status?.status == CONNECTED),
        ActiveListCell(AUTH_CELL, SonderrBundle.message("settings.agentBehavior.mcp.signIn")).takeIf {
            status?.status == NEEDS_AUTH
        },
        ActiveListCell(
            EDIT_CELL,
            SonderrBundle.message("settings.agentBehavior.edit"),
            primary = true,
        ).takeIf { cfg != null },
        ActiveListCell(
            REMOVE_CELL,
            SonderrBundle.message("common.delete"),
            icon = AllIcons.Actions.GC,
            iconOnly = true,
        ).takeIf { cfg != null },
    )

    private fun connect(connected: Boolean) = ActiveListCell(
        if (connected) DISCONNECT_CELL else CONNECT_CELL,
        if (connected) SonderrBundle.message("settings.agentBehavior.mcp.disconnect")
        else SonderrBundle.message("settings.agentBehavior.mcp.connect"),
    )

    private fun edit(name: String) {
        val server = servers[name] ?: return
        val dialog = create(name, server.config)
        if (!dialog.showAndGet()) return
        val next = dialog.result()
        mutateAndReload(ActiveListSelection.Key(name)) {
            if (!service<SonderrAgentBehaviorService>().saveMcp(dir, name, server.scope, next)) {
                throw SettingsMessageException(SonderrBundle.message("settings.agentBehavior.save.failed"))
            }
            true
        }
    }

    private fun remove(name: String) {
        val result = Messages.showYesNoDialog(
            SonderrBundle.message("settings.agentBehavior.mcp.delete.message", name),
            SonderrBundle.message("settings.agentBehavior.mcp.delete.title"),
            SonderrBundle.message("common.delete"),
            Messages.getCancelButton(),
            Messages.getQuestionIcon(),
        )
        if (result != Messages.YES) return
        val scope = servers[name]?.scope ?: return
        mutateAndReload(ActiveListSelection.Slide) {
            if (!service<SonderrAgentBehaviorService>().saveMcp(dir, name, scope, null)) {
                throw SettingsMessageException(SonderrBundle.message("settings.agentBehavior.save.failed"))
            }
            true
        }
    }

    private fun mutate(name: String, block: suspend () -> Boolean) {
        mutateAndReload(ActiveListSelection.Key(name)) {
            if (!block()) throw SettingsMessageException(SonderrBundle.message("settings.agentBehavior.mcp.action.failed"))
            true
        }
    }

    private companion object {
        const val CONNECTED = "connected"
        const val FAILED = "failed"
        const val NEEDS_AUTH = "needs_auth"
        const val NEEDS_REGISTRATION = "needs_client_registration"
        const val DISABLED = "disabled"
        const val CONNECT_CELL = "connect"
        const val DISCONNECT_CELL = "disconnect"
        const val AUTH_CELL = "auth"
        const val EDIT_CELL = "edit"
        const val REMOVE_CELL = "remove"
        val LOG = SonderrLog.create(McpSettingsUi::class.java)

        fun statusLabel(status: McpStatusDto?): String {
            val value = status?.status ?: return ""
            return when (value) {
                CONNECTED -> SonderrBundle.message("settings.agentBehavior.mcp.status.connected")
                FAILED -> SonderrBundle.message("settings.agentBehavior.mcp.status.failed")
                NEEDS_AUTH -> SonderrBundle.message("settings.agentBehavior.mcp.status.needsAuth")
                NEEDS_REGISTRATION -> SonderrBundle.message("settings.agentBehavior.mcp.status.needsRegistration")
                DISABLED -> SonderrBundle.message("settings.agentBehavior.mcp.status.disabled")
                else -> value
            }
        }

        fun statusStyle(status: McpStatusDto?): UiStyle.Badge.Style {
            return when (status?.status) {
                CONNECTED -> UiStyle.Badge.Highlight
                FAILED,
                NEEDS_AUTH,
                NEEDS_REGISTRATION,
                -> UiStyle.Badge.Alert
                else -> UiStyle.Badge.Secondary
            }
        }
    }
}
