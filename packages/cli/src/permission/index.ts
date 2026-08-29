import { LayerNode } from "@sonderr/core/effect/layer-node"
import { AppNodeBuilder } from "@sonderr/core/effect/app-node-builder" // sonderr_change
import { ConfigPermissionV1 } from "@sonderr/core/v1/config/permission"
import * as Config from "@/config/config" // sonderr_change
import { InstanceState } from "@/effect/instance-state"
import { Wildcard } from "@sonderr/core/util/wildcard"
import { Deferred, Effect, Layer, Context } from "effect"
import os from "os"
import z from "zod" // sonderr_change
import { zod } from "@sonderr/core/effect-zod" // sonderr_change
import { PermissionV1 } from "@sonderr/core/v1/permission"
import { Database } from "@sonderr/core/database/database" // sonderr_change
import { EventV2Bridge } from "@/event-v2-bridge"
import { SessionID } from "@/session/schema" // sonderr_change - used by AllowEverythingInput
// sonderr_change start
import { ConfigProtection } from "@/sonderr/permission/config-paths"
import { SonderrHeadless } from "@/sonderr/permission/headless"
import { drainCovered } from "@/sonderr/permission/drain"
import { ReadPermission } from "@/sonderr/permission/read"
import { AgentManagerPermission } from "@/sonderr/permission/agent-manager" // sonderr_change
import { ExternalDirectoryPermission } from "@/sonderr/permission/external-directory"
// sonderr_change end

export const Event = PermissionV1.Event
// sonderr_change start - upstream moved these types into PermissionV1; re-export them here so existing
// Sonderr callers that import off `Permission.*` keep working without a repo-wide rewrite
export const Rule = PermissionV1.Rule
export type Rule = PermissionV1.Rule
export const Ruleset = PermissionV1.Ruleset
export type Ruleset = PermissionV1.Ruleset
export const Action = PermissionV1.Action
export type Action = PermissionV1.Action
export const Request = PermissionV1.Request
export type Request = PermissionV1.Request
export const Reply = PermissionV1.Reply
export type Reply = PermissionV1.Reply
export const RejectedError = PermissionV1.RejectedError
export type RejectedError = PermissionV1.RejectedError
export const CorrectedError = PermissionV1.CorrectedError
export type CorrectedError = PermissionV1.CorrectedError
export const DeniedError = PermissionV1.DeniedError
export type DeniedError = PermissionV1.DeniedError
export const NotFoundError = PermissionV1.NotFoundError
export type NotFoundError = PermissionV1.NotFoundError
export type Error = PermissionV1.Error
export const ReplyInput = PermissionV1.ReplyInput
export type ReplyInput = PermissionV1.ReplyInput
// Sonderr extends upstream's AskInput with an optional hardRuleset (consumed by drain + session/prompt)
export type AskInput = PermissionV1.AskInput & { hardRuleset?: PermissionV1.Ruleset }
// sonderr_change end

// sonderr_change start
export const SaveAlwaysRulesInput = z.object({
  requestID: zod(PermissionV1.ID),
  approvedAlways: z.string().array().optional(),
  deniedAlways: z.string().array().optional(),
})

export const AllowEverythingInput = z.object({
  enable: z.boolean(),
  requestID: zod(PermissionV1.ID).optional(),
  sessionID: zod(SessionID).optional(),
})
// sonderr_change end

// sonderr_change start - describe why a call was allowed so clients can explain auto-approval
export interface AskOutcome {
  /** true when the user was prompted and replied; false when a rule auto-approved. */
  manual: boolean
  /** The winning rule (carries an optional `source` marker set at ruleset-build time). */
  rule?: Rule
}
// sonderr_change end

export interface Interface {
  readonly ask: (input: AskInput) => Effect.Effect<AskOutcome, Error> // sonderr_change - was Effect<void>; returns the decision
  readonly reply: (input: ReplyInput) => Effect.Effect<void, NotFoundError>
  readonly list: () => Effect.Effect<ReadonlyArray<Request>>
  // sonderr_change start
  readonly saveAlwaysRules: (input: z.infer<typeof SaveAlwaysRulesInput>) => Effect.Effect<void, NotFoundError>
  readonly allowEverything: (input: z.infer<typeof AllowEverythingInput>) => Effect.Effect<void>
  readonly pending: (id: string) => Effect.Effect<Request | undefined>
  // sonderr_change end
}

interface PendingEntry {
  info: Request
  // sonderr_change start
  ruleset: Ruleset
  hardRuleset?: Ruleset
  saved?: boolean
  // sonderr_change end
  deferred: Deferred.Deferred<void, RejectedError | CorrectedError>
}

