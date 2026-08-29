import { LayerNode } from "@sonderr/core/effect/layer-node"
import { httpClient } from "@sonderr/core/effect/app-node-platform"
import { serviceUse } from "@sonderr/core/effect/service-use"
import path from "path"
import { pathToFileURL } from "url"
import os from "os"
import { mergeDeep } from "remeda"
import { Global } from "@sonderr/core/global"
import fsNode from "fs/promises"
import { Flag } from "@sonderr/core/flag/flag"
import { notices } from "@sonderr/core/sonderr/fff" // sonderr_change
import { Auth } from "../auth"
import { Env } from "../env"
import { applyEdits, findNodeAtLocation, modify, parseTree } from "jsonc-parser" // sonderr_change - parseTree/findNodeAtLocation used in patchJsonc
import { InstallationLocal, InstallationVersion } from "@sonderr/core/installation/version"
import { existsSync } from "fs"
// sonderr_change start
import { GlobalBus } from "@/bus/global"
import { Event } from "../server/event"
// sonderr_change end
import { Account } from "@/account/account"
import { isRecord } from "@/util/record"
import type { ConsoleState } from "@sonderr/core/v1/config/console-state"
import { FSUtil } from "@sonderr/core/fs-util"
import { InstanceState } from "@/effect/instance-state"
import { Context, Duration, Effect, Fiber, Layer, Option, Schema } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import { EffectFlock } from "@sonderr/core/util/effect-flock"
import { containsPath, type InstanceContext } from "../project/instance-context"
import { ConfigV1 } from "@sonderr/core/v1/config/config"
import { RemoteAuthError } from "@sonderr/core/v1/config/error"
import { ConfigPermissionV1 } from "@sonderr/core/v1/config/permission"
import { ConfigPluginV1 } from "@sonderr/core/v1/config/plugin"
import { ConfigAgent } from "./agent"
import { ConfigCommand } from "./command"
import { ConfigManaged } from "./managed"
import { ConfigParse } from "./parse"
import { ConfigPaths } from "./paths"
import { ConfigPlugin } from "./plugin"
import { ConfigVariable } from "./variable"
import { Npm } from "@sonderr/core/npm"
import z from "zod" // sonderr_change - Sonderr config compatibility schemas
// sonderr_change start
import { ZodOverride } from "@sonderr/core/effect-zod"
import { SonderrConfig } from "../sonderr/config/config"
import { sanitizeProjectMcpHeaders } from "../sonderr/config/mcp-headers"
import { primaryPaths } from "../sonderr/primary-worktree"
import { Git } from "@/git"
import { SonderrDefaultPlugins } from "@/sonderr/config/default-plugins"
import { SonderrGlobalConfigStamp } from "@/sonderr/config/global-stamp"
import { SandboxConfig } from "@/sonderr/sandbox/config"
import { ExternalMarkdown } from "@/sonderr/config/external-markdown"
import type { SonderrMarkdown } from "@/sonderr/config/markdown"
import {
  IndexingConfig as SonderrIndexingConfig,
  IndexingSchema as SonderrIndexingSchema,
} from "@sonderr/sonderr-indexing/config"
import { unique } from "remeda"
import { installLocalPluginDependency, needsLocalPluginDependency } from "@/sonderr/config/plugin-deps"
// sonderr_change end
import { withTransientReadRetry } from "@/util/effect-http-client"
import * as Log from "@sonderr/core/util/log" // sonderr_change

const log = Log.create({ service: "config" }) // sonderr_change

// Custom merge function that concatenates array fields instead of replacing them
// Keep remeda's deep conditional merge type out of hot config-loading paths; TS profiling showed it dominates here.
function mergeConfig(target: Info, source: Info): Info {
  return mergeDeep(target, source) as Info
}

function mergeConfigConcatArrays(target: Info, source: Info, trusted = true): Info {
  // sonderr_change
  const merged = trusted ? mergeConfig(target, source) : SonderrConfig.mergeProject(target, source)
  if (target.instructions && source.instructions) {
    merged.instructions = Array.from(new Set([...target.instructions, ...source.instructions]))
  }
  return merged
}

function normalizeLoadedConfig(data: unknown, source: string) {
  if (!isRecord(data)) return data
  const copy = SonderrConfig.retireExperimentalFlags({ ...data }, source) // sonderr_change
  const hadLegacy = "theme" in copy || "keybinds" in copy || "tui" in copy
  if (!hadLegacy) return copy
  delete copy.theme
  delete copy.keybinds
  delete copy.tui
  log.warn("tui keys in the main config are deprecated; move them to tui.json", { path: source }) // sonderr_change
  return copy
}

// sonderr_change start
export const Warning = z.object({
  path: z.string(),
  message: z.string(),
  detail: z.string().optional(),
})
export type Warning = z.infer<typeof Warning>

const { caught: caughtWarning } = SonderrConfig
// sonderr_change end

async function substituteWellKnownRemoteConfig(input: {
  value: unknown
  dir: string
  source: string
  env: Record<string, string>
}) {
  if (!isRecord(input.value) || typeof input.value.url !== "string") return undefined

  const url = await ConfigVariable.substitute({
    text: input.value.url,
    type: "virtual",
    dir: input.dir,
    source: input.source,
    env: input.env,
    trusted: true, // sonderr_change - well-known org config is a trusted source
  })
  const headers = isRecord(input.value.headers)
    ? Object.fromEntries(
        await Promise.all(
          Object.entries(input.value.headers)
            .filter((entry): entry is [string, string] => typeof entry[1] === "string")
            .map(async ([key, value]) => [
              key,
              await ConfigVariable.substitute({
                text: value,
                type: "virtual",
                dir: input.dir,
                source: input.source,
                env: input.env,
                trusted: true, // sonderr_change - well-known org config is a trusted source
              }),
            ]),
        ),
      )
    : undefined

  return { url, headers }
}

