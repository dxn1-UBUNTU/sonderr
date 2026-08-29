package ai.sonderr.client.diff

import ai.sonderr.rpc.dto.DiffFileDto
import com.intellij.openapi.vcs.FileStatus

internal fun fileStatus(dto: DiffFileDto): FileStatus = when (dto.status) {
    "added" -> FileStatus.ADDED
    "deleted" -> FileStatus.DELETED
    "untracked" -> FileStatus.UNKNOWN
    "modified" -> FileStatus.MODIFIED
    else -> when {
        DiffPatchReconstruct.added(dto.patch) -> FileStatus.ADDED
        DiffPatchReconstruct.deleted(dto.patch) -> FileStatus.DELETED
        else -> FileStatus.MODIFIED
    }
}
