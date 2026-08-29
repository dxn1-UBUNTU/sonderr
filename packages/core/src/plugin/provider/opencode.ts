import { Effect } from "effect"
import { define } from "@sonderr/plugin/v2/effect/plugin"
import { ProviderV2 } from "../../provider"

// sonderr_change start - Sonderr keeps only the free-tier catalog gate from upstream's sonderr plugin.
//
// Upstream turned this plugin into a full identity + remote-config integration: an OAuth device
// flow against https://console.sonderr.ai (client id "sonderr-cli"), an "Sonderr Console
// account" login method, an "API key (service account)" method, and a fetch that lets that console
// drive Sonderr's provider/model catalog. Sonderr routes providers through the Sonderr gateway and does not
// offer a competitor's account system as a sign-in option, so none of that is registered here.
//
// What remains is the behavior Sonderr actually relies on and shipped before the v1.17.13 merge:
// gate the sonderr ("zen") provider's paid models unless the user supplies a key, and mark the
// provider as "public" otherwise. The provider itself still reaches the catalog through models.dev
// sync (see catalog.ts), so this gate stays live.
//
// Do not restore the console auth flow on future merges without a product decision.
export const SonderrPlugin = define({
  id: "sonderr",
  effect: Effect.fn(function* (ctx) {
    yield* ctx.catalog.transform(
      Effect.fn(function* (catalog) {
        const item = catalog.provider.get(ProviderV2.ID.sonderr)
        if (!item) return
        // Read inside the transform so catalog reloads see current credentials, not a boot-time snapshot.
        // A connection (env method, service-account key, ...) counts as credentials, exactly as before the merge.
        const connected = (yield* ctx.integration.connection.active("sonderr")) !== undefined
        const hasKey = Boolean(process.env.SONDERR_API_KEY || connected || item.provider.request.body.apiKey)
        catalog.provider.update(item.provider.id, (provider) => {
          if (!hasKey) provider.request.body.apiKey = "public"
        })
        if (hasKey) return
        for (const model of item.models.values()) {
          if (!model.cost.some((cost) => cost.input > 0)) continue
          catalog.model.update(item.provider.id, model.id, (draft) => {
            draft.enabled = false
          })
        }
      }),
    )
  }),
})
// sonderr_change end
