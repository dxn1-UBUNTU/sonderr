package ai.sonderr.backend.rpc

import ai.sonderr.backend.run.WorktreeRunManager
import ai.sonderr.log.SonderrLog
import ai.sonderr.rpc.SonderrRunRpcApi
import ai.sonderr.rpc.dto.RunConfigListDto
import ai.sonderr.rpc.dto.RunResultDto
import ai.sonderr.rpc.dto.RunStateDto
import com.intellij.openapi.project.Project
import com.intellij.openapi.project.ProjectManager
import com.intellij.openapi.util.io.FileUtil
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flowOf
import java.nio.file.Path

/**
 * Backend implementation of [SonderrRunRpcApi]. Resolves the open project owning [directory]
 * (the main repository root of the Agent Manager surface) and delegates to its
 * project-level [WorktreeRunManager].
 */
class SonderrRunRpcApiImpl : SonderrRunRpcApi {

    companion object {
        private val LOG = SonderrLog.create(SonderrRunRpcApiImpl::class.java)
    }

    override suspend fun configs(directory: String): RunConfigListDto {
        val project = resolve(directory) ?: return RunConfigListDto(error = "no open project for $directory")
        return project.getService(WorktreeRunManager::class.java).configs()
    }

    override suspend fun run(directory: String, id: String, worktree: String): RunResultDto {
        val project = resolve(directory) ?: return RunResultDto(error = "no open project for $directory")
        return project.getService(WorktreeRunManager::class.java).run(id, worktree)
    }

    override suspend fun build(directory: String, worktree: String, clean: Boolean): RunResultDto {
        val project = resolve(directory) ?: return RunResultDto(error = "no open project for $directory")
        return project.getService(WorktreeRunManager::class.java).build(worktree, clean)
    }

    override suspend fun stop(directory: String, id: String, worktree: String): Boolean {
        val project = resolve(directory) ?: return false
        return project.getService(WorktreeRunManager::class.java).stop(id, worktree)
    }

    override suspend fun focus(directory: String, id: String, worktree: String): Boolean {
        val project = resolve(directory) ?: return false
        return project.getService(WorktreeRunManager::class.java).focus(id, worktree)
    }

    override suspend fun release(directory: String, worktree: String): Boolean {
        val project = resolve(directory) ?: return false
        return project.getService(WorktreeRunManager::class.java).release(worktree)
    }

    override suspend fun states(directory: String): Flow<List<RunStateDto>> {
        val project = resolve(directory) ?: run {
            LOG.warn("worktree run states: no open project for $directory")
            return flowOf(emptyList())
        }
        return project.getService(WorktreeRunManager::class.java).states
    }

    /**
     * Maps [directory] to its open project by filesystem identity. Uses [FileUtil.pathsEqual], which
     * already treats trailing slashes as equal and honors platform case sensitivity, after a
     * best-effort [Path.normalize] to collapse `.`/`..`. Deliberately not the workspace URL decoder,
     * which would null out on a lone `%` and compare case-sensitively.
     */
    private fun resolve(directory: String): Project? {
        val target = norm(directory)
        return ProjectManager.getInstance().openProjects.firstOrNull {
            !it.isDefault && !it.isDisposed &&
                (FileUtil.pathsEqual(norm(it.basePath), target) || FileUtil.pathsEqual(norm(it.presentableUrl), target))
        }
    }

    private fun norm(path: String?): String? =
        path?.let { runCatching { Path.of(it).normalize().toString() }.getOrDefault(it) }
}
