import type { ProviderAuthState } from "../../types/messages"
import type { Provider } from "../../types/messages"
import { SONDERR_PROVIDER_ID, createSonderrFallbackProvider } from "../../../../src/shared/provider-model"

export function visibleConnectedIds(connected: string[], authStates: Record<string, ProviderAuthState>) {
  return connected.filter((id) => id !== SONDERR_PROVIDER_ID || authStates[SONDERR_PROVIDER_ID] !== undefined)
}

export function disabledProviderOptions(providers: Record<string, Provider>, disabled: string[]) {
  const current = new Set(disabled)
  return Object.values(providers)
    .filter((item) => !current.has(item.id))
    .map((item) => ({ value: item.id, label: item.name }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

export function providersWithSonderrFallback(providers: Record<string, Provider>): Record<string, Provider> {
  if (providers[SONDERR_PROVIDER_ID]) return providers
  return { [SONDERR_PROVIDER_ID]: createSonderrFallbackProvider(), ...providers }
}
