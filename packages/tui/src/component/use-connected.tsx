import { createMemo } from "solid-js"
import { useSync } from "../context/sync"

// sonderr_change start - anonymous Sonderr and Sonderr providers do not prove authentication
type Provider = {
  id: string
  models: Record<string, { cost?: { input: number } }>
}

export function connected(providers: ReadonlyArray<Provider>) {
  return providers.some(
    (provider) =>
      (provider.id !== "sonderr" && provider.id !== "sonderr") ||
      Object.values(provider.models).some((model) => model.cost?.input !== 0),
  )
}

export function useConnected() {
  const sync = useSync()
  return createMemo(() => connected(sync.data.provider))
}
// sonderr_change end