async function resolveLoadedPlugins<T extends { plugin?: ConfigPluginV1.Spec[] }>(config: T, filepath: string) {
  if (!config.plugin) return config
  for (let i = 0; i < config.plugin.length; i++) {
    // Normalize path-like plugin specs while we still know which config file declared them.
    // This prevents `./plugin.ts` from being reinterpreted relative to some later merge location.
    config.plugin[i] = await ConfigPlugin.resolvePluginSpec(config.plugin[i], filepath)
  }
  return config
}

export type Info = ConfigV1.Info & {
  // sonderr_change - keep exported so existing Config.Info call sites don't need repo-wide migration to ConfigV1.Info
  // plugin_origins is derived state, not a persisted config field. It keeps each winning plugin spec together
  // with the file and scope it came from so later runtime code can make location-sensitive decisions.
  plugin_origins?: ConfigPlugin.Origin[]
  // sonderr_change start - derived provenance for markdown paths selected by config
  instruction_origins?: Record<string, SonderrMarkdown.Source>
  skill_path_origins?: Record<string, SonderrMarkdown.Source>
  // derived provenance for permission patterns: which config scope (global XDG vs local project)
  // last set each permission + pattern. Keyed per pattern (not just per key) because global and
  // project config can contribute different patterns under the same key. Lets the runtime explain
  // why a tool call was auto-approved.
  permission_origins?: Record<string, Record<string, "global" | "local">>
  // sonderr_change end
}

// sonderr_change - value re-export for the call sites that pass Config.Info as a schema
export const Info = ConfigV1.Info

type State = {
  config: Info
  directories: string[]
  deps: Fiber.Fiber<void>[]
  warnings: Warning[] // sonderr_change
  consoleState: ConsoleState
}

export interface Interface {
  readonly get: () => Effect.Effect<Info>
  readonly getGlobal: () => Effect.Effect<Info>
  readonly getConsoleState: () => Effect.Effect<ConsoleState>
  readonly update: (config: Info) => Effect.Effect<void>
  // sonderr_change start
  readonly updateGlobal: (
    config: Info,
    options?: { dispose?: boolean },
  ) => Effect.Effect<{ info: Info; changed: boolean }>
  // sonderr_change end
  readonly invalidate: () => Effect.Effect<void>
  readonly directories: () => Effect.Effect<string[]>
  readonly waitForDependencies: () => Effect.Effect<void>
  readonly warnings: () => Effect.Effect<Warning[]> // sonderr_change
}

export class Service extends Context.Service<Service, Interface>()("@sonderr/Config") {}

export const use = serviceUse(Service)

function globalConfigFile() {
  // sonderr_change start
  const candidates = ["sonderr.jsonc", "sonderr.json", "sonderr.jsonc", "sonderr.json", "config.json"].map((file) =>
    // sonderr_change end
    path.join(Global.Path.config, file),
  )
  for (const file of candidates) {
    if (existsSync(file)) return file
  }
  return candidates[0]
}

function patchJsonc(input: string, patch: unknown, path: string[] = []): string {
  if (!isRecord(patch)) {
    // sonderr_change start - jsonc-parser throws when deleting a path whose
    // parent does not exist in the document; absent keys are already "unset"
    if (patch === null) {
      const tree = parseTree(input)
      if (!tree || !findNodeAtLocation(tree, path)) return input
    }
    // sonderr_change end
    const edits = modify(input, path, patch === null ? undefined : patch, {
      // sonderr_change
      formattingOptions: {
        insertSpaces: true,
        tabSize: 2,
      },
    })
    return applyEdits(input, edits)
  }

  // sonderr_change start — when the existing JSONC node at this path is a
  // scalar (e.g. permission.bash is "ask" as a string), jsonc-parser cannot
  // add child keys to it. Detect this case and replace the whole node with
  // the patch object in a single modify() call instead of recursing.
  // For permission keys, promote the scalar to { "*": scalarValue } so the
  // wildcard default is preserved. For other keys, replace directly.
  if (path.length > 0) {
    const tree = parseTree(input)
    const node = tree && findNodeAtLocation(tree, path)
    if (node && node.type !== "object") {
      const isPermissionKey = path[0] === "permission" && path.length === 2
      const replacement = isPermissionKey ? { "*": node.value, ...patch } : patch
      const edits = modify(input, path, replacement, {
        formattingOptions: { insertSpaces: true, tabSize: 2 },
      })
      return applyEdits(input, edits)
    }
  }
  // sonderr_change end

  return Object.entries(patch).reduce((result, [key, value]) => patchJsonc(result, value, [...path, key]), input)
}

function writable(info: Info) {
  // sonderr_change start - derived provenance is runtime-only and must never be persisted
  const {
    plugin_origins: _plugin_origins,
    instruction_origins: _instruction_origins,
    skill_path_origins: _skill_path_origins,
    permission_origins: _permission_origins,
    ...next
  } = info
  // sonderr_change end
  return next
}

