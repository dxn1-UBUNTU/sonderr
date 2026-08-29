import { describe, expect } from "bun:test"
import { Effect } from "effect"
import { AISDK } from "@sonderr/core/aisdk" // sonderr_change
import { Catalog } from "@sonderr/core/catalog"
import { ModelV2 } from "@sonderr/core/model" // sonderr_change
import { PluginV2 } from "@sonderr/core/plugin"
import { PluginHost } from "@sonderr/core/plugin/host"
import { ProviderPlugins } from "@sonderr/core/plugin/provider"
import { SonderrPlugin } from "@sonderr/core/plugin/provider/sonderr"
import { ProviderV2 } from "@sonderr/core/provider"
import { testEffect } from "../lib/effect"
import { PluginTestLayer } from "./fixture"

const it = testEffect(PluginTestLayer)

const addPlugin = Effect.fn(function* () {
  const plugin = yield* PluginV2.Service
  const host = yield* PluginHost.make(plugin)
  yield* SonderrPlugin.effect(host)
})

// sonderr_change start
function withEnv<A, E, R>(vars: Record<string, string | undefined>, effect: () => Effect.Effect<A, E, R>) {
  return Effect.acquireUseRelease(
    Effect.sync(() => {
      const previous = Object.fromEntries(Object.keys(vars).map((key) => [key, process.env[key]]))
      for (const [key, value] of Object.entries(vars)) {
        if (value === undefined) delete process.env[key]
        else process.env[key] = value
      }
      return previous
    }),
    effect,
    (previous) =>
      Effect.sync(() => {
        for (const [key, value] of Object.entries(previous)) {
          if (value === undefined) delete process.env[key]
          else process.env[key] = value
        }
      }),
  )
}
// sonderr_change end

