import { createSonderr, SONDERR_OPENROUTER_BASE } from "@sonderr/sonderr-gateway" // sonderr_change
import { Effect } from "effect"
import { ProviderV2 } from "../../provider" // sonderr_change
import { define } from "../internal"

const id = ProviderV2.ID.sonderr // sonderr_change

export const SonderrPlugin = define({
  id: "sonderr",
  effect: Effect.fn(function* (ctx) {
    yield* ctx.catalog.transform(
      Effect.fn(function* (evt) {
        for (const item of evt.provider.list()) {
          if (item.provider.id !== id) continue // sonderr_change
          evt.provider.update(item.provider.id, (provider) => {
            // sonderr_change start
            const options = provider.request.body
            const token = options.sonderrToken ?? options.apiKey ?? process.env.SONDERR_API_KEY
            const org = process.env.SONDERR_ORG_ID ?? options.sonderrOrganizationId

            provider.api = {
              type: "aisdk",
              package: "@sonderr/sonderr-gateway",
              url: SONDERR_OPENROUTER_BASE,
            }
            // sonderr_change end
            provider.request.headers["HTTP-Referer"] = "https://kilo.ai/"
            // sonderr_change start
            provider.request.headers["X-Title"] = "Sonderr"
            options.apiKey = token ?? "anonymous"
            options.sonderrToken = options.apiKey
            if (org) options.sonderrOrganizationId = org
            // sonderr_change end
          })
        }
      }),
    )
    // sonderr_change start
    yield* ctx.aisdk.sdk(
      Effect.fn(function* (evt) {
        if (evt.model.providerID !== id) return
        evt.sdk = createSonderr(evt.options)
      }),
    )
    // sonderr_change end
  }),
})
