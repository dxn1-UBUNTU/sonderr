// ============================================================================
// Plugin
// ============================================================================
export { SonderrAuthPlugin, default } from "./plugin.js"

// ============================================================================
// Provider
// ============================================================================
export { createSonderr } from "./provider.js"
export { createSonderrDebug } from "./provider-debug.js"
export { sonderrCustomLoader } from "./loader.js"
export { buildSonderrHeaders, getEditorNameHeader, getFeatureHeader, getDefaultHeaders, getUserAgent } from "./headers.js"

// ============================================================================
// Auth
// ============================================================================
export { authenticateWithDeviceAuth } from "./auth/device-auth.js"
export { authenticateWithDeviceAuthTUI } from "./auth/device-auth-tui.js"
export { getSonderrUrlFromToken, isValidSonderrToken, getApiKey } from "./auth/token.js"
export { poll, formatTimeRemaining } from "./auth/polling.js"
export { migrateLegacySonderrAuth, LEGACY_CONFIG_PATH } from "./auth/legacy-migration.js"

// ============================================================================
// API
// ============================================================================
export {
  fetchProfile,
  fetchBalance,
  fetchProfileWithBalance,
  fetchDefaultModel,
  getSonderrProfile,
  defaultOrganizationId,
  getSonderrBalance,
  getSonderrDefaultModel,
  promptOrganizationSelection,
} from "./api/profile.js"
export { fetchSonderrPassState } from "./api/sonderr-pass.js"
export {
  fetchSonderrModels,
  type SonderrModelsResult,
  fetchSonderrImageModels,
  type SonderrImageModel,
  type SonderrImageModelsResult,
  fetchSonderrTranscriptionModels,
  type SonderrTranscriptionModel,
  type SonderrTranscriptionModelsResult,
} from "./api/models.js"
export {
  EMPTY_SONDERR_EMBEDDING_MODEL_CATALOG,
  fetchSonderrEmbeddingModelCatalog,
  type SonderrEmbeddingModel,
  type SonderrEmbeddingModelCatalog,
  type SonderrEmbeddingModelCatalogIssue,
} from "./api/embedding-models.js"
export { resolveSonderrGatewayBaseUrl, resolveSonderrOpenRouterBaseUrl } from "./api/url.js"
export {
  AUTOCOMPLETE_MODELS,
  DEFAULT_AUTOCOMPLETE_MODEL,
  getAutocompleteModel,
  getAutocompleteModelById,
  validAutocompleteModel,
  validAutocompleteProvider,
  type AutocompleteModelDef,
  type AutocompleteProviderID,
} from "./autocomplete.js"
export {
  fetchOrganizationModes,
  clearModesCache,
  type OrganizationMode,
  type OrganizationModeConfig,
} from "./api/modes.js"
export { fetchSonderrNotifications, type SonderrNotification } from "./api/notifications.js"
export {
  fetchByokEntries,
  fetchCodingPlanSubscriptions,
  fetchCodingPlanUsage,
  type ByokEntry,
  type CodingPlanSubscription,
  type CodingPlanQuotaWindow,
} from "./api/trpc.js"
export {
  fetchCloudSession,
  fetchCloudSessionForImport,
  SessionImportValidationError,
  prepareSessionImport,
  importSessionToDb,
} from "./cloud-sessions.js"

// ============================================================================
// Server Routes (optional - requires hono and Sonderr dependencies)
// ============================================================================
export { createSonderrRoutes } from "./server/routes.js"
export {
  GatewayError,
  UnauthorizedError,
  getOrganizationId,
  getClawChatCredentials,
  getClawStatus,
  getCloudSessions,
  getNotifications,
  getProfile,
  getToken,
  normalizeClawStatus,
  setOrganization,
} from "./server/handlers.js"

// ============================================================================
// Note: TUI exports moved to separate entry point
// ============================================================================
// For TUI components and commands, import from "@sonderr/sonderr-gateway/tui"
// This avoids circular dependencies with sonderr TUI infrastructure

// ============================================================================
// Types
// ============================================================================
export type {
  // Auth types
  DeviceAuthInitiateResponse,
  DeviceAuthPollResponse,
  Organization,
  SonderrProfile,
  SonderrBalance,
  SonderrPassState,
  PollOptions,
  PollResult,
  // Provider types
  SonderrProvider,
  SonderrProviderOptions,
  SonderrMetadata,
  CustomLoaderResult,
  ProviderInfo,
  LanguageModelV3,
} from "./types.js"

// ============================================================================
// Constants
// ============================================================================
export {
  ENV_SONDERR_API_URL,
  DEFAULT_SONDERR_API_URL,
  SONDERR_API_BASE,
  SONDERR_CHAT_URL,
  SONDERR_EVENT_SERVICE_URL,
  SONDERR_OPENROUTER_BASE,
  POLL_INTERVAL_MS,
  DEFAULT_MODEL,
  DEFAULT_FREE_MODEL,
  TOKEN_EXPIRATION_MS,
  USER_AGENT_BASE,
  CONTENT_TYPE,
  DEFAULT_PROVIDER_NAME,
  ANONYMOUS_API_KEY,
  MODELS_FETCH_TIMEOUT_MS,
  HEADER_ORGANIZATIONID,
  HEADER_TASKID,
  HEADER_PARENT_TASKID,
  HEADER_PROJECTID,
  HEADER_TESTER,
  HEADER_EDITORNAME,
  HEADER_MACHINEID,
  HEADER_FEATURE,
  DEFAULT_EDITOR_NAME,
  ENV_EDITOR_NAME,
  ENV_VERSION,
  TESTER_SUPPRESS_VALUE,
  ENV_FEATURE,
  PROMPTS,
  AI_SDK_PROVIDERS,
} from "./api/constants.js"
