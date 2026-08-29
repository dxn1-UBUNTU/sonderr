import { LayerNode } from "@sonderr/core/effect/layer-node"
import { PermissionV1 } from "@sonderr/core/v1/permission"
import { Config } from "@/config/config"
import { serviceUse } from "@sonderr/core/effect/service-use"
import { Provider } from "@/provider/provider"

import { generateObject, streamObject, type ModelMessage } from "ai"
import { Truncate } from "@/tool/truncate"
import { Auth } from "../auth"
import { ProviderTransform } from "@/provider/transform"

import PROMPT_GENERATE from "./generate.txt"
import PROMPT_COMPACTION from "./prompt/compaction.txt"
import PROMPT_EXPLORE from "./prompt/explore.txt"
import PROMPT_SCOUT from "@/sonderr/agent/scout.txt" // sonderr_change
import PROMPT_SUMMARY from "./prompt/summary.txt"
import PROMPT_TITLE from "./prompt/title.txt"
import { Permission } from "@/permission"
import { mergeDeep, pipe, sortBy, values } from "remeda"
import { Global } from "@sonderr/core/global"
import { SonderrPaths } from "@/sonderr/paths" // sonderr_change
import path from "path"
import { Plugin } from "@/plugin"
import { Skill } from "../skill"
import { Effect, Context, Layer, Schema } from "effect"
import { InstanceState } from "@/effect/instance-state"
import * as Option from "effect/Option"
import * as OtelTracer from "@effect/opentelemetry/Tracer"
import type { DeepMutable } from "@sonderr/core/schema" // sonderr_change
// sonderr_change start
import * as SonderrAgent from "@/sonderr/agent"
import { RuntimeFlags } from "@/effect/runtime-flags"
import * as SonderrReference from "@/sonderr/reference"
// sonderr_change end
import { ProviderV2 } from "@sonderr/core/provider"
import { ModelV2 } from "@sonderr/core/model"
import { LocationServiceMap, locationServiceMapLayer } from "@sonderr/core/location-services"
// sonderr_change

export const Info = Schema.Struct({
  name: Schema.String,
  // sonderr_change start
  displayName: Schema.optional(Schema.String),
  source: Schema.optional(Schema.String),
  // sonderr_change end
  description: Schema.optional(Schema.String),
  deprecated: Schema.optional(Schema.Boolean), // sonderr_change
  mode: Schema.Literals(["subagent", "primary", "all"]),
  native: Schema.optional(Schema.Boolean),
  hidden: Schema.optional(Schema.Boolean),
  topP: Schema.optional(Schema.Finite),
  temperature: Schema.optional(Schema.Finite),
  color: Schema.optional(Schema.String),
  permission: PermissionV1.Ruleset,
  model: Schema.optional(
    Schema.Struct({
      modelID: ModelV2.ID,
      providerID: ProviderV2.ID,
    }),
  ),
  variant: Schema.optional(Schema.String),
  prompt: Schema.optional(Schema.String),
  options: Schema.Record(Schema.String, Schema.Unknown),
  steps: Schema.optional(Schema.Finite),
}).annotate({ identifier: "Agent" })
export type Info = DeepMutable<Schema.Schema.Type<typeof Info>>

const GeneratedAgent = Schema.Struct({
  identifier: Schema.String,
  whenToUse: Schema.String,
  systemPrompt: Schema.String,
})

export interface Interface {
  readonly get: (agent: string) => Effect.Effect<Info>
  readonly list: () => Effect.Effect<Info[]>
  readonly defaultInfo: () => Effect.Effect<Info>
  readonly defaultAgent: () => Effect.Effect<string>
  readonly generate: (input: {
    description: string
    model?: { providerID: ProviderV2.ID; modelID: ModelV2.ID }
  }) => Effect.Effect<
    {
      identifier: string
      whenToUse: string
      systemPrompt: string
    },
    Provider.DefaultModelError
  >
}

type State = Omit<Interface, "generate"> & { version: string } // sonderr_change

export class Service extends Context.Service<Service, Interface>()("@sonderr/Agent") {}

