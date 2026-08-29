import { Config } from "effect"
import { InstallationChannel } from "../installation/version" // sonderr_change

export function truthy(key: string) {
  const value = process.env[key]?.toLowerCase()
  return value === "true" || value === "1"
}

// sonderr_change start
function falsy(key: string) {
  const value = process.env[key]?.toLowerCase()
  return value === "false" || value === "0"
}

const UNSTABLE_CHANNELS = new Set(["dev", "beta", "local"])
function unstableDefault(key: string) {
  return truthy(key) || (!falsy(key) && UNSTABLE_CHANNELS.has(InstallationChannel))
}

function number(key: string) {
  const value = process.env[key]
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}

const SONDERR_EXPERIMENTAL = truthy("SONDERR_EXPERIMENTAL")
const SONDERR_DISABLE_CLAUDE_CODE = truthy("SONDERR_DISABLE_CLAUDE_CODE")
const SONDERR_DISABLE_CLAUDE_CODE_SKILLS = SONDERR_DISABLE_CLAUDE_CODE || truthy("SONDERR_DISABLE_CLAUDE_CODE_SKILLS")
// sonderr_change end
const copy = process.env["SONDERR_EXPERIMENTAL_DISABLE_COPY_ON_SELECT"]
const fff = process.env["SONDERR_DISABLE_FFF"]

function enabledByExperimental(key: string) {
  return process.env[key] === undefined ? truthy("SONDERR_EXPERIMENTAL") : truthy(key)
}

