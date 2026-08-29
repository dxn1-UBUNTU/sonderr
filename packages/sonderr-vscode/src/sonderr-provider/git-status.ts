import type { SonderrClient } from "@sonderr/sdk/v2/client"

export async function hasGit(client: SonderrClient, directory: string): Promise<boolean> {
  return Promise.resolve()
    .then(() => client.project.current({ directory }))
    .then((r) => r.data?.vcs === "git")
    .catch(() => false)
}