interface State {
  pending: Map<PermissionV1.ID, PendingEntry>
  approved: Rule[]
  session: Record<string, Ruleset> // sonderr_change
}

export function evaluate(permission: string, pattern: string, ...rulesets: PermissionV1.Ruleset[]): PermissionV1.Rule {
  return (
    rulesets
      .flat()
      .findLast((rule) => Wildcard.match(permission, rule.permission) && Wildcard.match(pattern, rule.pattern)) ?? {
      action: "ask",
      permission,
      pattern: "*",
    }
  )
}

// sonderr_change start
export function resolve(permission: string, pattern: string, ruleset: Ruleset, ...overrides: Ruleset[]): Rule {
  const evalFn =
    permission === "external_directory"
      ? (permission: string, pattern: string, ...sets: Ruleset[]) =>
          ExternalDirectoryPermission.evaluate(permission, pattern, ...sets)
      : evaluate
  const base = AgentManagerPermission.harden(
    permission,
    pattern,
    ReadPermission.harden(permission, pattern, evalFn(permission, pattern, ruleset)),
  ) // sonderr_change
  const saved = AgentManagerPermission.harden(permission, pattern, evalFn(permission, pattern, ...overrides)) // sonderr_change
  if (base.action === "deny") return base
  if (saved.action === "deny") return saved
  if (base.action === "ask") {
    if (saved.action === "allow" && Wildcard.match(saved.pattern, base.pattern)) return saved
    return base
  }
  if (saved.action === "allow") return saved
  return base
}

function veto(permission: string, pattern: string, ruleset?: Ruleset) {
  if (!ruleset) return false
  return ExternalDirectoryPermission.evaluate(permission, pattern, ruleset).action === "deny"
}

function subset(permission: string, ruleset: Ruleset) {
  return ruleset.filter((rule) => Wildcard.match(permission, rule.permission))
}

function covered(entry: PendingEntry, approved: Ruleset, local: Ruleset) {
  if (ConfigProtection.isRequest(entry.info)) return false
  if (entry.info.metadata?.["skillShell"] === true) return false // sonderr_change - skill batch needs an explicit reply
  if (entry.info.metadata?.["sandboxEscalation"] === true) return false // sonderr_change - host access needs an explicit reply
  return entry.info.patterns.every((pattern) => {
    if (veto(entry.info.permission, pattern, entry.hardRuleset)) return false
    return resolve(entry.info.permission, pattern, entry.ruleset, approved, local).action === "allow"
  })
}
// sonderr_change end

