import { hasIndexingPlugin } from "@sonderr/sonderr-indexing/detect"
import type { SonderrClient } from "@sonderr/sdk/v2"

type PluginSpec = string | [string, Record<string, unknown>]

type ConfigLike = {
  plugin?: readonly PluginSpec[] | null
}

export type Features = {
  indexing: boolean
  sandboxControls: boolean
  backgroundSubagents: boolean
}

export function configFeatures(config?: ConfigLike | null, backgroundSubagents = false): Features {
  return {
    indexing: hasIndexingPlugin(config?.plugin ?? []),
    sandboxControls: process.platform !== "win32",
    backgroundSubagents,
  }
}

export async function serverFeatures(client: Pick<SonderrClient, "experimental">, dir: string) {
  if (!client.experimental?.capabilities?.get) return false
  try {
    const { data } = await client.experimental.capabilities.get({ directory: dir }, { throwOnError: true })
    return data?.backgroundSubagents === true
  } catch (error) {
    console.warn("[Sonderr New] Failed to fetch server capabilities:", error)
    return false
  }
}
