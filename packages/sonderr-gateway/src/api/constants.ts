/**
 * Sonderr Gateway Configuration Constants
 * Centralized configuration for all API endpoints, headers, and settings
 */

/** Environment variable for custom Sonderr API URL */
export const ENV_SONDERR_API_URL = "SONDERR_API_URL"

/** Default Sonderr API URL */
export const DEFAULT_SONDERR_API_URL = "https://api.kilo.ai"

/** Base URL for Sonderr API - can be overridden by SONDERR_API_URL env var */
export const SONDERR_API_BASE = process.env[ENV_SONDERR_API_URL] || DEFAULT_SONDERR_API_URL

/** Environment variable for custom Sonderr Chat URL */
export const SONDERR_CHAT_URL_ENV = "SONDERR_CHAT_URL"

/** Default Sonderr Chat URL (REST endpoint for messages, conversations, etc.) */
export const SONDERR_DEFAULT_CHAT_URL = "https://chat.kiloapps.io"

/** Base URL for Sonderr Chat - can be overridden by SONDERR_CHAT_URL env var */
export const SONDERR_CHAT_URL = process.env[SONDERR_CHAT_URL_ENV] || SONDERR_DEFAULT_CHAT_URL

/** Environment variable for custom Event Service URL */
export const SONDERR_EVENT_SERVICE_URL_ENV = "EVENT_SERVICE_URL"

/** Default Event Service URL (WebSocket endpoint for sonderr-chat events) */
export const SONDERR_DEFAULT_EVENT_SERVICE_URL = "wss://events.kiloapps.io"

/** Base URL for Event Service - can be overridden by EVENT_SERVICE_URL env var */
export const SONDERR_EVENT_SERVICE_URL = process.env[SONDERR_EVENT_SERVICE_URL_ENV] || SONDERR_DEFAULT_EVENT_SERVICE_URL

/** Default base URL for OpenRouter-compatible endpoint */
export const SONDERR_OPENROUTER_BASE = `${SONDERR_API_BASE}/api/openrouter`

/** Device auth polling interval in milliseconds */
export const POLL_INTERVAL_MS = 3000

/** Default model for authenticated users */
export const DEFAULT_MODEL = "sonderr-auto/free"

/** Default model for anonymous/free usage */
export const DEFAULT_FREE_MODEL = "sonderr-auto/free"

/** Token expiration duration in milliseconds (1 year) */
export const TOKEN_EXPIRATION_MS = 365 * 24 * 60 * 60 * 1000

/** User-Agent header base value for requests */
export const USER_AGENT_BASE = "sonderr-sonderr-provider"

/** Content-Type header value for requests */
export const CONTENT_TYPE = "application/json"

/** Default provider name */
export const DEFAULT_PROVIDER_NAME = "sonderr"

/** Default API key for anonymous requests */
export const ANONYMOUS_API_KEY = "anonymous"

/** Fetch timeout for model requests in milliseconds (10 seconds) */
export const MODELS_FETCH_TIMEOUT_MS = 10 * 1000

/**
 * Header constants for Sonderr API requests
 */
export const HEADER_ORGANIZATIONID = "X-SONDERR-ORGANIZATIONID"
export const HEADER_TASKID = "X-SONDERR-TASKID"
export const HEADER_PARENT_TASKID = "X-SONDERR-PARENT-TASKID"
export const HEADER_PROJECTID = "X-SONDERR-PROJECTID"
export const HEADER_TESTER = "X-SONDERR-TESTER"
export const HEADER_EDITORNAME = "X-SONDERR-EDITORNAME"
export const HEADER_MACHINEID = "X-SONDERR-MACHINEID"

/** Default editor name value */
export const DEFAULT_EDITOR_NAME = "Sonderr CLI"

/** Environment variable name for custom editor name */
export const ENV_EDITOR_NAME = "SONDERR_EDITOR_NAME"

/** Environment variable name for version (set by CLI at startup) */
export const ENV_VERSION = "SONDERR_VERSION"

/** Tester header value for suppressing warnings */
export const TESTER_SUPPRESS_VALUE = "SUPPRESS"

/** Header name for feature tracking */
export const HEADER_FEATURE = "X-SONDERR-FEATURE"

/** Environment variable name for feature override */
export const ENV_FEATURE = "SONDERR_FEATURE"

export const PROMPTS = [
  "codex",
  "gemini",
  "beast",
  "anthropic",
  "trinity",
  "anthropic_without_todo",
  "ling",
  "gpt55",
] as const

export const AI_SDK_PROVIDERS = [
  "anthropic",
  "openai",
  "openai-compatible",
  "openrouter",
] as const