export class Service extends Context.Service<Service, Interface>()("@sonderr/Permission") {}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const events = yield* EventV2Bridge.Service
    const config = yield* Config.Service // sonderr_change
    const database = yield* Database.Service // sonderr_change
    const state = yield* InstanceState.make<State>(
      Effect.fn("Permission.state")(function* (ctx) {
        void ctx
        const state = {
          pending: new Map<PermissionV1.ID, PendingEntry>(),
          approved: [] as Rule[], // sonderr_change - upstream dropped DB-seeded approvals; Sonderr persists via config.updateGlobal
          session: {} as Record<string, Ruleset>, // sonderr_change
        }

        yield* Effect.addFinalizer(() =>
          Effect.gen(function* () {
            for (const item of state.pending.values()) {
              yield* Deferred.fail(item.deferred, new PermissionV1.RejectedError())
            }
            state.pending.clear()
          }),
        )

        return state
      }),
    )

    const ask = Effect.fn("Permission.ask")(function* (input: AskInput) {
      const { approved, pending } = yield* InstanceState.get(state)
      // sonderr_change start
      const { ruleset, hardRuleset, ...request } = input
      const s = yield* InstanceState.get(state)
      const local = s.session[request.sessionID] ?? []
      // sonderr_change end
      let needsAsk = false
      let approvedRule: Rule | undefined // sonderr_change - remember the rule that auto-approved

      // sonderr_change start - protect config access while honoring explicit global skill trust
      const isProtected = ConfigProtection.isRequest(request)
      const skill = ConfigProtection.globalSkillPattern(request)
      const trusted = skill
        ? (() => {
            const rule = ExternalDirectoryPermission.evaluate(request.permission, skill, approved)
            return rule.action === "allow" && rule.pattern === skill
          })() ||
          (yield* config.getGlobal().pipe(
            Effect.map((global) => fromConfig(global.permission ?? {})),
            Effect.map((rules) => {
              const rule = ExternalDirectoryPermission.evaluate(request.permission, skill, rules)
              return rule.action === "allow" && rule.pattern === skill
            }),
            Effect.catch(() => Effect.succeed(false)),
          ))
        : false
      // sonderr_change end

      const forceAsk = request.metadata?.["skillShell"] === true || request.metadata?.["sandboxEscalation"] === true // sonderr_change
      for (const pattern of request.patterns) {
        const rule = resolve(request.permission, pattern, ruleset, approved, local) // sonderr_change — include session-scoped rules
        yield* Effect.logInfo("evaluated", { permission: request.permission, pattern, action: rule })
        // sonderr_change start — saved/session approvals cannot override hard Ask/Plan denials
        if (veto(request.permission, pattern, hardRuleset)) {
          return yield* new DeniedError({ ruleset: subset(request.permission, hardRuleset ?? []) })
        }
        // sonderr_change end
        if (rule.action === "deny") {
          // sonderr_change - carry the deciding rule (not just the permission subset) for provenance
          return yield* new DeniedError({ ruleset: rule })
        }
        // sonderr_change start - skill shell forces a prompt instead of honoring an allow/auto-approve rule
        if (forceAsk) {
          needsAsk = true
          continue
        }
        // sonderr_change end
        // sonderr_change start - override "allow" to "ask" for protected config paths
        if (rule.action === "allow" && (!isProtected || trusted)) {
          approvedRule = rule // remember the winning rule so callers can explain the auto-approval
          continue
        }
        // sonderr_change end
        needsAsk = true
      }

      if (!needsAsk) return { manual: false, rule: approvedRule } // sonderr_change - report auto-approval

      // sonderr_change start - headless subagent asks fail instead of queuing for a reply that never comes (#11903)
      if (yield* SonderrHeadless.denies(request.sessionID).pipe(Effect.provideService(Database.Service, database))) {
        return yield* new DeniedError({ ruleset: subset(request.permission, ruleset) })
      }
      // sonderr_change end

      const id = request.id ?? PermissionV1.ID.ascending()
      const info: PermissionV1.Request = {
        id,
        sessionID: request.sessionID,
        permission: request.permission,
        patterns: request.patterns,
        // sonderr_change start - disable persistence for protected config paths outside one exact global skill
        metadata: {
          ...request.metadata,
          ...(skill ? { rules: [skill] } : {}),
          ...(isProtected && skill === undefined
            ? { [ConfigProtection.DISABLE_ALWAYS_KEY]: true, [ConfigProtection.CONFIG_PROTECTED_KEY]: true }
            : {}),
        },
        // sonderr_change end
        always: skill ? [skill] : request.always, // sonderr_change - persist only the exact global skill subtree
        tool: request.tool,
      }
      yield* Effect.logInfo("asking", { id, permission: info.permission, patterns: info.patterns })

      const deferred = yield* Deferred.make<void, RejectedError | CorrectedError>()
      pending.set(id, { info, ruleset, hardRuleset, deferred }) // sonderr_change
      yield* events.publish(Event.Asked, info) // sonderr_change - was bus.publish
      // sonderr_change start - was `return yield* Effect.ensuring(...)`; report the manual decision to callers
      yield* Effect.ensuring(
        Deferred.await(deferred),
        Effect.sync(() => {
          pending.delete(id)
        }),
      )
      return { manual: true } // the user was prompted and replied
      // sonderr_change end
    })

    const reply = Effect.fn("Permission.reply")(function* (input: PermissionV1.ReplyInput) {
      const { approved, pending } = yield* InstanceState.get(state)
      const existing = pending.get(input.requestID)
      if (!existing) return yield* new PermissionV1.NotFoundError({ requestID: input.requestID })

      // sonderr_change start - skill-shell batches must be answered by a human; ignore machine approvals
      // (auto-approve/YOLO clients omit `interactive`) so the prompt stays pending for a real decision.
      // Log rather than fail silently: a genuine human client sets `interactive`, so a refused reply here
      // means an auto-approver tried to answer — the request intentionally stays pending for a human.
      if (
        (existing.info.metadata?.["skillShell"] === true || existing.info.metadata?.["sandboxEscalation"] === true) &&
        input.reply !== "reject" &&
        input.interactive !== true
      ) {
        yield* Effect.logWarning("sensitive permission approval refused: requires an interactive human reply", {
          id: input.requestID,
        })
        return
      }
      // sonderr_change end

      pending.delete(input.requestID)
      yield* events.publish(Event.Replied, {
        sessionID: existing.info.sessionID,
        requestID: existing.info.id,
        reply: input.reply,
      })

      if (input.reply === "reject") {
        yield* Deferred.fail(
          existing.deferred,
          input.message
            ? new PermissionV1.CorrectedError({ feedback: input.message })
            : new PermissionV1.RejectedError(),
        )

        for (const [id, item] of pending.entries()) {
          if (item.info.sessionID !== existing.info.sessionID) continue
          pending.delete(id)
          yield* events.publish(Event.Replied, {
            sessionID: item.info.sessionID,
            requestID: item.info.id,
            reply: "reject",
          })
          yield* Deferred.fail(item.deferred, new PermissionV1.RejectedError())
        }
        return
      }

      yield* Deferred.succeed(existing.deferred, undefined)
      if (input.reply === "once") return

      // sonderr_change start - downgrade "always" to "once" for protected config paths
      if (ConfigProtection.isRequest(existing.info) && !ConfigProtection.isGlobalSkillRequest(existing.info)) return
      // sonderr_change end

      for (const pattern of existing.info.always) {
        // sonderr_change start — saveAlwaysRules may have already persisted selected always-rules
        if (!existing.saved) {
          approved.push({
            permission: existing.info.permission,
            pattern,
            action: "allow",
          })
        }
      }

      yield* drainCovered(pending as unknown as Map<string, PendingEntry>, approved, (data) =>
        Effect.asVoid(events.publish(Event.Replied, data)),
      ) // sonderr_change - drain publishes replies through the same EventV2Bridge channel

      if (!existing.saved) {
        const alwaysRules: Ruleset = existing.info.always.map((pattern) => ({
          permission: existing.info.permission,
          pattern,
          action: "allow" as const,
        }))
        if (alwaysRules.length > 0) {
          yield* config.updateGlobal({ permission: toConfig(alwaysRules) }, { dispose: false })
        }
      }
      // sonderr_change end
    })

    const list = Effect.fn("Permission.list")(function* () {
      const pending = (yield* InstanceState.get(state)).pending
      return Array.from(pending.values(), (item) => item.info)
    })

    // sonderr_change start
    const saveAlwaysRules = Effect.fn("Permission.saveAlwaysRules")(function* (
      input: z.infer<typeof SaveAlwaysRulesInput>,
    ) {
      const s = yield* InstanceState.get(state)
      const existing = s.pending.get(input.requestID)
      if (!existing) return yield* new NotFoundError({ requestID: input.requestID })

      if (ConfigProtection.isRequest(existing.info) && !ConfigProtection.isGlobalSkillRequest(existing.info)) return

      const skill = ConfigProtection.globalSkillPattern(existing.info)
      const validRules = new Set(
        skill ? [skill] : [...((existing.info.metadata?.rules as string[] | undefined) ?? []), ...existing.info.always],
      )
      const permission = existing.info.permission

      const approvedSet = new Set(input.approvedAlways ?? [])
      const deniedSet = new Set(input.deniedAlways ?? [])
      const newRules: Rule[] = []
      for (const pattern of validRules) {
        if (approvedSet.has(pattern)) newRules.push({ permission, pattern, action: "allow" })
        if (deniedSet.has(pattern)) newRules.push({ permission, pattern, action: "deny" })
      }
      s.approved.push(...newRules)
      existing.saved = true

      if (newRules.length > 0) {
        yield* config.updateGlobal({ permission: toConfig(newRules) }, { dispose: false })
      }

      // sonderr_change - drain publishes replies through the same EventV2Bridge channel (was DeniedError)
      yield* drainCovered(
        s.pending as unknown as Map<string, PendingEntry>,
        s.approved,
        (data) => Effect.asVoid(events.publish(Event.Replied, data)),
        input.requestID as unknown as string,
      )
    })

    const allowEverything = Effect.fn("Permission.allowEverything")(function* (
      input: z.infer<typeof AllowEverythingInput>,
    ) {
      const s = yield* InstanceState.get(state)

      if (!input.enable) {
        if (input.sessionID) {
          delete s.session[input.sessionID]
          return
        }
        const idx = s.approved.findLastIndex((r) => r.permission === "*" && r.pattern === "*" && r.action === "allow")
        if (idx >= 0) s.approved.splice(idx, 1)
        return
      }

      const rule = { permission: "*", pattern: "*", action: "allow" } as const
      if (input.sessionID) s.session[input.sessionID] = [rule]
      else s.approved.push(rule)

      if (input.requestID) {
        const entry = s.pending.get(input.requestID)
        const ok = entry ? covered(entry, s.approved, s.session[entry.info.sessionID] ?? []) : false
        if (entry && ok && (!input.sessionID || entry.info.sessionID === input.sessionID)) {
          s.pending.delete(input.requestID)
          yield* events.publish(Event.Replied, {
            sessionID: entry.info.sessionID,
            requestID: entry.info.id,
            reply: "once",
          })
          yield* Deferred.succeed(entry.deferred, undefined)
        }
      }

      for (const [id, entry] of s.pending) {
        if (input.sessionID && entry.info.sessionID !== input.sessionID) continue
        if (!covered(entry, s.approved, s.session[entry.info.sessionID] ?? [])) continue
        s.pending.delete(id)
        yield* events.publish(Event.Replied, {
          sessionID: entry.info.sessionID,
          requestID: entry.info.id,
          reply: "once",
        })
        yield* Deferred.succeed(entry.deferred, undefined)
      }
    })

    const pending = Effect.fn("Permission.pending")(function* (id: string) {
      const s = yield* InstanceState.get(state)
      return s.pending.get(PermissionV1.ID.make(id))?.info
    })
    // sonderr_change end

    return Service.of({ ask, reply, list, saveAlwaysRules, allowEverything, pending }) // sonderr_change
  }),
)