export const use = serviceUse(Service)

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const config = yield* Config.Service
    const auth = yield* Auth.Service
    const plugin = yield* Plugin.Service
    const skill = yield* Skill.Service
    const provider = yield* Provider.Service
    const flags = yield* RuntimeFlags.Service // sonderr_change
    const locations = yield* LocationServiceMap.Service

    const state = yield* InstanceState.make<State>(
      Effect.fn("Agent.state")(function* (ctx) {
        const cfg = yield* config.get()
        const skillDirs = yield* skill.dirs()
        // sonderr_change start - include global config dirs so agents can read them without prompting
        const referenceDirs = yield* SonderrReference.list(
          {
            references: cfg.references ?? cfg.reference ?? {},
            directory: ctx.directory,
            worktree: ctx.worktree,
          },
          locations,
        ).pipe(Effect.map((references) => references.map((reference) => reference.path)))
        const whitelistedDirs = [
          Truncate.GLOB,
          path.join(Global.Path.tmp, "*"),
          ...skillDirs.map((dir) => path.join(dir, "*")),
          path.join(Global.Path.config, "*"),
          ...SonderrPaths.globalDirs().map((dir) => path.join(dir, "*")),
          ...referenceDirs.map((dir) => path.join(dir, "*")),
        ]
        // sonderr_change end
        const readonlyExternalDirectory = {
          "*": "ask",
          ...Object.fromEntries(whitelistedDirs.map((dir) => [dir, "allow"])),
        } satisfies Record<string, "allow" | "ask" | "deny">

        const baseDefaults = Permission.fromConfig({ // sonderr_change
          "*": "allow",
          doom_loop: "ask",
          external_directory: {
            "*": "ask",
            ...Object.fromEntries(whitelistedDirs.map((dir) => [dir, "allow"])),
          },
          suggest: "deny", // sonderr_change
          question: "deny",
          interactive_terminal: "deny", // sonderr_change - human-driven tools are primary-agent only
          plan_enter: "deny",
          plan_exit: "deny",
          // sonderr_change start
          repo_clone: "deny",
          repo_overview: "deny",
          // sonderr_change end
          // mirrors github.com/github/gitignore Node.gitignore pattern for .env files
          read: {
            "*": "allow",
            "*.env": "ask",
            "*.env.*": "ask",
            "*.env.example": "allow",
          },
        })

        // sonderr_change start - patch defaults with bash allowlist and recall permission
        const sonderr = SonderrAgent.prepare(cfg)
        const defaults = Permission.merge(baseDefaults, sonderr.defaultsPatch)
        // sonderr_change end

        const user = Permission.fromConfig(cfg.permission ?? {})

        const agents: Record<string, Info> = {
          build: {
            name: "build",
            description: "The default agent. Executes tools based on configured permissions.",
            options: {},
            permission: Permission.merge(
              defaults,
              Permission.fromConfig({
                question: "allow",
                // sonderr_change start
                interactive_terminal: "allow",
                suggest: "allow",
                // sonderr_change end
                plan_enter: "allow",
              }),
              user,
            ),
            mode: "primary",
            native: true,
          },
          plan: {
            name: "plan",
            description: "Plan mode. Disallows all edit tools.",
            options: {},
            permission: Permission.merge(
              defaults,
              Permission.fromConfig({
                question: "allow",
                plan_exit: "allow",
                task: {
                  general: "deny",
                },
                external_directory: {
                  [path.join(Global.Path.data, "plans", "*")]: "allow",
                },
                edit: {
                  "*": "deny",
                  [path.join(".sonderr", "plans", "*.md")]: "allow",
                  [path.relative(ctx.worktree, path.join(Global.Path.data, path.join("plans", "*.md")))]: "allow",
                },
              }),
              user,
            ),
            mode: "primary",
            native: true,
          },
          general: {
            name: "general",
            description: `General-purpose agent for researching complex questions and executing multi-step tasks. Use this agent to execute multiple units of work in parallel.`,
            permission: Permission.merge(
              defaults,
              Permission.fromConfig({
                todowrite: "deny",
              }),
              user,
            ),
            options: {},
            mode: "subagent",
            native: true,
          },
          explore: {
            name: "explore",
            permission: Permission.merge(
              defaults,
              Permission.fromConfig({
                "*": "deny",
                grep: "allow",
                glob: "allow",
                list: "allow",
                bash: "allow",
                webfetch: "allow",
                websearch: "allow",
                read: "allow",
                external_directory: readonlyExternalDirectory,
              }),
              user,
            ),
            description: `Fast agent specialized for exploring codebases. Use this when you need to quickly find files by patterns (eg. "src/components/**/*.tsx"), search code for keywords (eg. "API endpoints"), or answer questions about the codebase (eg. "how do API endpoints work?"). When calling this agent, specify the desired thoroughness level: "quick" for basic searches, "medium" for moderate exploration, or "very thorough" for comprehensive analysis across multiple locations and naming conventions.`,
            prompt: PROMPT_EXPLORE,
            options: {},
            mode: "subagent",
            native: true,
          },
          // sonderr_change start - retain Sonderr's opt-in repository research agent
          ...(flags.experimentalScout
            ? {
                scout: {
                  name: "scout",
                  permission: Permission.merge(
                    defaults,
                    Permission.fromConfig({
                      "*": "deny",
                      grep: "allow",
                      glob: "allow",
                      webfetch: "allow",
                      websearch: "allow",
                      read: "allow",
                      repo_clone: "allow",
                      repo_overview: "allow",
                      external_directory: {
                        ...readonlyExternalDirectory,
                        [path.join(Global.Path.repos, "*")]: "allow",
                      },
                    }),
                    user,
                  ),
                  description: `Docs and dependency-source specialist. Use this when you need to inspect external documentation, clone dependency repositories into the managed cache, and research library implementation details without modifying the user's workspace.`,
                  prompt: PROMPT_SCOUT,
                  options: {},
                  mode: "subagent" as const,
                  native: true,
                },
              }
            : {}),
          // sonderr_change end
          compaction: {
            name: "compaction",
            mode: "primary",
            native: true,
            hidden: true,
            prompt: PROMPT_COMPACTION,
            permission: Permission.merge(
              defaults,
              user, // sonderr_change
              Permission.fromConfig({
                "*": "deny",
              }),
            ),
            options: {},
          },
          title: {
            name: "title",
            mode: "primary",
            options: {},
            native: true,
            hidden: true,
            temperature: 0.5,
            permission: Permission.merge(
              defaults,
              user, // sonderr_change
              Permission.fromConfig({
                "*": "deny",
              }),
            ),
            prompt: PROMPT_TITLE,
          },
          summary: {
            name: "summary",
            mode: "primary",
            options: {},
            native: true,
            hidden: true,
            permission: Permission.merge(
              defaults,
              user, // sonderr_change
              Permission.fromConfig({
                "*": "deny",
              }),
            ),
            prompt: PROMPT_SUMMARY,
          },
        }

        // sonderr_change start - rename build→code, add debug/orchestrator/ask, patch plan/explore
        SonderrAgent.patchAgents(agents, defaults, user, cfg, sonderr, ctx.worktree, whitelistedDirs)

        const agentConfigs = SonderrAgent.preprocessConfig(cfg.agent ?? {})
        for (const [key, value] of Object.entries(agentConfigs)) {
          // sonderr_change end
          if (value.disable) {
            delete agents[key]
            continue
          }
          let item = agents[key]
          if (!item)
            item = agents[key] = {
              name: key,
              mode: "all",
              permission: Permission.merge(defaults, user),
              options: {},
              native: false,
            }
          if (value.model) item.model = Provider.parseModel(value.model)
          item.variant = value.variant ?? item.variant
          item.prompt = value.prompt ?? item.prompt
          item.description = value.description ?? item.description
          item.temperature = value.temperature ?? item.temperature
          item.topP = value.top_p ?? item.topP
          item.mode = value.mode ?? item.mode
          item.color = value.color ?? item.color
          item.hidden = value.hidden ?? item.hidden
          item.name = value.name ?? item.name
          item.steps = value.steps ?? item.steps
          // sonderr_change start - carry metadata as typed fields, never as provider options
          item.displayName = value.displayName ?? item.displayName
          item.source = value.source ?? item.source
          // sonderr_change end
          item.options = mergeDeep(item.options, value.options ?? {})
          item.permission = Permission.merge(item.permission, Permission.fromConfig(value.permission ?? {}))
          // sonderr_change start
          SonderrAgent.processConfigItem(item)
          SonderrAgent.hardenPlan(key, item, ctx.worktree, user, Permission.fromConfig(value.permission ?? {}))
          SonderrAgent.hardenExplore(key, item, user, Permission.fromConfig(value.permission ?? {}))
        }

        function referencePrompt(reference: SonderrReference.Resolved) {
          if (reference.kind === "local") {
            return [
              `You are configured reference @${reference.name}, a read-only research agent for external reference material.`,
              `Local directory: ${reference.path}`,
              `Inspect this directory as the primary reference source. Prefer repo_overview with path ${JSON.stringify(reference.path)} before broader searches. Do not edit files.`,
              `Return exact absolute file paths for findings whenever possible.`,
            ].join("\n\n")
          }

          if (reference.kind === "invalid") {
            return [
              `You are configured reference @${reference.name}, but this reference is not usable yet.`,
              `Configured repository: ${reference.repository}`,
              `Problem: ${reference.message}`,
              `Explain this configuration problem if invoked. Do not edit files or attempt fallback clones.`,
            ].join("\n\n")
          }

          return [
            `You are configured reference @${reference.name}, a read-only research agent for external reference material.`,
            `Repository: ${reference.repository}`,
            ...(reference.branch ? [`Branch/ref: ${reference.branch}`] : []),
            `Cached directory: ${reference.path}`,
            `Sonderr materializes this configured repository before use. Do not call repo_clone for this reference.`,
            `Inspect the cached directory as the primary reference source. Prefer repo_overview with path ${JSON.stringify(reference.path)} before broader searches, then use Glob, Grep, and Read inside that directory. Do not edit files.`,
            `Return exact absolute file paths for findings whenever possible.`,
          ].join("\n\n")
        }

        function referenceDescription(reference: SonderrReference.Resolved) {
          if (reference.kind === "local") return `Scout reference for local directory ${reference.path}`
          if (reference.kind === "git") return `Scout reference for repository ${reference.repository}`
          return `Invalid Scout reference for repository ${reference.repository}`
        }

        if (flags.experimentalScout) {
          const references = cfg.references ?? cfg.reference ?? {}
          const resolvedReferences = SonderrReference.resolveAll({
            references,
            directory: ctx.directory,
            worktree: ctx.worktree,
          })
          for (const resolved of resolvedReferences) {
            if (agents[resolved.name]) continue
            const localPath = resolved.kind === "invalid" ? undefined : resolved.path
            agents[resolved.name] = {
              name: resolved.name,
              description: referenceDescription(resolved),
              permission: Permission.merge(
                agents.scout.permission,
                Permission.fromConfig({
                  repo_clone: "deny",
                  ...(localPath
                    ? {
                        external_directory: {
                          [localPath]: "allow",
                          [path.join(localPath, "*")]: "allow",
                        },
                      }
                    : {}),
                }),
              ),
              prompt: referencePrompt(resolved),
              options: { reference: references[resolved.name], resolved },
              mode: "subagent",
              native: false,
            }
          }
        // sonderr_change end
        }

        // Ensure Truncate.GLOB is allowed unless explicitly configured
        for (const name in agents) {
          const agent = agents[name]
          const explicit = agent.permission.some((r) => {
            if (r.permission !== "external_directory") return false
            if (r.action !== "deny") return false
            return r.pattern === Truncate.GLOB
          })
          if (explicit) continue

          agents[name].permission = Permission.merge(
            agents[name].permission,
            Permission.fromConfig({ external_directory: { [Truncate.GLOB]: "allow" } }),
          )
        }

        SonderrAgent.hardenSystemAgents(agents) // sonderr_change - keep system utility agents deny-only after config merges

        const get = Effect.fnUntraced(function* (agent: string) {
          return agents[SonderrAgent.resolveKey(agent)] // sonderr_change - treat "build" as "code"
        })

        const list = Effect.fnUntraced(function* () {
          const cfg = yield* config.get()
          return pipe(
            agents,
            values(),
            sortBy(
              [(x) => (cfg.default_agent ? x.name === cfg.default_agent : x.name === "code"), "desc"], // sonderr_change - renamed from "build" to "code"
              [(x) => x.name, "asc"],
            ),
          )
        })

        const defaultInfo = Effect.fnUntraced(function* () {
          const c = yield* config.get()
          if (c.default_agent) {
            // sonderr_change start
            const effective = SonderrAgent.resolveKey(c.default_agent)
            const agent = agents[effective]
            // sonderr_change end
            if (!agent) throw new Error(`default agent "${c.default_agent}" not found`)
            if (agent.mode === "subagent") throw new Error(`default agent "${c.default_agent}" is a subagent`)
            if (agent.hidden === true) throw new Error(`default agent "${c.default_agent}" is hidden`)
            return agent
          }
          // sonderr_change start - prefer "code" as default agent (key order changes after rename from "build")
          const code = agents.code
          if (code && code.mode !== "subagent" && code.hidden !== true) return code
          // sonderr_change end
          const visible = Object.values(agents).find((a) => a.mode !== "subagent" && a.hidden !== true)
          if (!visible) throw new Error("no primary visible agent found")
          return visible
        })

        const defaultAgent = Effect.fnUntraced(function* () {
          return (yield* defaultInfo()).name
        })

        return {
          version: SonderrAgent.cacheKey(cfg), // sonderr_change
          get,
          list,
          defaultInfo,
          defaultAgent,
        } satisfies State
      }),
    )

    // sonderr_change start - rebuild cached agents when permission-relevant config changes
    const current = Effect.fnUntraced(function* <A>(select: (s: State) => Effect.Effect<A>) {
      const cfg = yield* config.get()
      const s = yield* InstanceState.get(state)
      if (s.version === SonderrAgent.cacheKey(cfg)) return yield* select(s)
      yield* InstanceState.invalidate(state)
      return yield* select(yield* InstanceState.get(state))
    })

    return Service.of({
      get: Effect.fn("Agent.get")(function* (agent: string) {
        return yield* current((s) => s.get(agent)) // sonderr_change
      }),
      list: Effect.fn("Agent.list")(function* () {
        return yield* current((s) => s.list()) // sonderr_change
      }),
      defaultInfo: Effect.fn("Agent.defaultInfo")(function* () {
        return yield* current((s) => s.defaultInfo()) // sonderr_change
      }),
      defaultAgent: Effect.fn("Agent.defaultAgent")(function* () {
        return yield* current((s) => s.defaultAgent()) // sonderr_change
      }),
      generate: Effect.fn("Agent.generate")(function* (input: {
        description: string
        model?: { providerID: ProviderV2.ID; modelID: ModelV2.ID }
      }) {
        const cfg = yield* config.get()
        const model = input.model ?? (yield* provider.defaultModel())
        const resolved = yield* provider.getModel(model.providerID, model.modelID)
        const language = yield* provider.getLanguage(resolved)

        const system = [PROMPT_GENERATE]
        yield* plugin.trigger("experimental.chat.system.transform", { model: resolved }, { system })
        const existing = yield* InstanceState.useEffect(state, (s) => s.list())

        // TODO: clean this up so provider specific logic doesnt bleed over
        const authInfo = yield* auth.get(model.providerID).pipe(Effect.orDie)
        const isOpenaiOauth = model.providerID === "openai" && authInfo?.type === "oauth"

        const params = {
          // sonderr_change start - enable telemetry with custom PostHog tracer
          experimental_telemetry: SonderrAgent.telemetryOptions(cfg),
          // sonderr_change end
          temperature: 0.3,
          messages: [
            ...(isOpenaiOauth
              ? []
              : system.map(
                  (item): ModelMessage => ({
                    role: "system",
                    content: item,
                  }),
                )),
            {
              role: "user",
              content: `Create an agent configuration based on this request: "${input.description}".\n\nIMPORTANT: The following identifiers already exist and must NOT be used: ${existing.map((i) => i.name).join(", ")}\n  Return ONLY the JSON object, no other text, do not wrap in backticks`,
            },
          ],
          model: language,
          schema: Object.assign(
            Schema.toStandardSchemaV1(GeneratedAgent),
            Schema.toStandardJSONSchemaV1(GeneratedAgent),
          ),
        } satisfies Parameters<typeof generateObject>[0]

        if (isOpenaiOauth) {
          return yield* Effect.promise(async () => {
            const result = streamObject({
              ...params,
              providerOptions: ProviderTransform.providerOptions(resolved, {
                instructions: system.join("\n"),
                store: false,
              }),
              onError: () => {},
            })
            for await (const part of result.fullStream) {
              if (part.type === "error") throw part.error
            }
            return result.object
          })
        }

        return yield* Effect.promise(() => generateObject(params).then((r) => r.object))
      }),
    })
  }),
)

const locationServiceMapNode = LayerNode.make({
  service: LocationServiceMap.Service,
  layer: locationServiceMapLayer,
  deps: [],
})

export const node = LayerNode.make({
  service: Service,
  layer: layer,
  deps: [Config.node, Auth.node, Plugin.node, Skill.node, Provider.node, RuntimeFlags.node, locationServiceMapNode], // sonderr_change
})

export * as Agent from "./agent"
