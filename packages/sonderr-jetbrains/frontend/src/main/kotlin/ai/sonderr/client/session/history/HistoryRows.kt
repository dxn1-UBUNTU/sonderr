package ai.sonderr.client.session.history

import ai.sonderr.client.plugin.SonderrBundle
import ai.sonderr.client.session.SessionActivityKind
import ai.sonderr.client.ui.list.ActiveListBadge
import ai.sonderr.client.ui.list.ActiveListCell
import ai.sonderr.client.ui.list.ActiveListItem
import ai.sonderr.client.ui.list.activeListDeleteCell
import ai.sonderr.client.ui.list.activeListRenameCell

internal data class LocalHistoryRow(
    val item: LocalHistoryItem,
    private val text: String,
    private val kind: SessionActivityKind?,
    override val section: String?,
    private val deleting: Boolean,
) : ActiveListItem {
    override val key: String get() = item.id
    override val title: String get() = text
    override val trailing: String get() = HistoryTime.relative(item)
    override val search: String get() = listOfNotNull(text, item.id, item.directory).joinToString(" ")
    override val progress: String? get() = if (deleting) SonderrBundle.message("common.deleting") else null
    override val badges: List<ActiveListBadge>
        get() = listOfNotNull(kind?.let { ActiveListBadge(it.label(), it.style()) })
    override val cells: List<ActiveListCell>
        get() = listOf(activeListRenameCell(), activeListDeleteCell())
}

internal data class CloudHistoryRow(
    val item: CloudHistoryItem,
    private val text: String,
    private val kind: SessionActivityKind?,
    override val section: String?,
) : ActiveListItem {
    override val key: String get() = item.id
    override val title: String get() = text
    override val trailing: String get() = HistoryTime.relative(item)
    override val search: String get() = listOf(text, item.id).joinToString(" ")
    override val badges: List<ActiveListBadge>
        get() = listOfNotNull(kind?.let { ActiveListBadge(it.label(), it.style()) })
}

internal fun localHistoryRows(
    items: List<LocalHistoryItem>,
    snapshot: HistoryActivitySnapshot,
    deleting: (LocalHistoryItem) -> Boolean,
): List<LocalHistoryRow> {
    return items.mapIndexed { idx, item ->
        LocalHistoryRow(
            item = item,
            text = snapshot.titles[item.id] ?: title(item),
            kind = snapshot.activity[item.id],
            section = historySection(items, idx),
            deleting = deleting(item),
        )
    }
}

internal fun cloudHistoryRows(
    items: List<CloudHistoryItem>,
    snapshot: HistoryActivitySnapshot,
): List<CloudHistoryRow> {
    return items.mapIndexed { idx, item ->
        CloudHistoryRow(
            item = item,
            text = title(item),
            kind = snapshot.activity[item.id],
            section = historySection(items, idx),
        )
    }
}

private fun historySection(items: List<HistoryItem>, idx: Int): String? {
    val item = items.getOrNull(idx) ?: return null
    val cur = HistoryTime.section(item)
    val prev = items.getOrNull(idx - 1)?.let(HistoryTime::section)
    if (cur == prev) return null
    return HistoryTime.title(cur)
}
