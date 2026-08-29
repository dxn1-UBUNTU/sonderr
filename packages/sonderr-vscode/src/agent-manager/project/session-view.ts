import type { sessionToWebview } from "../../sonderr-provider-utils"

/** A root session as shown in a project's sidebar, tagged with its worktree. */
export type ProjectSessionView = ReturnType<typeof sessionToWebview> & { worktreeId: string | null }
