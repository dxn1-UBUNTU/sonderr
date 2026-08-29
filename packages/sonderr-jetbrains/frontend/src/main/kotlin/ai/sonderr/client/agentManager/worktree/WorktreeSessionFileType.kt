package ai.sonderr.client.agentManager.worktree

import ai.sonderr.client.plugin.SonderrBundle
import com.intellij.openapi.fileTypes.FileType
import com.intellij.openapi.vfs.VirtualFile
import javax.swing.Icon

object WorktreeSessionFileType : FileType {
    override fun getName(): String = "SONDERR_WORKTREE_SESSION"
    override fun getDisplayName(): String = SonderrBundle.message("worktree.session.fileType.displayName")
    override fun getDescription(): String = SonderrBundle.message("worktree.session.fileType.description")
    override fun getDefaultExtension(): String = "sonderr-worktree-session"
    override fun getIcon(): Icon = WorktreeIcons.branch
    override fun isBinary(): Boolean = true
    override fun isReadOnly(): Boolean = true
    override fun getCharset(file: VirtualFile, content: ByteArray): String? = null
}
