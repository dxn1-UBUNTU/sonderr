import { z } from "zod"
import { getSonderrUrlFromToken } from "../auth/token.js"
import { getDefaultHeaders, buildSonderrHeaders } from "../headers.js"
import { resolveSonderrGatewayBaseUrl } from "./url.js"
import { SONDERR_API_BASE, SONDERR_OPENROUTER_BASE, MODELS_FETCH_TIMEOUT_MS, PROMPTS, AI_SDK_PROVIDERS } from "./constants.js"

export type SonderrModelsResult = {
  models: Record<string, any>
  error?: { kind: "unauthorized" | "network" | "schema" | "http"; status?: number }
}

/**
 * OpenRouter model schema
 */
const openRouterArchitectureSchema = z.object({
  input_modalities: z.array(z.string()).nullish(),
  output_modalities: z.array(z.string()).nullish(),
  tokenizer: z.string().nullish(),
})

const openRouterPricingSchema = z.object({
  prompt: z.string().nullish(),
  completion: z.string().nullish(),
  input_cache_write: z.string().nullish(),
  input_cache_read: z.string().nullish(),
})

const openRouterModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  context_length: z.number(),
  max_completion_tokens: z.number().nullish(),
  pricing: openRouterPricingSchema.optional(),
  architecture: openRouterArchitectureSchema.optional(),
  top_provider: z.object({ max_completion_tokens: z.number().nullish() }).optional(),
  supported_parameters: z.array(z.string()).optional(),
  preferredIndex: z.number().optional(),
  isFree: z.boolean().optional(),
  mayTrainOnYourPrompts: z.boolean().optional(),
  hasUserByokAvailable: z.boolean().optional(),
  autoRouting: z
    .object({
      models: z.array(z.string()),
    })
    .optional()
    .catch(undefined),
  terminalBench: z
    .object({
      overallScore: z.number(),
      avgAttemptCostUsd: z.number(),
    })
    .optional()
    .catch(undefined),
  sonderr: z
    .object({
      family: z.string().optional(),
      prompt: z.enum(PROMPTS).optional().catch(undefined),
      variants: z.record(z.string(), z.record(z.string(), z.any())).optional(),
      ai_sdk_provider: z.enum(AI_SDK_PROVIDERS).optional().catch(undefined),
    })
    .optional(),
})

const openRouterModelsResponseSchema = z.object({
  data: z.array(openRouterModelSchema),
})

type OpenRouterModel = z.infer<typeof openRouterModelSchema>

/**
 * Parse API price string to number, converting from per-token to per-million-tokens.
 * The API returns prices in $/token, but downstream cost calculation (getUsage)
 * divides by 1,000,000 expecting $/M tokens.
 */
function parseApiPrice(price: string | null | undefined): number | undefined {
  if (!price) return undefined
  const parsed = parseFloat(price)
  if (isNaN(parsed) || parsed < 0) return undefined
  return parsed * 1_000_000 // Convert $/token → $/M tokens
}

/**
 * Fetch models from Sonderr API (OpenRouter-compatible endpoint)
 *
 * @param options - Configuration options
 * @returns Typed result with models and optional error info
 */
export async function fetchSonderrModels(options?: {
  sonderrToken?: string
  sonderrOrganizationId?: string
  baseURL?: string
}): Promise<SonderrModelsResult> {
  const raw = await fetchRawSonderrModels(options)
  if (raw.error) return { models: {}, error: raw.error }

  // Transform models to ModelsDev.Model format
  const models: Record<string, any> = {}

  for (const model of raw.data) {
    // Skip models that explicitly don't support tools — Sonderr requires tool calling
    // Optimistically assume models with a missing supported_parameters array support tools
    if (model.supported_parameters && !model.supported_parameters.includes("tools")) {
      continue
    }

    const transformedModel = transformToModelDevFormat(model)
    models[model.id] = transformedModel
  }

  return { models }
}

export type SonderrImageModel = {
  id: string
  name: string
  description?: string
}

export type SonderrImageModelsResult = {
  models: SonderrImageModel[]
  error?: { kind: "unauthorized" | "network" | "schema" | "http"; status?: number }
}

export type SonderrTranscriptionModel = {
  id: string
  name: string
}