function expand(pattern: string): string {
  if (pattern.startsWith("~/")) return os.homedir() + pattern.slice(1)
  if (pattern === "~") return os.homedir()
  if (pattern.startsWith("$HOME/")) return os.homedir() + pattern.slice(5)
  if (pattern.startsWith("$HOME")) return os.homedir() + pattern.slice(5)
  return pattern
}

export function fromConfig(permission: ConfigPermissionV1.Info) {
  const ruleset: PermissionV1.Rule[] = []
  for (const [key, value] of Object.entries(permission)) {
    if (typeof value === "string") {
      ruleset.push({ permission: key, action: value, pattern: "*" })
      continue
    }
    if (value === null) continue // sonderr_change — null is a delete sentinel
    ruleset.push(
      // sonderr_change start — filter out null entries (delete sentinels)
      ...Object.entries(value)
        .filter(([, action]) => action !== null)
        .map(([pattern, action]) => ({
          permission: key,
          pattern: expand(pattern),
          action: action as Action,
        })),
      // sonderr_change end
    )
  }
  return ruleset
}

export function merge(...rulesets: PermissionV1.Ruleset[]): PermissionV1.Rule[] {
  return rulesets.flat()
}

export function disabled(tools: string[], ruleset: PermissionV1.Ruleset): Set<string> {
  const edits = ["edit", "write", "apply_patch"]
  const reads = ["list_mcp_resources", "list_mcp_resource_templates", "read_mcp_resource"]
  return new Set(
    tools.filter((tool) => {
      const permission = edits.includes(tool) ? "edit" : reads.includes(tool) ? "read" : tool
      const rule = ruleset.findLast((rule) => Wildcard.match(permission, rule.permission))
      return rule?.pattern === "*" && rule.action === "deny"
    }),
  )
}

