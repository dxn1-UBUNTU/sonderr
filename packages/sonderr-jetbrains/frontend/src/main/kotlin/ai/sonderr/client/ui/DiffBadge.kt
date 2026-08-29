package ai.sonderr.client.ui

internal interface DiffBadge {
    fun update(additions: Int, deletions: Int)
}
