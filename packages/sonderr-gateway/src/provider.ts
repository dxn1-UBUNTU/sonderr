import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { createAnthropic } from "@ai-sdk/anthropic"
import { createOpenAI } from "@ai-sdk/openai"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import type { SonderrProvider, SonderrProviderOptions } from "./types.js"
import { getApiKey } from "./auth/token.js"
import { buildSonderrHeaders, getDefaultHeaders } from "./headers.js"
import { ANONYMOUS_API_KEY } from "./api/constants.js"
import { resolveSonderrOpenRouterBaseUrl } from "./api/url.js"
import { transformRequestBody } from "./responses.js"
import * as GatewayMetadata from "./gateway-metadata.js"

export function buildRequestHeaders(defaultHeaders: Record<string, string>, requestHeaders?: HeadersInit): Headers {
  const headers = new Headers(defaultHeaders)
  new Headers(requestHeaders).forEach((value, key) => {
    headers.set(key, value)
  })
  return headers
}

/**
 * Create a Sonderr provider instance
 *
 * This provider wraps the OpenRouter SDK with Sonderr-specific configuration
 * including custom authentication, headers, and base URL.
 *
 * @example
 * ```typescript
 * const provider = createSonderr({
 *   sonderrToken: "your-token-here",
 *   sonderrOrganizationId: "org-123"
 * })
 *
 * const model = provider.languageModel("anthropic/claude-sonnet-4")
 * ```
 */
export function createSonderr(options: SonderrProviderOptions = {}): SonderrProvider {
  // Get API key from options or environment
  const apiKey = getApiKey(options)

  const openRouterUrl = resolveSonderrOpenRouterBaseUrl({ baseURL: options.baseURL, token: apiKey })

  // Merge custom headers with defaults
  const customHeaders = {
    ...getDefaultHeaders(),
    ...buildSonderrHeaders(undefined, {
      sonderrOrganizationId: options.sonderrOrganizationId,
      sonderrTesterWarningsDisabledUntil: undefined,
    }),
    ...options.headers,
  }

  // Create custom fetch wrapper to add dynamic headers
  const originalFetch = options.fetch ?? fetch
  const wrappedFetch = async (input: string | URL | Request, init?: RequestInit) => {
    const headers = buildRequestHeaders(customHeaders, init?.headers)
    const body = transformRequestBody(input, init?.body, options.dataCollection)

    // Add authorization if API key exists
    if (apiKey) {
      headers.set("Authorization", `Bearer ${apiKey}`)
    }

    return originalFetch(input, {
      ...init,
      headers,
      body,
    })
  }

  const sdkOptions = {
    baseURL: openRouterUrl,
    apiKey: apiKey ?? ANONYMOUS_API_KEY,
    headers: customHeaders,
    fetch: wrappedFetch as typeof fetch,
  }

  const openrouter = createOpenRouter(sdkOptions)
  const anthropic = createAnthropic(sdkOptions)
  const openai = createOpenAI(sdkOptions)
  const openaiCompatible = createOpenAICompatible({ ...sdkOptions, name: "openaiCompatible" })

  return {
    languageModel(modelId) {
      return openrouter(modelId)
    },
    embeddingModel(modelId: string) {
      return openrouter.textEmbeddingModel(modelId)
    },
    rerankingModel(modelId: string): never {
      throw new Error(`Reranking model not supported: ${modelId}`)
    },
    imageModel(modelId) {
      return openrouter.imageModel(modelId)
    },
    anthropic(modelId) {
      return GatewayMetadata.wrap(anthropic(modelId))
    },
    openai(modelId) {
      return GatewayMetadata.wrap(openai(modelId))
    },
    openaiCompatible(modelId) {
      return openaiCompatible(modelId)
    },
  }
}