export const defaultLayer: Layer.Layer<Service> = Layer.suspend(() => AppNodeBuilder.build(node)) // sonderr_change - build from the LayerNode graph

// sonderr_change start — inverse of fromConfig: convert rules back to config format
const SCALAR_ONLY_PERMISSIONS = new Set(["todowrite", "todoread", "question", "webfetch", "websearch", "doom_loop"])

export function toConfig(rules: Ruleset): ConfigPermissionV1.Info {
  const result: ConfigPermissionV1.Info = {}
  for (const rule of rules) {
    const existing = result[rule.permission]

    if (SCALAR_ONLY_PERMISSIONS.has(rule.permission)) {
      if (rule.pattern === "*") result[rule.permission] = rule.action
      continue
    }

    if (existing === undefined || existing === null) {
      result[rule.permission] = { [rule.pattern]: rule.action }
      continue
    }
    if (typeof existing === "string") {
      result[rule.permission] = { "*": existing, [rule.pattern]: rule.action }
      continue
    }
    result[rule.permission] = { ...existing, [rule.pattern]: rule.action }
  }
  return result
}
// sonderr_change end

export function visibleTools<T>(tools: Record<string, T>, ruleset: PermissionV1.Ruleset): Record<string, T> {
  const hidden = disabled(Object.keys(tools), ruleset)
  return Object.fromEntries(Object.entries(tools).filter(([name]) => !hidden.has(name)))
}

export const node = LayerNode.make({
  service: Service,
  layer,
  deps: [EventV2Bridge.node, Config.node, Database.node], // sonderr_change
})

export * as Permission from "."
