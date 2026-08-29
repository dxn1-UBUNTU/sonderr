import type { SonderrClient } from "@sonderr/sdk/v2/client"

export async function stopSessionProcesses(
  client: SonderrClient | null,
  sessionID: string,
  directory: string,
): Promise<void> {
  if (!client) return
  await client.backgroundProcess
    .stopSession({ sessionID, directory })
    .catch((err: unknown) => console.warn("[Sonderr New] SonderrProvider: Failed to stop background processes:", err))
}
