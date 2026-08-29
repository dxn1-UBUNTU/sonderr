import { Config, ConfigProvider, Context, Effect, Layer, Option } from "effect"
import { ConfigService } from "@/effect/config-service"

const bool = (name: string) => Config.boolean(name).pipe(Config.withDefault(false))
const positiveInteger = (name: string) =>
  Config.number(name).pipe(
    Config.map((value) => (Number.isInteger(value) && value > 0 ? value : undefined)),
    Config.orElse(() => Config.succeed(undefined)),
  )
const experimental = bool("SONDERR_EXPERIMENTAL")
const enabledByExperimental = (name: string) =>
  Config.all({ experimental, enabled: Config.boolean(name).pipe(Config.option) }).pipe(
    Config.map((flags) => Option.getOrElse(flags.enabled, () => flags.experimental)),
  )

export class Service extends ConfigService.Service<Service>()("@sonderr/RuntimeFlags", {
  autoShare: bool("SONDERR_AUTO_SHARE"),
  pure: bool("SONDERR_PURE"),
  disableDefaultPlugins: bool("SONDERR_DISABLE_DEFAULT_PLUGINS"),
  disableChannelDb: bool("SONDERR_DISABLE_CHANNEL_DB"), // sonderr_change
  disableEmbeddedWebUi: bool("SONDERR_DISABLE_EMBEDDED_WEB_UI"),
  disableExternalSkills: bool("SONDERR_DISABLE_EXTERNAL_SKILLS"),
  disableSkillShell: bool("SONDERR_DISABLE_SKILL_SHELL"), // sonderr_change - disable shell injection in skill bodies
  disableLspDownload: bool("SONDERR_DISABLE_LSP_DOWNLOAD"),
  skipMigrations: bool("SONDERR_SKIP_MIGRATIONS"), // sonderr_change
  disableClaudeCodePrompt: Config.all({
    broad: bool("SONDERR_DISABLE_CLAUDE_CODE"),
    direct: bool("SONDERR_DISABLE_CLAUDE_CODE_PROMPT"),
  }).pipe(Config.map((flags) => flags.broad || flags.direct)),
  disableClaudeCodeSkills: Config.all({
    broad: bool("SONDERR_DISABLE_CLAUDE_CODE"),
    direct: bool("SONDERR_DISABLE_CLAUDE_CODE_SKILLS"),
  }).pipe(Config.map((flags) => flags.broad || flags.direct)),
  enableExa: Config.all({
    experimental,
    enabled: bool("SONDERR_ENABLE_EXA"),
    legacy: bool("SONDERR_EXPERIMENTAL_EXA"),
  }).pipe(Config.map((flags) => flags.experimental || flags.enabled || flags.legacy)),
  enableParallel: Config.all({
    enabled: bool("SONDERR_ENABLE_PARALLEL"),
    legacy: bool("SONDERR_EXPERIMENTAL_PARALLEL"),
  }).pipe(Config.map((flags) => flags.enabled || flags.legacy)),
  enableExperimentalModels: bool("SONDERR_ENABLE_EXPERIMENTAL_MODELS"),
  enableQuestionTool: bool("SONDERR_ENABLE_QUESTION_TOOL"),
  experimentalScout: enabledByExperimental("SONDERR_EXPERIMENTAL_SCOUT"), // sonderr_change
  experimentalReferences: enabledByExperimental("SONDERR_EXPERIMENTAL_REFERENCES"),
  // sonderr_change start - enabled by default, with an opt-out kill switch
  experimentalBackgroundSubagents: Config.boolean("SONDERR_EXPERIMENTAL_BACKGROUND_SUBAGENTS").pipe(
    Config.withDefault(true),
  ),
  // sonderr_change end
  experimentalLspTy: bool("SONDERR_EXPERIMENTAL_LSP_TY"),
  experimentalLspTool: enabledByExperimental("SONDERR_EXPERIMENTAL_LSP_TOOL"),
  experimentalOxfmt: enabledByExperimental("SONDERR_EXPERIMENTAL_OXFMT"),
  experimentalPlanMode: enabledByExperimental("SONDERR_EXPERIMENTAL_PLAN_MODE"),
  experimentalCodeMode: enabledByExperimental("SONDERR_EXPERIMENTAL_CODE_MODE"),
  experimentalEventSystem: enabledByExperimental("SONDERR_EXPERIMENTAL_EVENT_SYSTEM"),
  experimentalSessionSwitcher: enabledByExperimental("SONDERR_EXPERIMENTAL_SESSION_SWITCHER"), // sonderr_change
  experimentalWorkspaces: enabledByExperimental("SONDERR_EXPERIMENTAL_WORKSPACES"),
  experimentalIconDiscovery: enabledByExperimental("SONDERR_EXPERIMENTAL_ICON_DISCOVERY"),
  experimentalMcpApps: enabledByExperimental("SONDERR_EXPERIMENTAL_MCP_APPS"), // sonderr_change
  outputTokenMax: positiveInteger("SONDERR_EXPERIMENTAL_OUTPUT_TOKEN_MAX"),
  bashDefaultTimeoutMs: positiveInteger("SONDERR_EXPERIMENTAL_BASH_DEFAULT_TIMEOUT_MS"),
  experimentalNativeLlm: bool("SONDERR_EXPERIMENTAL_NATIVE_LLM"),
  experimentalWebSockets: bool("SONDERR_EXPERIMENTAL_WEBSOCKETS"),
  client: Config.string("SONDERR_CLIENT").pipe(Config.withDefault("cli")),
}) {}

export type Info = Context.Service.Shape<typeof Service>

const emptyConfigLayer = Service.layer.pipe(
  Layer.provide(ConfigProvider.layer(ConfigProvider.fromUnknown({}))),
  Layer.orDie,
)

export const layer = (overrides: Partial<Info> = {}) =>
  Layer.effect(
    Service,
    Effect.gen(function* () {
      const flags = yield* Service
      return Service.of({ ...flags, ...overrides })
    }),
  ).pipe(Layer.provide(emptyConfigLayer))

export const node = LayerNode.make({ service: Service, layer: Service.layer.pipe(Layer.orDie), deps: [] })

export * as RuntimeFlags from "./runtime-flags"
import { LayerNode } from "@sonderr/core/effect/layer-node"