export const Flag = {
  OTEL_EXPORTER_OTLP_ENDPOINT: process.env["OTEL_EXPORTER_OTLP_ENDPOINT"],
  OTEL_EXPORTER_OTLP_HEADERS: process.env["OTEL_EXPORTER_OTLP_HEADERS"],

  SONDERR_AUTO_SHARE: truthy("SONDERR_AUTO_SHARE"), // sonderr_change
  SONDERR_AUTO_HEAP_SNAPSHOT: truthy("SONDERR_AUTO_HEAP_SNAPSHOT"),
  SONDERR_GIT_BASH_PATH: process.env["SONDERR_GIT_BASH_PATH"],
  SONDERR_CONFIG: process.env["SONDERR_CONFIG"],
  SONDERR_CONFIG_CONTENT: process.env["SONDERR_CONFIG_CONTENT"],
  SONDERR_DISABLE_AUTOUPDATE: truthy("SONDERR_DISABLE_AUTOUPDATE"),
  SONDERR_ALWAYS_NOTIFY_UPDATE: truthy("SONDERR_ALWAYS_NOTIFY_UPDATE"),
  SONDERR_DISABLE_PRUNE: truthy("SONDERR_DISABLE_PRUNE"),
  SONDERR_DISABLE_TERMINAL_TITLE: truthy("SONDERR_DISABLE_TERMINAL_TITLE"),
  SONDERR_SHOW_TTFD: truthy("SONDERR_SHOW_TTFD"),
  // sonderr_change start
  SONDERR_DISABLE_DEFAULT_PLUGINS: truthy("SONDERR_DISABLE_DEFAULT_PLUGINS"),
  SONDERR_DISABLE_LSP_DOWNLOAD: truthy("SONDERR_DISABLE_LSP_DOWNLOAD"),
  SONDERR_ENABLE_EXPERIMENTAL_MODELS: truthy("SONDERR_ENABLE_EXPERIMENTAL_MODELS"),
  // sonderr_change end
  SONDERR_DISABLE_AUTOCOMPACT: truthy("SONDERR_DISABLE_AUTOCOMPACT"),
  SONDERR_DISABLE_MODELS_FETCH: truthy("SONDERR_DISABLE_MODELS_FETCH"),
  SONDERR_DISABLE_MOUSE: truthy("SONDERR_DISABLE_MOUSE"),
  // sonderr_change start
  SONDERR_DISABLE_CLAUDE_CODE,
  SONDERR_DISABLE_CLAUDE_CODE_PROMPT: SONDERR_DISABLE_CLAUDE_CODE || truthy("SONDERR_DISABLE_CLAUDE_CODE_PROMPT"),
  SONDERR_DISABLE_CLAUDE_CODE_SKILLS,
  SONDERR_DISABLE_EXTERNAL_SKILLS: truthy("SONDERR_DISABLE_EXTERNAL_SKILLS"),
  SONDERR_EXPERIMENTAL_CUSTOMIZE_SKILL: unstableDefault("SONDERR_EXPERIMENTAL_CUSTOMIZE_SKILL"),
  // sonderr_change end
  SONDERR_FAKE_VCS: process.env["SONDERR_FAKE_VCS"],
  SONDERR_SERVER_PASSWORD: process.env["SONDERR_SERVER_PASSWORD"],
  SONDERR_SERVER_USERNAME: process.env["SONDERR_SERVER_USERNAME"],
  SONDERR_ENABLE_QUESTION_TOOL: truthy("SONDERR_ENABLE_QUESTION_TOOL"), // sonderr_change

  SONDERR_EXPERIMENTAL, // sonderr_change

  SONDERR_EXPERIMENTAL_FILEWATCHER: Config.boolean("SONDERR_EXPERIMENTAL_FILEWATCHER").pipe(Config.withDefault(false)), // sonderr_change

  SONDERR_EXPERIMENTAL_DISABLE_FILEWATCHER: Config.boolean("SONDERR_EXPERIMENTAL_DISABLE_FILEWATCHER").pipe(
    Config.withDefault(false),
  ),

  SONDERR_EXPERIMENTAL_ICON_DISCOVERY: SONDERR_EXPERIMENTAL || truthy("SONDERR_EXPERIMENTAL_ICON_DISCOVERY"), // sonderr_change

  SONDERR_EXPERIMENTAL_DISABLE_COPY_ON_SELECT:
    copy === undefined ? process.platform === "win32" : truthy("SONDERR_EXPERIMENTAL_DISABLE_COPY_ON_SELECT"),

  SONDERR_ENABLE_EXA: truthy("SONDERR_ENABLE_EXA") || SONDERR_EXPERIMENTAL || truthy("SONDERR_EXPERIMENTAL_EXA"), // sonderr_change

  SONDERR_EXPERIMENTAL_BASH_DEFAULT_TIMEOUT_MS: number("SONDERR_EXPERIMENTAL_BASH_DEFAULT_TIMEOUT_MS"), // sonderr_change

  SONDERR_EXPERIMENTAL_OUTPUT_TOKEN_MAX: number("SONDERR_EXPERIMENTAL_OUTPUT_TOKEN_MAX"), // sonderr_change

  SONDERR_EXPERIMENTAL_OXFMT: SONDERR_EXPERIMENTAL || truthy("SONDERR_EXPERIMENTAL_OXFMT"), // sonderr_change

  SONDERR_EXPERIMENTAL_LSP_TY: truthy("SONDERR_EXPERIMENTAL_LSP_TY"), // sonderr_change

  SONDERR_EXPERIMENTAL_LSP_TOOL: SONDERR_EXPERIMENTAL || truthy("SONDERR_EXPERIMENTAL_LSP_TOOL"), // sonderr_change

  SONDERR_EXPERIMENTAL_PLAN_MODE: SONDERR_EXPERIMENTAL || truthy("SONDERR_EXPERIMENTAL_PLAN_MODE"), // sonderr_change

  SONDERR_EXPERIMENTAL_SCOUT: SONDERR_EXPERIMENTAL || truthy("SONDERR_EXPERIMENTAL_SCOUT"), // sonderr_change

  SONDERR_EXPERIMENTAL_MARKDOWN: !falsy("SONDERR_EXPERIMENTAL_MARKDOWN"), // sonderr_change

  SONDERR_ENABLE_PARALLEL: truthy("SONDERR_ENABLE_PARALLEL") || truthy("SONDERR_EXPERIMENTAL_PARALLEL"), // sonderr_change

  SONDERR_MODELS_URL: process.env["SONDERR_MODELS_URL"],

  SONDERR_MODELS_PATH: process.env["SONDERR_MODELS_PATH"],

  SONDERR_DISABLE_EMBEDDED_WEB_UI: truthy("SONDERR_DISABLE_EMBEDDED_WEB_UI"), // sonderr_change

  SONDERR_DB: process.env["SONDERR_DB"],

  SONDERR_DISABLE_CHANNEL_DB: truthy("SONDERR_DISABLE_CHANNEL_DB"), // sonderr_change

  SONDERR_SKIP_MIGRATIONS: truthy("SONDERR_SKIP_MIGRATIONS"), // sonderr_change

  SONDERR_STRICT_CONFIG_DEPS: truthy("SONDERR_STRICT_CONFIG_DEPS"), // sonderr_change

  SONDERR_WORKSPACE_ID: process.env["SONDERR_WORKSPACE_ID"],

  SONDERR_EXPERIMENTAL_WORKSPACES: enabledByExperimental("SONDERR_EXPERIMENTAL_WORKSPACES"),

  SONDERR_EXPERIMENTAL_EVENT_SYSTEM: SONDERR_EXPERIMENTAL || truthy("SONDERR_EXPERIMENTAL_EVENT_SYSTEM"), // sonderr_change

  SONDERR_EXPERIMENTAL_SESSION_SWITCHING: SONDERR_EXPERIMENTAL || truthy("SONDERR_EXPERIMENTAL_SESSION_SWITCHING"), // sonderr_change

  SONDERR_EXPERIMENTAL_SESSION_SWITCHER: enabledByExperimental("SONDERR_EXPERIMENTAL_SESSION_SWITCHER"), // sonderr_change

  SONDERR_DISABLE_FFF: fff === undefined ? process.platform === "win32" : truthy("SONDERR_DISABLE_FFF"), // sonderr_change

  get SONDERR_DISABLE_PROJECT_CONFIG() {
    return truthy("SONDERR_DISABLE_PROJECT_CONFIG")
  },
  get SONDERR_EXPERIMENTAL_REFERENCES() {
    return enabledByExperimental("SONDERR_EXPERIMENTAL_REFERENCES")
  },
  get SONDERR_TUI_CONFIG() {
    return process.env["SONDERR_TUI_CONFIG"]
  },
  get SONDERR_CONFIG_DIR() {
    return process.env["SONDERR_CONFIG_DIR"]
  },
  get SONDERR_PURE() {
    return truthy("SONDERR_PURE")
  },
  get SONDERR_PERMISSION() {
    return process.env["SONDERR_PERMISSION"]
  },
  get SONDERR_PLUGIN_META_FILE() {
    return process.env["SONDERR_PLUGIN_META_FILE"]
  },
  get SONDERR_CLIENT() {
    return process.env["SONDERR_CLIENT"] ?? "cli"
  },
  // sonderr_change start
  get SONDERR_SESSION_RETRY_LIMIT() {
    return number("SONDERR_SESSION_RETRY_LIMIT")
  },
  // sonderr_change end
}
