import { InstanceStore } from "@/project/instance-store"
import { ModelCache } from "@/provider/model-cache"
import { SonderrViewers } from "@/sonderr/presence/service" // sonderr_change
import { Effect } from "effect"

export const disposeAllInstancesAfterProviderAuthCallback = Effect.fn(
  "SonderrServer.disposeAllInstancesAfterProviderAuthCallback",
)(function* () {
  const store = yield* InstanceStore.Service
  yield* store.disposeAll()
})

// sonderr_change start - drop the old presence socket; callers invoke this for the "sonderr" provider only
export const invalidatePresence = Effect.fn("SonderrServer.invalidatePresence")(function* () {
  const viewers = yield* SonderrViewers.Service
  yield* viewers.invalidateAuth()
})
// sonderr_change end

export const invalidateAfterProviderAuthChange = Effect.fn("SonderrServer.invalidateAfterProviderAuthChange")(function* (
  providerID: string,
) {
  const cache = yield* ModelCache.Service
  yield* cache.clear(providerID)
  yield* disposeAllInstancesAfterProviderAuthCallback()
})
