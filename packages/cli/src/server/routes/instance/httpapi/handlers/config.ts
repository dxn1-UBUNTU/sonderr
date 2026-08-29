import { Config } from "@/config/config"
// sonderr_change start - preserve Sonderr API default model overlay
import { fetchDefaultModel } from "@sonderr/sonderr-gateway"
import { Auth } from "@/auth"
import { ProviderV2 } from "@sonderr/core/provider"
import { ModelV2 } from "@sonderr/core/model"
import { filterPromptTrainingModels, nonEmptyProviders } from "@/sonderr/provider/model-filter"
// sonderr_change end
import { Provider } from "@/provider/provider"
import * as InstanceState from "@/effect/instance-state"
import { Effect } from "effect"
import { HttpApiBuilder, HttpApiError } from "effect/unstable/httpapi" // sonderr_change
import { InstanceHttpApi } from "../api"
import { markInstanceForDisposal } from "../lifecycle"

export const configHandlers = HttpApiBuilder.group(InstanceHttpApi, "config", (handlers) =>
  Effect.gen(function* () {
    const providerSvc = yield* Provider.Service
    const configSvc = yield* Config.Service

    const get = Effect.fn("ConfigHttpApi.get")(function* () {
      return yield* configSvc.get()
    })

    const update = Effect.fn("ConfigHttpApi.update")(function* (ctx) {
      yield* configSvc.update(ctx.payload)
      yield* markInstanceForDisposal(yield* InstanceState.context)
      return ctx.payload
    })

    // sonderr_change start
    const warnings = Effect.fn("ConfigHttpApi.warnings")(function* () {
      return yield* configSvc.warnings()
    })
    // sonderr_change end

    const providers = Effect.fn("ConfigHttpApi.providers")(function* () {
      // sonderr_change start
      const config = yield* configSvc.get()
      const providers = filterPromptTrainingModels(
        yield* providerSvc.list(),
        config.hide_prompt_training_models === true,
      )
      const defaults = Provider.defaultModelIDs(nonEmptyProviders(providers))
      // sonderr_change end

      // sonderr_change start - Fetch default model from Sonderr API when the sonderr provider is available.
      if (providers[ProviderV2.ID.sonderr]) {
        const auth = yield* Auth.Service
        const info = yield* auth.get("sonderr").pipe(Effect.mapError(() => new HttpApiError.Unauthorized({}))) // sonderr_change
        const token = info?.type === "oauth" ? info.access : info?.key
        const organizationId = info?.type === "oauth" ? info.accountId : undefined
        const model = yield* Effect.promise(() => fetchDefaultModel(token, organizationId))
        if (model && providers[ProviderV2.ID.sonderr]?.models[model]) defaults[ProviderV2.ID.sonderr] = ModelV2.ID.make(model)
      }
      // sonderr_change end

      return {
        providers: Object.values(providers).map(Provider.toPublicInfo),
        default: defaults,
      }
    })

    return handlers
      .handle("get", get)
      .handle("update", update)
      .handle("warnings", warnings)
      .handle("providers", providers) // sonderr_change
  }),
)
