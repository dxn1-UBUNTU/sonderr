package ai.sonderr.client.vfs

import com.intellij.openapi.fileTypes.FileType
import com.intellij.openapi.fileTypes.FileTypes
import javax.swing.Icon

interface SonderrVirtualFileKind {
    val id: String

    fun title(params: Map<String, String>): String

    fun icon(params: Map<String, String>): Icon? = null

    /**
     * Must be a binary [FileType]. Sonderr virtual files carry no content, so a text file type makes
     * `FileDocumentManagerBase.getDocument` load text while the editor composite is built and
     * [SonderrVirtualFile.contentsToByteArray] throws, which cancels the tab.
     */
    fun fileType(params: Map<String, String>): FileType = FileTypes.UNKNOWN

    fun presentablePath(params: Map<String, String>): String = title(params)

    fun isValid(params: Map<String, String>): Boolean = true
}
