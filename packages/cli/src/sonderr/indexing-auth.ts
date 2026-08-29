import type { IndexingConfig } from "@sonderr/sonderr-indexing/config"

type Auth = unknown

type Env = {
  SONDERR_API_KEY?: string
  SONDERR_ORG_ID?: string
}

type Provider = {
  key?: unknown
  options?: Record<string, unknown>
}

export type SonderrIndexingAuth = {
  apiKey?: string
  baseUrl?: string
  organizationId?: string
}

const providers = [
  "openai",
  "ollama",
  "openai-compatible",
  "gemini",
  "mistral",
  "vercel-ai-gateway",
  "bedrock",
  "openrouter",
  "voyage",
]

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function text(value: unknown): string | undefined {
  if (typeof value !== "string") return
  const trimmed = value.trim()
  return trimmed || undefined
}

function token(auth: Auth): string | undefined {
  const data = record(auth)
  if (data.type === "api") return text(data.key)
  if (data.type === "oauth") return text(data.access)
  return
}

function org(auth: Auth): string | undefined {
  const data = record(auth)
  if (data.type === "oauth") return text(data.accountId)
  return
}

function value(input: unknown): boolean {
  if (input === undefined || input === null) return false
  if (typeof input === "string") return input.trim().length > 0
  if (typeof input === "object") return Object.values(input).some(value)
  return true
}

function hasOtherProvider(indexing: unknown): boolean {
  const cfg = record(indexing)
  return providers.some((provider) => value(cfg[provider]))
}

export function resolveSonderrIndexingAuth(input: {
  config?: unknown
  provider?: Provider
  auth?: Auth
  env?: Env
}): SonderrIndexingAuth {
  const config = record(input.config)
  const options = record(record(config.provider).sonderr)
  const provider = input.provider ?? record(input.provider)
  const providerOptions = record(provider.options)
  const providerConfig = record(options.options)
  const sonderr = record(record(config.indexing).sonderr)
  const env = input.env ?? process.env

  return {
    apiKey:
      text(sonderr.apiKey) ??
      text(providerConfig.apiKey) ??
      token(input.auth) ??
      text(provider.key) ??
      text(providerOptions.sonderrToken) ??
      text(env.SONDERR_API_KEY),
    baseUrl: text(sonderr.baseUrl) ?? text(providerConfig.baseURL) ?? text(providerConfig.baseUrl),
    organizationId:
      text(sonderr.organizationId) ??
      text(providerConfig.sonderrOrganizationId) ??
      org(input.auth) ??
      text(providerOptions.sonderrOrganizationId) ??
      text(env.SONDERR_ORG_ID),
  }
}

export function hasSonderrIndexingAuth(input: Parameters<typeof resolveSonderrIndexingAuth>[0]): boolean {
  return !!resolveSonderrIndexingAuth(input).apiKey
}

export function shouldDefaultIndexingToSonderr(indexing: unknown, auth: SonderrIndexingAuth): boolean {
  const cfg = record(indexing)
  if (cfg.provider !== undefined || !auth.apiKey) return false
  return !hasOtherProvider(cfg)
}

export function indexingWithSonderrDefault(
  indexing: IndexingConfig | undefined,
  auth: SonderrIndexingAuth,
): IndexingConfig | undefined {
  if (!shouldDefaultIndexingToSonderr(indexing, auth)) return indexing
  return { ...indexing, provider: "sonderr" }
}
