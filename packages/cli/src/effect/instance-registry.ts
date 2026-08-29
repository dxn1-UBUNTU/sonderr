import type { WorkspaceV2 } from "@sonderr/core/workspace" // sonderr_change

const disposers = new Set<(directory: string, workspaceID?: WorkspaceV2.ID) => Promise<void>>() // sonderr_change

// sonderr_change start
export function registerDisposer(
  disposer: (directory: string, workspaceID?: WorkspaceV2.ID) => Promise<void>, // sonderr_change
) {
  disposers.add(disposer)
  return () => {
    disposers.delete(disposer)
  }
}

export async function disposeInstance(directory: string, workspaceID?: WorkspaceV2.ID) {
  await Promise.allSettled([...disposers].map((disposer) => disposer(directory, workspaceID)))
}
// sonderr_change end
