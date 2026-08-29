@file:Suppress("UnstableApiUsage")

package ai.sonderr.client.testing

import ai.sonderr.client.app.SonderrWorkspaceService
import ai.sonderr.client.app.ProjectRoot
import com.intellij.openapi.Disposable
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.project.Project
import com.intellij.testFramework.replaceService
import kotlinx.coroutines.CoroutineScope

/**
 * Points [ProjectRoot] at [dir] for the duration of [parent].
 *
 * Replaces both the resolver and the workspace service it calls: the production
 * [SonderrWorkspaceService] would go through the durable RPC transport, and [ProjectRoot] caches its
 * result for the whole project lifetime, which outlives a single test because `BasePlatformTestCase`
 * reuses one light project across test classes.
 */
fun fakeRoot(project: Project, cs: CoroutineScope, parent: Disposable, dir: String): FakeWorkspaceRpcApi {
    val rpc = FakeWorkspaceRpcApi().also { it.directory = dir }
    ApplicationManager.getApplication()
        .replaceService(SonderrWorkspaceService::class.java, SonderrWorkspaceService(cs, rpc), parent)
    project.replaceService(ProjectRoot::class.java, ProjectRoot(project), parent)
    return rpc
}