describe("SonderrPlugin", () => {
  it.effect("is registered so legacy referer headers can be applied", () =>
    Effect.sync(() => expect(ProviderPlugins.map((item) => item.id)).toContain(PluginV2.ID.make("sonderr"))),
  )

  it.effect("applies legacy referer headers only to sonderr", () =>
    Effect.gen(function* () {
      const catalog = yield* Catalog.Service
      yield* catalog.transform((catalog) => {
        catalog.provider.update(ProviderV2.ID.make("sonderr"), (provider) => {
          provider.api = {
            type: "aisdk",
            package: "@ai-sdk/openai-compatible",
            url: "https://api.kilo.ai/api/gateway",
          }
          provider.request = { headers: { Existing: "value" }, body: {} }
        })
        catalog.provider.update(ProviderV2.ID.openrouter, () => {})
      })
      yield* addPlugin()
      expect((yield* catalog.provider.get(ProviderV2.ID.make("sonderr")))?.request.headers).toEqual({
        Existing: "value",
        "HTTP-Referer": "https://kilo.ai/",
        "X-Title": "Sonderr", // sonderr_change
      })
      expect((yield* catalog.provider.get(ProviderV2.ID.openrouter))?.request.headers).toEqual({})
    }),
  )

  it.effect("uses the exact legacy Sonderr header casing and set", () =>
    Effect.gen(function* () {
      const catalog = yield* Catalog.Service
      yield* catalog.transform((catalog) => {
        catalog.provider.update(ProviderV2.ID.make("sonderr"), (provider) => {
          provider.api = {
            type: "aisdk",
            package: "@ai-sdk/openai-compatible",
            url: "https://api.kilo.ai/api/gateway",
          }
        })
      })
      yield* addPlugin()

      expect((yield* catalog.provider.get(ProviderV2.ID.sonderr))?.request.headers).toEqual({
        "HTTP-Referer": "https://kilo.ai/",
        "X-Title": "Sonderr", // sonderr_change
      })
      expect((yield* catalog.provider.get(ProviderV2.ID.make("sonderr")))?.request.headers).not.toHaveProperty(
        "http-referer",
      )
      expect((yield* catalog.provider.get(ProviderV2.ID.make("sonderr")))?.request.headers).not.toHaveProperty("x-title")
      expect((yield* catalog.provider.get(ProviderV2.ID.make("sonderr")))?.request.headers).not.toHaveProperty("X-Source")
    }),
  )

  it.effect("uses the legacy provider-id guard instead of endpoint package matching", () =>
    Effect.gen(function* () {
      const catalog = yield* Catalog.Service
      yield* catalog.transform((catalog) => {
        catalog.provider.update(ProviderV2.ID.make("sonderr"), (provider) => {
          provider.api = {
            type: "aisdk",
            package: "@ai-sdk/openai-compatible",
            url: "https://api.kilo.ai/api/gateway",
          }
        })
        catalog.provider.update(ProviderV2.ID.make("custom-sonderr"), (provider) => {
          provider.api = { type: "aisdk", package: "sonderr" }
        })
      })
      yield* addPlugin()

      expect((yield* catalog.provider.get(ProviderV2.ID.sonderr))?.request.headers).toEqual({
        "HTTP-Referer": "https://kilo.ai/",
        "X-Title": "Sonderr", // sonderr_change
      })
      expect((yield* catalog.provider.get(ProviderV2.ID.make("custom-sonderr")))?.request.headers).toEqual({})
    }),
  )

  // sonderr_change start
  it.effect("routes the Sonderr catalog through the Sonderr Gateway SDK", () =>
    withEnv({ SONDERR_API_KEY: undefined, SONDERR_ORG_ID: undefined }, () =>
      Effect.gen(function* () {
        const aisdk = yield* AISDK.Service
        const catalog = yield* Catalog.Service
        yield* catalog.transform((catalog) => {
          catalog.provider.update(ProviderV2.ID.sonderr, (provider) => {
            provider.api = {
              type: "aisdk",
              package: "@ai-sdk/openai-compatible",
              url: "https://api.kilo.ai/api/gateway",
            }
            provider.request = { headers: {}, body: { apiKey: "stored-token" } }
          })
        })
        yield* addPlugin()
        const updated = yield* catalog.provider.get(ProviderV2.ID.sonderr)

        expect(updated?.api).toEqual({
          type: "aisdk",
          package: "@sonderr/sonderr-gateway",
          url: "https://api.kilo.ai/api/openrouter",
        })
        expect(updated?.request.body.sonderrToken).toBe("stored-token")

        const result = yield* aisdk.runSDK({
          model: ModelV2.Info.make({
            ...ModelV2.Info.empty(ProviderV2.ID.sonderr, ModelV2.ID.make("sonderr-auto/free")),
            api: {
              id: ModelV2.ID.make("sonderr-auto/free"),
              type: "aisdk",
              package: "@sonderr/sonderr-gateway",
            },
          }),
          package: "@sonderr/sonderr-gateway",
          options: updated?.request.body ?? {},
        })
        expect(result.sdk).toBeDefined()
        expect(typeof result.sdk.languageModel).toBe("function")
        expect(typeof result.sdk.anthropic).toBe("function")
      }),
    ),
  )

  it.effect("keeps authenticated credentials ahead of inherited environment keys", () =>
    withEnv({ SONDERR_API_KEY: "environment-token", SONDERR_ORG_ID: "environment-org" }, () =>
      Effect.gen(function* () {
        const catalog = yield* Catalog.Service
        yield* catalog.transform((catalog) => {
          catalog.provider.update(ProviderV2.ID.sonderr, (provider) => {
            provider.request = {
              headers: {},
              body: { apiKey: "authenticated-token", sonderrOrganizationId: "authenticated-org" },
            }
          })
        })
        yield* addPlugin()
        const result = yield* catalog.provider.get(ProviderV2.ID.sonderr)

        expect(result?.request.body.apiKey).toBe("authenticated-token")
        expect(result?.request.body.sonderrToken).toBe("authenticated-token")
        expect(result?.request.body.sonderrOrganizationId).toBe("environment-org")
      }),
    ),
  )

  it.effect("keeps anonymous Sonderr models available without credentials", () =>
    withEnv({ SONDERR_API_KEY: undefined, SONDERR_ORG_ID: undefined }, () =>
      Effect.gen(function* () {
        const catalog = yield* Catalog.Service
        yield* catalog.transform((catalog) => catalog.provider.update(ProviderV2.ID.sonderr, () => {}))
        yield* addPlugin()
        const result = yield* catalog.provider.get(ProviderV2.ID.sonderr)

        expect((yield* catalog.provider.available()).map((provider) => provider.id)).toContain(ProviderV2.ID.sonderr)
        expect(result?.request.body.apiKey).toBe("anonymous")
        expect(result?.request.body.sonderrToken).toBe("anonymous")
      }),
    ),
  )
  // sonderr_change end
})