export type SonderrTranscriptionModelsResult = {
  models: SonderrTranscriptionModel[]
  error?: { kind: "unauthorized" | "network" | "schema" | "http"; status?: number }
}

/**
 * Fetch image-capable models from Sonderr API (OpenRouter-compatible endpoint).
 * Uses the same raw fetch as {@link fetchSonderrModels} but keeps only models
 * whose `output_modalities` include `"image"`.
 */
export async function fetchSonderrImageModels(options?: {
  sonderrToken?: string
  sonderrOrganizationId?: string
  baseURL?: string
}): Promise<SonderrImageModelsResult> {
  const raw = await fetchRawSonderrModels(options)
  if (raw.error) return { models: [], error: raw.error }

  const models: SonderrImageModel[] = []

  for (const model of raw.data) {
    if (model.architecture?.output_modalities?.includes("image")) {
      models.push({ id: model.id, name: model.name, description: model.description })
    }
  }

  return { models }
}

export async function fetchSonderrTranscriptionModels(options?: {
  sonderrToken?: string
  sonderrOrganizationId?: string
  baseURL?: string
}): Promise<SonderrTranscriptionModelsResult> {
  const token = options?.sonderrToken
  const organizationId = options?.sonderrOrganizationId
  const url = new URL("transcription-models", resolveSonderrGatewayBaseUrl({ baseURL: options?.baseURL, token }))
  const response = await fetch(url, {
    headers: {
      ...getDefaultHeaders(),
      ...buildSonderrHeaders(undefined, { sonderrOrganizationId: organizationId }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal: AbortSignal.timeout(MODELS_FETCH_TIMEOUT_MS),
  }).catch((err: unknown) => err as Error)

  if (response instanceof Error) return { models: [], error: { kind: "network" } }
  if (!response.ok) {
    const kind = response.status === 401 || response.status === 403 ? "unauthorized" : "http"
    return { models: [], error: { kind, status: response.status } }
  }

  const json = await response.json().catch(() => null)
  if (!json || !Array.isArray(json.data)) return { models: [], error: { kind: "schema" } }

  const data: unknown[] = json.data
  const models = data.filter(isTranscriptionModel).map((model) => ({
    id: model.id,
    name: model.name,
  }))
  if (models.length === 0) return { models: [], error: { kind: "schema" } }
  return { models }
}

type TranscriptionModelResponse = {
  id: string
  name: string
}

function isTranscriptionModel(value: unknown): value is TranscriptionModelResponse {
  if (!value || typeof value !== "object") return false
  const model = value as Record<string, unknown>
  return typeof model.id === "string" && typeof model.name === "string"
}

/**
 * Shared raw fetch + validate used by both {@link fetchSonderrModels} and {@link fetchSonderrImageModels}.
 */
async function fetchRawSonderrModels(options?: {
  sonderrToken?: string
  sonderrOrganizationId?: string
  baseURL?: string
}): Promise<
  { data: OpenRouterModel[]; error?: undefined } | { data?: undefined; error: NonNullable<SonderrModelsResult["error"]> }
> {
  const token = options?.sonderrToken
  const organizationId = options?.sonderrOrganizationId

  // Construct base URL
  const defaultBaseURL = organizationId ? `${SONDERR_API_BASE}/api/organizations/${organizationId}` : SONDERR_OPENROUTER_BASE

  const baseURL = options?.baseURL ?? defaultBaseURL

  // Transform URL with token if available
  const finalBaseURL = token ? getSonderrUrlFromToken(baseURL, token) : baseURL

  // Construct models endpoint
  const modelsURL = `${finalBaseURL}/models`

  const response = await fetch(modelsURL, {
    headers: {
      ...getDefaultHeaders(),
      ...buildSonderrHeaders(undefined, { sonderrOrganizationId: organizationId }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal: AbortSignal.timeout(MODELS_FETCH_TIMEOUT_MS),
  }).catch((err: unknown) => err as Error)

  if (response instanceof Error) {
    return { error: { kind: "network" } }
  }

  if (!response.ok) {
    // 401 with auth credentials: fall back to unauthenticated public endpoint
    if (response.status === 401 && (token || organizationId)) {
      return fetchRawSonderrModels({})
    }
    const kind = response.status === 401 || response.status === 403 ? "unauthorized" : "http"
    return { error: { kind, status: response.status } }
  }

  const json = await response.json().catch(() => null)

  if (json === null) {
    return { error: { kind: "schema" } }
  }

  // Validate response schema
  const result = openRouterModelsResponseSchema.safeParse(json)

  if (!result.success) {
    return { error: { kind: "schema" } }
  }

  return { data: result.data.data }
}

/**
 * Transform OpenRouter model to ModelsDev.Model format
 */
function transformToModelDevFormat(model: OpenRouterModel): any {
  const inputModalities = model.architecture?.input_modalities || []
  const outputModalities = model.architecture?.output_modalities || []
  const supportedParameters = model.supported_parameters || []

  // Parse pricing
  const inputPrice = parseApiPrice(model.pricing?.prompt)
  const outputPrice = parseApiPrice(model.pricing?.completion)
  const cacheWritePrice = parseApiPrice(model.pricing?.input_cache_write)
  const cacheReadPrice = parseApiPrice(model.pricing?.input_cache_read)

  // Determine capabilities
  const supportsImages = inputModalities.includes("image")
  const supportsTools = !model.supported_parameters || supportedParameters.includes("tools")
  const supportsReasoning = supportedParameters.includes("reasoning")
  const supportsTemperature = supportedParameters.includes("temperature")

  // Calculate max output tokens
  const maxOutputTokens =
    model.top_provider?.max_completion_tokens || model.max_completion_tokens || Math.ceil(model.context_length * 0.2)

  return {
    id: model.id,
    name: model.name,
    family: model.sonderr?.family ?? extractFamily(model.id),
    release_date: new Date().toISOString().split("T")[0], // Default to today
    attachment: supportsImages,
    reasoning: supportsReasoning,
    temperature: supportsTemperature,
    recommendedIndex: model.preferredIndex,
    variants: model.sonderr?.variants,
    prompt: model.sonderr?.prompt,
    ai_sdk_provider: model.sonderr?.ai_sdk_provider,
    tool_call: supportsTools,
    isFree: model.isFree,
    mayTrainOnYourPrompts: model.mayTrainOnYourPrompts,
    hasUserByokAvailable: model.hasUserByokAvailable,
    ...(model.autoRouting && { autoRouting: model.autoRouting }),
    ...(model.terminalBench && { terminalBench: model.terminalBench }),
    ...(inputPrice !== undefined &&
      outputPrice !== undefined && {
        cost: {
          input: inputPrice,
          output: outputPrice,
          ...(cacheReadPrice !== undefined && { cache_read: cacheReadPrice }),
          ...(cacheWritePrice !== undefined && { cache_write: cacheWritePrice }),
        },
      }),
    limit: {
      context: model.context_length,
      output: maxOutputTokens,
    },
    ...((inputModalities.length > 0 || outputModalities.length > 0) && {
      modalities: {
        input: mapModalities(inputModalities),
        output: mapModalities(outputModalities),
      },
    }),
    options: {
      ...(model.description && { description: model.description }),
    },
  }
}

/**
 * Extract family name from model ID
 * e.g., "anthropic/claude-3-opus" -> "claude"
 */
function extractFamily(modelId: string): string | undefined {
  const parts = modelId.split("/")
  if (parts.length < 2) return undefined

  const modelName = parts[1]

  // Try to extract family from common patterns
  if (modelName.includes("claude")) return "claude"
  if (modelName.includes("gpt")) return "gpt"
  if (modelName.includes("gemini")) return "gemini"
  if (modelName.includes("llama")) return "llama"
  if (modelName.includes("mistral")) return "mistral"

  return undefined
}

/**
 * Map OpenRouter modalities to ModelsDev modalities
 */
function mapModalities(modalities: string[]): Array<"text" | "audio" | "image" | "video" | "pdf"> {
  const result: Array<"text" | "audio" | "image" | "video" | "pdf"> = []

  for (const modality of modalities) {
    if (modality === "text") result.push("text")
    if (modality === "image") result.push("image")
    if (modality === "audio") result.push("audio")
    if (modality === "video") result.push("video")
    if (modality === "pdf") result.push("pdf")
  }

  // Always include text if not present
  if (!result.includes("text")) {
    result.unshift("text")
  }

  return result
}