function writableGlobal(info: Info) {
  const next = writable(info)
  // When a user changes config from a value back to default in the Desktop app, we don't want to leave a blank `"shell": "",` key
  if ("shell" in next && next.shell === "") return { ...next, shell: undefined }
  return next
}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const fs = yield* FSUtil.Service
    const authSvc = yield* Auth.Service
    const accountSvc = yield* Account.Service
    const env = yield* Env.Service
    const npmSvc = yield* Npm.Service
    const http = yield* HttpClient.HttpClient
    const git = yield* Git.Service // sonderr_change
    const flock = yield* EffectFlock.Service // sonderr_change - serialize global config read-merge-write updates

    const readConfigFile = (filepath: string) => fs.readFileStringSafe(filepath).pipe(Effect.orDie)

    const fetchRemoteJson = Effect.fnUntraced(function* <S extends Schema.Top>(
      url: string,
      headers: Record<string, string> | undefined,
      schema: S,
      loginOrigin: string,
    ) {
      const response = yield* HttpClient.filterStatusOk(withTransientReadRetry(http))
        .execute(
          HttpClientRequest.get(url).pipe(HttpClientRequest.acceptJson, HttpClientRequest.setHeaders(headers ?? {})),
        )
        .pipe(
          Effect.catch((error) => Effect.die(new Error(`failed to fetch remote config from ${url}: ${String(error)}`))),
        )
      const body = yield* response.text.pipe(
        Effect.catch((error) => Effect.die(new Error(`failed to read remote config from ${url}: ${String(error)}`))),
      )
      // An auth proxy can answer with an HTML login page at HTTP 200 (passes filterStatusOk); treat it as a re-auth error, not a decode failure.
      const contentType = (response.headers["content-type"] ?? "").toLowerCase()
      if (contentType.includes("html") || /^\s*<!doctype|^\s*<html/i.test(body)) {
        return yield* Effect.die(new RemoteAuthError({ url: loginOrigin, remote: url }))
      }
      return yield* Schema.decodeEffect(Schema.fromJsonString(schema))(body).pipe(
        Effect.catch((error) => Effect.die(new Error(`failed to decode remote config from ${url}: ${String(error)}`))),
      )
    })

    const loadConfig = Effect.fnUntraced(function* (
      text: string,
      options: { path: string; original?: string } | { dir: string; source: string }, // sonderr_change
      env?: Record<string, string>,
      // sonderr_change start - trusted allows {env:}; fileScope confines untrusted {file:} reads to a root
      trusted?: boolean,
      fileScope?: ConfigVariable.FileScope,
      // sonderr_change end
    ) {
      const source = "path" in options ? options.path : options.source
      const expanded = yield* Effect.promise(() =>
        ConfigVariable.substitute(
          "path" in options
            ? { text, type: "path", path: options.path, env, trusted, fileScope } // sonderr_change
            : { text, type: "virtual", ...options, env, trusted, fileScope }, // sonderr_change
        ),
      )
      const parsed = ConfigParse.jsonc(expanded, source)
      const data = ConfigParse.schema(ConfigV1.Info, normalizeLoadedConfig(parsed, source), source)
      if (!("path" in options)) return data

      yield* Effect.promise(() => resolveLoadedPlugins(data, options.path))
      if (!data.$schema) {
        // sonderr_change start
        data.$schema = "https://app.kilo.ai/config.json"
        const original = options.original ?? text
        const edits = modify(original, ["$schema"], "https://app.kilo.ai/config.json", {
          formattingOptions: { insertSpaces: true, tabSize: 2 },
          getInsertionIndex: () => 0,
        })
        const updated = applyEdits(original, edits)
        if (updated !== original) {
          yield* fs.writeFileString(options.path, updated).pipe(Effect.catch(() => Effect.void))
        }
        // sonderr_change end
      }
      return data
    })

    const loadFile = Effect.fnUntraced(function* (
      filepath: string,
      env?: Record<string, string>,
      trusted?: boolean, // sonderr_change
      fileScope?: ConfigVariable.FileScope, // sonderr_change
      configWarnings?: Warning[], // sonderr_change - collect MCP header expansion warnings
    ) {
      yield* Effect.logInfo("loading", { path: filepath })
      const text = yield* readConfigFile(filepath)
      if (!text) return {} as Info
      // sonderr_change start - remove variable-bearing project MCP headers before generic substitution can read them
      const sanitized =
        trusted === false ? sanitizeProjectMcpHeaders(ConfigParse.jsonc(text, filepath), filepath) : undefined
      const content = sanitized ? (JSON.stringify(sanitized.config) ?? text) : text
      if (sanitized && configWarnings) configWarnings.push(...sanitized.warnings)
      const data = yield* loadConfig(
        content,
        { path: filepath, original: text },
        trusted === false ? undefined : env,
        trusted,
        fileScope,
      )
      // sonderr_change end
      return data
    })

    let globalStamp = "" // sonderr_change

    const loadGlobal = Effect.fnUntraced(function* (env?: Record<string, string>) {
      // sonderr_change start
      yield* Effect.promise(() => SonderrConfig.migrateBashPermission())
      globalStamp = yield* SonderrGlobalConfigStamp.read(fs, Global.Path.config)
      // sonderr_change end
      let result: Info = {}
      // Seed the default global config with the schema for editor completion, but avoid writing when the user
      // explicitly routes config through env-provided paths or content.
      if (!Flag.SONDERR_CONFIG && !Flag.SONDERR_CONFIG_DIR && !Flag.SONDERR_CONFIG_CONTENT) {
        const file = globalConfigFile()
        if (!existsSync(file)) {
          yield* fs
            .writeWithDirs(file, JSON.stringify({ $schema: "https://app.kilo.ai/config.json" }, null, 2))
            .pipe(Effect.catch(() => Effect.void))
        }
      }
      // sonderr_change - global config is user-owned and trusted to resolve {file:}/{env:} tokens
      result = mergeConfig(result, yield* loadFile(path.join(Global.Path.config, "config.json"), env, true))
      // sonderr_change start
      result = mergeConfig(result, yield* loadFile(path.join(Global.Path.config, "sonderr.json"), env, true))
      result = mergeConfig(result, yield* loadFile(path.join(Global.Path.config, "sonderr.jsonc"), env, true))
      // sonderr_change end
      result = mergeConfig(result, yield* loadFile(path.join(Global.Path.config, "sonderr.json"), env, true)) // sonderr_change
      result = mergeConfig(result, yield* loadFile(path.join(Global.Path.config, "sonderr.jsonc"), env, true)) // sonderr_change

      const legacy = path.join(Global.Path.config, "config")
      if (existsSync(legacy)) {
        yield* Effect.promise(() =>
          import(pathToFileURL(legacy).href, { with: { type: "toml" } })
            .then(async (mod) => {
              const { provider, model, ...rest } = mod.default
              if (provider && model) result.model = `${provider}/${model}`
              result["$schema"] = "https://app.kilo.ai/config.json" // sonderr_change
              result = mergeConfig(result, rest)
              await fsNode.writeFile(path.join(Global.Path.config, "config.json"), JSON.stringify(result, null, 2))
              await fsNode.unlink(legacy)
            })
            .catch(() => {}),
        )
      }

      globalStamp = yield* SonderrGlobalConfigStamp.read(fs, Global.Path.config) // sonderr_change
      return result
    })

    const [cachedGlobal, invalidateGlobal] = yield* Effect.cachedInvalidateWithTTL(
      loadGlobal().pipe(
        Effect.tapError((error) =>
          Effect.logError("failed to load global config, using defaults", { error: String(error) }),
        ),
        Effect.orElseSucceed((): Info => ({})),
      ),
      Duration.infinity,
    )

    // sonderr_change start - detect global config edits made by other Sonderr processes
    const refreshGlobal = Effect.fnUntraced(function* () {
      const stamp = yield* SonderrGlobalConfigStamp.read(fs, Global.Path.config)
      if (!globalStamp || stamp === globalStamp) return false
      // Keep globalStamp tied to config that loadGlobal completed. Advancing it
      // before invalidation reloads can hide a stale cached value from the next check.
      yield* invalidateGlobal
      return true
    })
    // sonderr_change end

    const getGlobal = Effect.fn("Config.getGlobal")(function* () {
      yield* refreshGlobal() // sonderr_change
      return yield* cachedGlobal
    })

    const ensureGitignore = Effect.fn("Config.ensureGitignore")(function* (dir: string) {
      // sonderr_change start - optional config setup must not abort tools after entering filesystem confinement or read-only locations
      yield* fs.ensureDir(dir).pipe(Effect.catchTag("PlatformError", () => Effect.void))
      // sonderr_change end
      const gitignore = path.join(dir, ".gitignore")
      const hasIgnore = yield* fs.existsSafe(gitignore)
      if (!hasIgnore) {
        yield* fs
          .writeFileString(
            gitignore,
            // sonderr_change start - added pnpm-lock.yaml, yarn.lock, agent-manager.json (not in upstream)
            [
              "node_modules",
              "package.json",
              "package-lock.json",
              "pnpm-lock.yaml",
              "bun.lock",
              "yarn.lock",
              ".gitignore",
              "agent-manager.json",
            ].join("\n"),
            // sonderr_change end
          )
          .pipe(Effect.catchTag("PlatformError", () => Effect.void)) // sonderr_change - optional gitignore write failure must not fail config load
      }
    })

    const loadInstanceState = Effect.fn("Config.loadInstanceState")(
      function* (ctx: InstanceContext) {
        // sonderr_change start - warning accumulator and legacy Sonderr config
        const warnings: Warning[] = notices(ctx.directory)
        // Untrusted project config may only read files inside this root (worktree, or directory for non-git projects).
        const projectRoot = ctx.worktree === "/" ? ctx.directory : ctx.worktree
        const auth = yield* authSvc.all().pipe(Effect.orDie)

        let result: Info = {}
        const legacy = yield* Effect.promise(() =>
          SonderrConfig.loadLegacyConfigs({
            projectDir: ctx.directory,
            merge: mergeConfigConcatArrays,
          }),
        )
        result = mergeConfigConcatArrays(result, legacy.config)
        // Legacy rules are discovered from fixed global/project directories, so their paths safely identify the
        // source boundary even though the migrator returns them as one merged instruction list.
        result.instruction_origins = Object.fromEntries(
          (legacy.config.instructions ?? []).map((item) => {
            const trusted = !containsPath(item, ctx)
            return [item, { trusted, source: item, root: trusted ? undefined : projectRoot }]
          }),
        )
        warnings.push(...legacy.warnings)

        const orgModes = yield* Effect.promise(() => SonderrConfig.loadOrganizationModes(auth))
        if (Object.keys(orgModes.agents).length > 0) {
          result = mergeConfigConcatArrays(result, { agent: orgModes.agents })
        }
        warnings.push(...orgModes.warnings)
        let configuredAgents = { ...(result.agent ?? {}) }
        // sonderr_change end

        const authEnv: Record<string, string> = {}
        const consoleManagedProviders = new Set<string>()
        let activeOrgName: string | undefined

        const pluginScopeForSource = Effect.fnUntraced(function* (source: string) {
          if (source.startsWith("http://") || source.startsWith("https://")) return "global"
          if (source === "SONDERR_CONFIG_CONTENT") return "local"
          if (containsPath(source, ctx)) return "local"
          return "global"
        })

        const mergePluginOrigins = Effect.fnUntraced(function* (
          source: string,
          // mergePluginOrigins receives raw Specs from one config source, before provenance for this merge step
          // is attached.
          list: ConfigPluginV1.Spec[] | undefined,
          // Scope can be inferred from the source path, but some callers already know whether the config should
          // behave as global or local and can pass that explicitly.
          kind?: ConfigPlugin.Scope,
        ) {
          if (!list?.length) return
          const hit = kind ?? (yield* pluginScopeForSource(source))
          // Merge newly seen plugin origins with previously collected ones, then dedupe by plugin identity while
          // keeping the winning source/scope metadata for downstream installs, writes, and diagnostics.
          const plugins = ConfigPlugin.deduplicatePluginOrigins([
            ...(result.plugin_origins ?? []),
            ...list.map((spec) => ({ spec, source, scope: hit })),
          ])
          result.plugin = plugins.map((item) => item.spec)
          result.plugin_origins = plugins
        })

        // sonderr_change start
        const origins = (
          prev: Record<string, SonderrMarkdown.Source> | undefined,
          values: readonly string[],
          trusted: boolean,
          source: string,
        ) => {
          const result = { ...prev }
          for (const value of values) {
            if (result[value]?.trusted) continue
            result[value] = { trusted, source, root: trusted ? undefined : projectRoot }
          }
          return result
        }

        const merge = Effect.fnUntraced(function* (
          source: string,
          next: Info,
          kind?: ConfigPlugin.Scope,
          sourceTrusted?: boolean,
        ) {
          const scope = kind ?? (yield* pluginScopeForSource(source))
          const trusted = sourceTrusted ?? scope === "global"
          const scoped = SonderrConfig.scopeIndexing(SandboxConfig.scope(next, scope), scope)
          result = mergeConfigConcatArrays(result, scoped, trusted) // sonderr_change
          if (scoped.agent) configuredAgents = mergeDeep(configuredAgents, scoped.agent)
          if (next.instructions?.length) {
            result.instruction_origins = origins(result.instruction_origins, next.instructions, trusted, source)
          }
          if (next.skills?.paths?.length) {
            result.skill_path_origins = origins(result.skill_path_origins, next.skills.paths, trusted, source)
          }
          // record which scope last set each permission + pattern. A scalar value (e.g. bash: "allow")
          // maps to pattern "*"; an object records each of its patterns. Global and project config can
          // contribute different patterns under one key, so track per pattern; later merges win.
          if (scoped.permission && typeof scoped.permission === "object") {
            const map = { ...result.permission_origins }
            for (const [key, value] of Object.entries(scoped.permission)) {
              if (value === null) continue
              const patterns = typeof value === "string" ? { "*": value } : value
              const inner = { ...map[key] }
              for (const [pattern, action] of Object.entries(patterns)) {
                if (action === null) continue
                inner[pattern] = scope
              }
              map[key] = inner
            }
            result.permission_origins = map
          }
          return yield* mergePluginOrigins(source, scoped.plugin, scope)
        })
        // sonderr_change end

        for (const [key, value] of Object.entries(auth)) {
          if (value.type === "wellknown") {
            const url = key.replace(/\/+$/, "")
            authEnv[value.key] = value.token
            const wellknownURL = `${url}/.well-known/sonderr`
            // sonderr_change start
            const source = wellknownURL
            yield* Effect.gen(function* () {
              yield* Effect.logDebug("fetching remote config", { url: wellknownURL })
              const wellknown = yield* fetchRemoteJson(wellknownURL, undefined, ConfigV1.WellKnown, url)
              const remote = yield* Effect.promise(() =>
                substituteWellKnownRemoteConfig({
                  value: wellknown.remote_config,
                  dir: url,
                  source: wellknownURL,
                  env: authEnv,
                }),
              )
              const fetchedConfig = remote
                ? yield* Effect.gen(function* () {
                    yield* Effect.logDebug("fetching remote config", { url: remote.url })
                    const data = yield* fetchRemoteJson(remote.url, remote.headers, Schema.Json, url)
                    if (isRecord(data) && isRecord(data.config)) return data.config
                    if (isRecord(data)) return data
                    return yield* Effect.die(
                      new Error(`failed to decode remote config from ${remote.url}: expected object`),
                    )
                  })
                : {}
              const remoteConfig = mergeConfig(isRecord(wellknown.config) ? wellknown.config : {}, fetchedConfig)
              if (!remoteConfig.$schema) remoteConfig.$schema = "https://app.kilo.ai/config.json"
              const next = yield* loadConfig(
                JSON.stringify(remoteConfig),
                {
                  dir: path.dirname(source),
                  source,
                },
                authEnv,
                true, // sonderr_change - well-known org config is a trusted source
              )
              yield* merge(source, next, "global")
              yield* Effect.logDebug("loaded remote config from well-known", { url })
            }).pipe(
              Effect.catch((err: unknown) => {
                caughtWarning(warnings, source, err)
                return Effect.logWarning("skipped remote config due to error", { url, err })
              }),
              Effect.catchDefect((err: unknown) => {
                caughtWarning(warnings, source, err)
                return Effect.logWarning("skipped remote config due to error", { url, err })
              }),
            )
            // sonderr_change end
          }
        }

        // sonderr_change start - capture global config failures as warnings
        const global = yield* (Object.keys(authEnv).length ? loadGlobal(authEnv) : getGlobal()).pipe(
          Effect.catchDefect((err: unknown) => {
            caughtWarning(warnings, "global config", err)
            return Effect.succeed({} as Info)
          }),
        )
        // sonderr_change end

        yield* merge(Global.Path.config, global, "global")

        if (Flag.SONDERR_CONFIG) {
          // sonderr_change start - capture SONDERR_CONFIG failures as warnings
          yield* merge(
            Flag.SONDERR_CONFIG,
            // sonderr_change - SONDERR_CONFIG is an explicit user-provided path, trusted for {file:}/{env:}
            yield* loadFile(Flag.SONDERR_CONFIG, authEnv, true).pipe(
              Effect.catchDefect((err: unknown) => {
                caughtWarning(warnings, Flag.SONDERR_CONFIG!, err)
                return Effect.succeed({} as Info)
              }),
            ),
            undefined,
            true,
          )
          // sonderr_change end
          yield* Effect.logDebug("loaded custom config", { path: Flag.SONDERR_CONFIG })
        }

        if (!Flag.SONDERR_DISABLE_PROJECT_CONFIG) {
          // sonderr_change start - also discover sonderr.json project files
          for (const name of ["sonderr", "sonderr"] as const) {
            for (const file of yield* ConfigPaths.files(name, ctx.directory, ctx.worktree).pipe(Effect.orDie)) {
              yield* merge(
                file,
                // sonderr_change - project config is untrusted: {env:} rejected by substitution; MCP entries with variable-bearing headers dropped pre-substitution, {file:} confined to projectRoot
                yield* loadFile(file, authEnv, false, { root: projectRoot, source: file }, warnings).pipe(
                  Effect.catchDefect((err: unknown) => {
                    caughtWarning(warnings, file, err)
                    return Effect.succeed({} as Info)
                  }),
                ),
                "local",
              )
            }
          }
          // sonderr_change end
        }

        result.agent = result.agent || {}
        result.mode = result.mode || {}
        result.plugin = result.plugin || []

        // sonderr_change start - include config directories from the primary checkout
        const directories = yield* ConfigPaths.directories(ctx.directory, ctx.worktree)
        const primary = Flag.SONDERR_DISABLE_PROJECT_CONFIG
          ? []
          : yield* primaryPaths(ctx.directory, ctx.worktree, [".sonderr", ".sonderr"])
        // Load primary fallbacks before active-worktree config, then track them as local.
        directories.splice(1, 0, ...primary)
        const primarySet = new Set(primary)
        // sonderr_change end

        if (Flag.SONDERR_CONFIG_DIR) {
          yield* Effect.logDebug("loading config from SONDERR_CONFIG_DIR", { path: Flag.SONDERR_CONFIG_DIR })
        }

        const deps: Fiber.Fiber<void>[] = []

        // sonderr_change start
        for (const dir of unique(directories)) {
          const plugins: ConfigPluginV1.Spec[] = [] // sonderr_change - track file plugins contributed by this directory
          const scope = primarySet.has(dir) ? "local" : undefined
          // sonderr_change - trust {file:}/{env:} only for global-scoped config dirs, never project ones
          const dirScope = scope ?? (yield* pluginScopeForSource(dir))
          const dirTrusted = dir === Flag.SONDERR_CONFIG_DIR || dirScope === "global"
          // sonderr_change - untrusted config dirs confine {file:} reads to projectRoot
          const dirFileScope = dirTrusted ? undefined : { root: projectRoot, source: dir }
          const dirSourceScope = dirTrusted
            ? undefined
            : { root: primarySet.has(dir) ? path.dirname(dir) : projectRoot, source: dir }
          if (SonderrConfig.isConfigDir(dir, Flag.SONDERR_CONFIG_DIR)) {
            for (const file of SonderrConfig.ALL_CONFIG_FILES) {
              const source = path.join(dir, file)
              yield* Effect.logDebug(`loading config from ${source}`)
              // sonderr_change - untrusted config dirs confine {file:} reads to projectRoot
              const fileScope = dirTrusted ? undefined : { root: projectRoot, source }
              const next = yield* loadFile(source, authEnv, dirTrusted, fileScope, dirTrusted ? undefined : warnings).pipe(
                Effect.catchDefect((err: unknown) => {
                  caughtWarning(warnings, source, err)
                  return Effect.succeed({} as Info)
                }),
              )
              plugins.push(...(next.plugin ?? []))
              yield* merge(source, next, dirScope, dirTrusted)
              result.agent ??= {}
              result.mode ??= {}
              result.plugin ??= []
            }
          }
          // sonderr_change end

          yield* ensureGitignore(dir).pipe(Effect.orDie)

          // sonderr_change start - propagate parse errors to the Warning accumulator
          const sourceScopes = (names: readonly string[]) => [
            ...(dirSourceScope ? [dirSourceScope] : []),
            ...ExternalMarkdown.scopes({
              dir,
              names,
              permission: result.permission,
              origins: result.permission_origins,
            }),
          ]
          result.command = mergeDeep(
            result.command ?? {},
            yield* Effect.promise(() =>
              ConfigCommand.load(dir, warnings, dirTrusted, dirFileScope, sourceScopes(["command", "commands"])),
            ),
          )
          result.agent = SonderrConfig.mergeAgentMarkdown(
            result.agent ?? {},
            yield* Effect.promise(() =>
              ConfigAgent.load(dir, warnings, dirTrusted, dirFileScope, sourceScopes(["agent", "agents"])),
            ),
            configuredAgents,
          )
          result.agent = SonderrConfig.mergeAgentMarkdown(
            result.agent ?? {},
            yield* Effect.promise(() => ConfigAgent.loadMode(dir, warnings, dirTrusted, dirFileScope, dirSourceScope)),
            configuredAgents,
          )
          // sonderr_change end
          // sonderr_change - Auto-discovered plugins under config directories are already local files, so ConfigPlugin.load
          // returns normalized Specs and we only need to attach origin metadata here.
          const list = yield* Effect.promise(() => ConfigPlugin.load(dir))
          plugins.push(...list) // sonderr_change
          yield* mergePluginOrigins(dir, list, dirScope) // sonderr_change

          // sonderr_change start
          if (needsLocalPluginDependency(plugins)) {
            deps.push(yield* installLocalPluginDependency(npmSvc, dir, InstallationVersion, InstallationLocal))
          }
          // sonderr_change end
        }

        if (process.env.SONDERR_CONFIG_CONTENT) {
          // sonderr_change start - capture SONDERR_CONFIG_CONTENT parse failures as warnings
          const source = "SONDERR_CONFIG_CONTENT"
          yield* merge(
            source,
            yield* loadConfig(
              process.env.SONDERR_CONFIG_CONTENT,
              {
                dir: ctx.directory,
                source,
              },
              undefined,
              true, // sonderr_change - SONDERR_CONFIG_CONTENT is user-provided, trusted for {file:}/{env:}
            ).pipe(
              Effect.tap(() => Effect.logDebug("loaded custom config from SONDERR_CONFIG_CONTENT")),
              Effect.catchDefect((err: unknown) => {
                caughtWarning(warnings, source, err)
                return Effect.succeed({} as Info)
              }),
            ),
            "local",
            true,
          )
          // sonderr_change end
        }

        const activeAccount = Option.getOrUndefined(
          yield* accountSvc.active().pipe(Effect.catch(() => Effect.succeed(Option.none()))),
        )
        if (activeAccount?.active_org_id) {
          const accountID = activeAccount.id
          const orgID = activeAccount.active_org_id
          const url = activeAccount.url
          yield* Effect.gen(function* () {
            const [configOpt, tokenOpt] = yield* Effect.all(
              [accountSvc.config(accountID, orgID), accountSvc.token(accountID)],
              { concurrency: 2 },
            )
            if (Option.isSome(tokenOpt)) {
              process.env["SONDERR_CONSOLE_TOKEN"] = tokenOpt.value
              yield* env.set("SONDERR_CONSOLE_TOKEN", tokenOpt.value)
            }

            if (Option.isSome(configOpt)) {
              const source = `${url}/api/config`
              const next = yield* loadConfig(
                JSON.stringify(configOpt.value),
                {
                  dir: path.dirname(source),
                  source,
                },
                undefined,
                true, // sonderr_change - console-managed org config is a trusted source
              )
              for (const providerID of Object.keys(next.provider ?? {})) {
                consoleManagedProviders.add(providerID)
              }
              yield* merge(source, next, "global")
            }
          }).pipe(
            Effect.withSpan("Config.loadActiveOrgConfig"),
            Effect.catch((err) =>
              Effect.logDebug("failed to fetch remote account config", {
                error: err instanceof Error ? err.message : String(err),
              }),
            ),
          )
        }

        const managedDir = ConfigManaged.managedConfigDir()
        // sonderr_change start - include sonderr.json/sonderr.jsonc in managed dir loading
        if (existsSync(managedDir)) {
          for (const file of SonderrConfig.ALL_CONFIG_FILES) {
            const source = path.join(managedDir, file)
            // sonderr_change - MDM/enterprise-managed config is a trusted source
            yield* merge(source, yield* loadFile(source, undefined, true), "global")
          }
        }
        // sonderr_change end

        // macOS managed preferences (.mobileconfig deployed via MDM) override everything
        // sonderr_change start
        const managed = yield* Effect.promise(() => ConfigManaged.readManagedPreferences())
        if (managed) {
          yield* merge(
            managed.source,
            yield* loadConfig(
              managed.text,
              {
                dir: path.dirname(managed.source),
                source: managed.source,
              },
              undefined,
              true, // sonderr_change - MDM-managed preferences are a trusted source
            ),
            "global",
          )
        }
        // sonderr_change end

        for (const [name, mode] of Object.entries(result.mode ?? {})) {
          result.agent = mergeDeep(result.agent ?? {}, {
            [name]: {
              ...mode,
              mode: "primary" as const,
            },
          })
        }

        if (Flag.SONDERR_PERMISSION) {
          try {
            result.permission = mergeDeep(result.permission ?? {}, JSON.parse(Flag.SONDERR_PERMISSION))
          } catch (err) {
            yield* Effect.logWarning("SONDERR_PERMISSION contains invalid JSON, skipping", { err })
          }
        }

        if (result.tools) {
          const perms: Record<string, ConfigPermissionV1.Action> = {}
          for (const [tool, enabled] of Object.entries(result.tools)) {
            const action: ConfigPermissionV1.Action = enabled ? "allow" : "deny"
            if (tool === "write" || tool === "edit" || tool === "patch") {
              perms.edit = action
              continue
            }
            perms[tool] = action
          }
          result.permission = mergeDeep(perms, result.permission ?? {})
        }

        if (!result.username) {
          try {
            result.username = os.userInfo().username || "user"
          } catch (err) {
            yield* Effect.logWarning("failed to read system username, using fallback", { err })
            result.username = "user"
          }
        }

        if (result.autoshare === true && !result.share) {
          result.share = "auto"
        }

        if (Flag.SONDERR_DISABLE_AUTOCOMPACT) {
          result.compaction = { ...result.compaction, auto: false }
        }
        if (Flag.SONDERR_DISABLE_PRUNE) {
          result.compaction = { ...result.compaction, prune: false }
        }
        // sonderr_change start — inject Sonderr default plugins into both plugin list and origins
        SonderrDefaultPlugins.apply(result, { disabled: Flag.SONDERR_DISABLE_DEFAULT_PLUGINS, log })
        // sonderr_change end

        return {
          config: result,
          directories,
          deps,
          warnings, // sonderr_change
          consoleState: {
            consoleManagedProviders: Array.from(consoleManagedProviders),
            activeOrgName,
            switchableOrgCount: 0,
          },
        }
      },
      Effect.provideService(FSUtil.Service, fs),
    )

    const state = yield* InstanceState.make<State>(
      Effect.fn("Config.state")(function* (ctx) {
        return yield* loadInstanceState(ctx).pipe(Effect.provideService(Git.Service, git), Effect.orDie) // sonderr_change
      }),
    )

    const get = Effect.fn("Config.get")(function* () {
      // sonderr_change start - reload instance config when global config changed elsewhere
      if (yield* refreshGlobal()) {
        yield* InstanceState.invalidate(state).pipe(Effect.catchCause(() => Effect.void))
      }
      // sonderr_change end
      return yield* InstanceState.use(state, (s) => s.config)
    })

    const directories = Effect.fn("Config.directories")(function* () {
      return yield* InstanceState.use(state, (s) => s.directories)
    })

    const getConsoleState = Effect.fn("Config.getConsoleState")(function* () {
      return yield* InstanceState.use(state, (s) => s.consoleState)
    })

    const waitForDependencies = Effect.fn("Config.waitForDependencies")(function* () {
      yield* InstanceState.useEffect(state, (s) =>
        Effect.forEach(s.deps, Fiber.join, { concurrency: "unbounded" }).pipe(Effect.asVoid),
      )
    })

    const update = Effect.fn("Config.update")(function* (config: Info) {
      // sonderr_change start - delegate Sonderr project config update behavior.
      const ctx = yield* InstanceState.context
      yield* SonderrConfig.updateProjectConfig({
        fs,
        directory: ctx.directory,
        worktree: ctx.worktree,
        config,
        read: readConfigFile,
        parse: (input, file) =>
          ConfigParse.schema(ConfigV1.Info, normalizeLoadedConfig(ConfigParse.jsonc(input, file), file), file),
        patch: (input, patch) => patchJsonc(input, patch),
        writable,
      })
      yield* InstanceState.invalidate(state)
      yield* Effect.sync(() =>
        GlobalBus.emit("event", {
          directory: ctx.directory,
          payload: {
            type: Event.ConfigUpdated.type,
            properties: { sandbox: Object.hasOwn(config, "sandbox") },
          },
        }),
      )
    })

    const warnings = Effect.fn("Config.warnings")(function* () {
      return yield* InstanceState.use(state, (s) => s.warnings)
    })
    // sonderr_change end

    const invalidate = Effect.fn("Config.invalidate")(function* () {
      yield* invalidateGlobal
      yield* InstanceState.invalidate(state).pipe(Effect.catchCause(() => Effect.void)) // sonderr_change
    })

    // sonderr_change start - add dispose option to skip Instance.disposeAll for permission-only changes
    const updateGlobal = Effect.fn("Config.updateGlobal")(function* (config: Info, options?: { dispose?: boolean }) {
      const dispose = options?.dispose ?? true
      // sonderr_change end
      const file = globalConfigFile()
      // sonderr_change start - serialize read-merge-write so concurrent approvals cannot lose rules
      const result = yield* flock
        .withLock(
          Effect.gen(function* () {
            const before = (yield* readConfigFile(file)) ?? "{}"
            const patch = writableGlobal(config)
            // Reads merge every global config file, so delete sentinels must be
            // removed from all of them, not just the primary write target.
            const propagated = yield* SonderrConfig.propagateUnset({
              fs,
              files: SonderrConfig.GLOBAL_CONFIG_FILES.map((name) => path.join(Global.Path.config, name)),
              exclude: file,
              patch,
            })

            if (!file.endsWith(".jsonc")) {
              const existing = ConfigParse.schema(
                ConfigV1.Info,
                normalizeLoadedConfig(ConfigParse.jsonc(before, file), file),
                file,
              )
              const next = SonderrConfig.mergeConfig(writable(existing), patch)
              const serialized = JSON.stringify(next, null, 2)
              const changed = serialized !== before || propagated
              if (serialized !== before) yield* fs.writeFileString(file, serialized).pipe(Effect.orDie)
              return { next, changed }
            }

            const updated = patchJsonc(before, patch)
            const next = ConfigParse.schema(
              ConfigV1.Info,
              normalizeLoadedConfig(ConfigParse.jsonc(updated, file), file),
              file,
            )
            const changed = updated !== before || propagated
            if (updated !== before) yield* fs.writeFileString(file, updated).pipe(Effect.orDie)
            return { next, changed }
          }),
          `config:global:${path.resolve(Global.Path.config)}`,
        )
        .pipe(Effect.orDie)
      const next = result.next
      const changed = result.changed
      const sandboxChanged = changed && Object.hasOwn(config, "sandbox")
      // sonderr_change end

      // sonderr_change start - skip dispose when caller opts out
      if (!dispose) {
        yield* invalidateGlobal
        yield* InstanceState.invalidate(state).pipe(Effect.catchCause(() => Effect.void))
        yield* Effect.sync(() =>
          GlobalBus.emit("event", {
            directory: "global",
            payload: {
              type: Event.ConfigUpdated.type,
              properties: { sandbox: sandboxChanged },
            },
          }),
        ).pipe(Effect.catchCause(() => Effect.void))
        return { info: next, changed }
      }
      // sonderr_change end

      if (changed) yield* invalidate()
      // sonderr_change start - hot-reload global config changes in the active instance
      if (changed) {
        yield* InstanceState.invalidate(state).pipe(Effect.catchCause(() => Effect.void))
        yield* Effect.sync(() =>
          GlobalBus.emit("event", {
            directory: "global",
            payload: {
              type: Event.ConfigUpdated.type,
              properties: { sandbox: sandboxChanged },
            },
          }),
        ).pipe(Effect.catchCause(() => Effect.void))
      }
      // sonderr_change end
      return { info: next, changed }
    })

    return Service.of({
      get,
      getGlobal,
      getConsoleState,
      update,
      updateGlobal,
      invalidate,
      directories,
      waitForDependencies,
      warnings, // sonderr_change
    })
  }),
)

export const node = LayerNode.make({
  service: Service,
  layer: layer,
  deps: [FSUtil.node, Auth.node, Account.node, Env.node, Npm.node, httpClient, Git.node, EffectFlock.node], // sonderr_change
})

export * as Config from "./config"
