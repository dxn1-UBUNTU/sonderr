import { describe, expect } from "bun:test"
import { DateTime, Effect } from "effect"
import { Credential } from "@sonderr/core/credential"
import { Integration } from "@sonderr/core/integration"
import { ModelV2 } from "@sonderr/core/model"
import { ProviderV2 } from "@sonderr/core/provider"
import { SessionRunnerModel } from "@sonderr/core/session/runner/model"
import { it } from "../lib/effect"

describe("SessionRunnerModel Sonderr credentials", () => {
  it.effect("maps OAuth account IDs to Sonderr organization routing", () =>
    Effect.gen(function* () {
      const model = ModelV2.Info.make({
        id: ModelV2.ID.make("test-model"),
        providerID: ProviderV2.ID.make("sonderr"),
        name: "Test model",
        api: {
          id: ModelV2.ID.make("api-test-model"),
          type: "aisdk",
          package: "@ai-sdk/openai-compatible",
          url: "https://api.kilo.ai/openrouter",
        },
        capabilities: { tools: true, input: ["text"], output: ["text"] },
        request: { headers: {}, body: {} },
        variants: [],
        time: { released: 0 },
        cost: [],
        status: "active",
        enabled: true,
        limit: { context: 100, output: 20 },
      })
      const credential = Credential.Info.make({
        id: Credential.ID.create(),
        integrationID: Integration.ID.make("sonderr"),
        label: "Work",
        value: Credential.OAuth.make({
          type: "oauth",
          methodID: Integration.MethodID.make("oauth"),
          refresh: "refresh",
          access: "access",
          expires: 1,
          metadata: { accountID: "org-enterprise" },
        }),
      })

      const resolved = yield* SessionRunnerModel.fromCatalogModel(model, credential.value)

      expect(resolved.route.defaults.http?.body).toMatchObject({ sonderrOrganizationId: "org-enterprise" })
      expect(resolved.route.defaults.http?.body).not.toHaveProperty("accountID")
    }),
  )
})
