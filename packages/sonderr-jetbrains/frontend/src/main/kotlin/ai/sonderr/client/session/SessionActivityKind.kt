package ai.sonderr.client.session

import ai.sonderr.client.plugin.SonderrBundle
import ai.sonderr.client.ui.UiStyle
import ai.sonderr.rpc.dto.SessionActivityKindDto
import javax.swing.Icon

enum class SessionActivityKind {
    RUNNING,
    LOGIN_REQUIRED,
    PERMISSION,
    PLAN,
    QUESTION,
    ERROR,
    ;

    fun label(): String = when (this) {
        RUNNING -> SonderrBundle.message("session.part.tool.running")
        LOGIN_REQUIRED -> SonderrBundle.message("history.badge.loginRequired")
        PERMISSION -> SonderrBundle.message("history.badge.permission")
        PLAN -> SonderrBundle.message("history.badge.plan")
        QUESTION -> SonderrBundle.message("history.badge.question")
        ERROR -> SonderrBundle.message("history.badge.error")
    }

    fun style(): UiStyle.Badge.Style = when (this) {
        RUNNING -> UiStyle.Badge.ActivityRunning
        LOGIN_REQUIRED, PERMISSION, PLAN, QUESTION -> UiStyle.Badge.ActivityAttention
        ERROR -> UiStyle.Badge.ActivityError
    }

    fun icon(): Icon = ActivityIcon.of(this)
}

/**
 * The backend reports activity for every session it knows, open or not. LOGIN_REQUIRED has no DTO
 * counterpart: it comes from live session UI state instead.
 */
internal fun SessionActivityKindDto.toKind(): SessionActivityKind = when (this) {
    SessionActivityKindDto.RUNNING -> SessionActivityKind.RUNNING
    SessionActivityKindDto.QUESTION -> SessionActivityKind.QUESTION
    SessionActivityKindDto.PLAN -> SessionActivityKind.PLAN
    SessionActivityKindDto.PERMISSION -> SessionActivityKind.PERMISSION
    SessionActivityKindDto.ERROR -> SessionActivityKind.ERROR
}
