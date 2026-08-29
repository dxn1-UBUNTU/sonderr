package ai.sonderr.client.session.ui.account

internal data class AccountChoice(val org: String?, val title: String) {
    override fun toString() = title
}
