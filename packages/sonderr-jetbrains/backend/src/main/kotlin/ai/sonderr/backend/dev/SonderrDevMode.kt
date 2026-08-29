package ai.sonderr.backend.dev

import ai.sonderr.log.SonderrLog

object SonderrDevMode {
    fun enabled(): Boolean = SonderrLog.sandbox()
}
