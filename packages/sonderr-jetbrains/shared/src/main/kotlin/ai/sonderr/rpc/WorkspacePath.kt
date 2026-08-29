package ai.sonderr.rpc

fun isManagedWorktreeStorage(path: String): Boolean {
    val rel = path.replace('\\', '/').trimStart('/')
    return rel == ".sonderr/worktrees" || rel.startsWith(".sonderr/worktrees/")
}
