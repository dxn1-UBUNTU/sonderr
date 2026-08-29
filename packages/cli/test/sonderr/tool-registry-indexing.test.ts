import { AppNodeBuilder } from "@sonderr/core/effect/app-node-builder"
import { afterEach, describe, expect, spyOn, test } from "bun:test"
import { Effect, Layer, Schema, Stream } from "effect"
import * as Log from "@sonderr/core/util/log"
import { Agent } from "../../src/agent/agent"
import { Bus } from "../../src/bus"
import { SonderrIndexing } from "../../src/sonderr/indexing"
import { SonderrBootstrap } from "../../src/sonderr/bootstrap"
import { SonderrWatcher } from "../../src/sonderr/watcher"
import { SonderrSessions } from "../../src/sonderr-sessions/sonderr-sessions"
import { SonderrMemory } from "@sonderr/sonderr-memory/effect"
import { MemoryService } from "@sonderr/sonderr-memory/effect/service"
import { InstanceState } from "../../src/effect/instance-state"
import { SonderrToolRegistry } from "../../src/sonderr/tool/registry"
import { Provider } from "../../src/provider/provider"
import { ProviderV2 } from "@sonderr/core/provider"
import { ModelV2 } from "@sonderr/core/model"
import { Session } from "../../src/session/session"
import { SessionSummary } from "../../src/session/summary"
import { ToolRegistry } from "../../src/tool/registry"
import type * as Tool from "../../src/tool/tool"
import { disposeAllInstances, provideTmpdirInstance } from "../fixture/fixture"
import * as CrossSpawnSpawner from "@sonderr/core/cross-spawn-spawner"
import { testEffect } from "../lib/effect"

const node = AppNodeBuilder.build(CrossSpawnSpawner.node)
const it = testEffect(Layer.mergeAll(AppNodeBuilder.build(Agent.node), AppNodeBuilder.build(ToolRegistry.node), node))
const ref = {
  providerID: ProviderV2.ID.make("test"),
  modelID: ModelV2.ID.make("test-model"),
}

afterEach(async () => {
  await disposeAllInstances()
})

describe("sonderr tool registry indexing", () => {
  const logger = Log.create({ service: "sonderr-tool-registry" })

  it.live("omits semantic_search without waiting for slow indexing startup", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const avail = spyOn(SonderrIndexing, "available").mockImplementation(() => new Promise<boolean>(() => {}))

          try {
            const registry = yield* ToolRegistry.Service
            const ids = yield* registry.ids()

            expect(ids).not.toContain("semantic_search")
            expect(ids).not.toContain("codesearch")
            expect(ids).toContain("question")
            expect(ids).toContain("read")
            expect(ids).toContain("suggest")
            expect(avail).not.toHaveBeenCalled()
          } finally {
            avail.mockRestore()
          }
        }),
      { git: true },
    ),
  )

  it.live("registers semantic search from config even when readiness throws", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const err = new Error("ready failed")
          const ready = spyOn(SonderrIndexing, "ready").mockImplementation(() => {
            throw err
          })
          const warn = spyOn(logger, "warn").mockImplementation(() => {})

          try {
            const registry = yield* ToolRegistry.Service
            const ids = yield* registry.ids()

            expect(ids).toContain("semantic_search")
            expect(ids).toContain("question")
            expect(ids).toContain("read")
            expect(ids).toContain("suggest")
            expect(warn).not.toHaveBeenCalled()
          } finally {
            ready.mockRestore()
            warn.mockRestore()
          }
        }),
      { git: true, config: { indexing: { enabled: true } } },
    ),
  )

  it.live("registers semantic search from config even when readiness rejects", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const err = new Error("ready rejected")
          const ready = spyOn(SonderrIndexing, "ready").mockImplementation(() => Promise.reject(err) as unknown as boolean)
          const warn = spyOn(logger, "warn").mockImplementation(() => {})

          try {
            const registry = yield* ToolRegistry.Service
            const ids = yield* registry.ids()

            expect(ids).toContain("semantic_search")
            expect(ids).toContain("question")
            expect(ids).toContain("read")
            expect(ids).toContain("suggest")
            expect(warn).not.toHaveBeenCalled()
          } finally {
            ready.mockRestore()
            warn.mockRestore()
          }
        }),
      { git: true, config: { indexing: { enabled: true } } },
    ),
  )

  it.live("registers semantic_search when indexing is enabled", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const ready = spyOn(SonderrIndexing, "ready").mockReturnValue(true)

          try {
            const registry = yield* ToolRegistry.Service
            const ids = yield* registry.ids()

            expect(ids).toContain("semantic_search")
          } finally {
            ready.mockRestore()
          }
        }),
      { git: true, config: { indexing: { enabled: true } } },
    ),
  )

  it.live("omits semantic_search hint from glob and grep descriptions when indexing is not ready", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const ready = spyOn(SonderrIndexing, "ready").mockReturnValue(false)

          try {
            const agent = yield* Agent.Service
            const build = yield* agent.get("build")
            const registry = yield* ToolRegistry.Service
            const tools = yield* registry.tools({ ...ref, agent: build })
            const glob = tools.find((tool) => tool.id === "glob")?.description ?? ""
            const grep = tools.find((tool) => tool.id === "grep")?.description ?? ""

            expect(glob).not.toContain("semantic_search")
            expect(grep).not.toContain("semantic_search")
          } finally {
            ready.mockRestore()
          }
        }),
      { git: true },
    ),
  )

  it.live("includes semantic_search hint in glob and grep descriptions when indexing is enabled", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const ready = spyOn(SonderrIndexing, "ready").mockReturnValue(true)

          try {
            const agent = yield* Agent.Service
            const build = yield* agent.get("build")
            const registry = yield* ToolRegistry.Service
            const tools = yield* registry.tools({ ...ref, agent: build })
            const ids = tools.map((tool) => tool.id)
            const glob = tools.find((tool) => tool.id === "glob")?.description ?? ""
            const grep = tools.find((tool) => tool.id === "grep")?.description ?? ""

            expect(ids).toContain("semantic_search")
            expect(glob).toContain("semantic_search")
            expect(grep).toContain("semantic_search")
          } finally {
            ready.mockRestore()
          }
        }),
      { git: true, config: { indexing: { enabled: true } } },
    ),
  )

  it.live("omits interactive_terminal from subagent definitions", () =>
    Effect.acquireUseRelease(
      Effect.sync(() => {
        const prev = process.env["SONDERR_CLIENT"]
        process.env["SONDERR_CLIENT"] = "cli"
        return prev
      }),
      () =>
        provideTmpdirInstance(
          () =>
            Effect.gen(function* () {
              const agent = yield* Agent.Service
              const build = yield* agent.get("build")
              const explore = yield* agent.get("explore")
              const registry = yield* ToolRegistry.Service
              const primary = yield* registry.tools({ ...ref, agent: build })
              const subagent = yield* registry.tools({ ...ref, agent: explore })

              expect(primary.map((tool) => tool.id)).toContain("interactive_terminal")
              expect(subagent.map((tool) => tool.id)).not.toContain("interactive_terminal")
            }),
          {
            git: true,
            config: { permission: { interactive_terminal: "allow" } },
          },
        ),
      (prev) =>
        Effect.sync(() => {
          if (prev === undefined) delete process.env["SONDERR_CLIENT"]
          if (prev !== undefined) process.env["SONDERR_CLIENT"] = prev
        }),
    ),
  )

  test("enables semantic search from indexing configuration before the index is ready", () => {
    expect(
      SonderrToolRegistry.indexing({
        indexing: { enabled: true },
      }),
    ).toBe(true)
    expect(
      SonderrToolRegistry.indexing({
        indexing: { enabled: false },
      }),
    ).toBe(false)
    expect(SonderrToolRegistry.indexing({}, { indexing: { enabled: true } })).toBe(true)
  })

  it.live("omits memory tools when project memory is disabled but keeps sonderr_local_recall", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const agent = yield* Agent.Service
          const build = yield* agent.get("build")
          const registry = yield* ToolRegistry.Service
          const tools = yield* registry.tools({ ...ref, agent: build })
          const ids = tools.map((tool) => tool.id)

          expect(ids).not.toContain("sonderr_memory_recall")
          expect(ids).not.toContain("sonderr_memory_save")
          // sonderr_local_recall is a transcript-recall tool gated by `recall: "ask"` in agent
          // permissions; it must NOT be coupled to project-memory enablement.
          expect(ids).toContain("sonderr_local_recall")
        }),
      { git: true },
    ),
  )

  it.live("memoryToolsEnabled coalesces consecutive probes within the TTL", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const ctx = yield* InstanceState.context
          const probe = spyOn(SonderrMemory, "toolEnabled")

          try {
            const a = yield* SonderrToolRegistry.memoryToolsEnabled({ ctx })
            const b = yield* SonderrToolRegistry.memoryToolsEnabled({ ctx })
            const c = yield* SonderrToolRegistry.memoryToolsEnabled({ ctx })

            expect([a, b, c]).toEqual([false, false, false])
            // Cache hit: only the first call should reach SonderrMemory.toolEnabled.
            expect(probe).toHaveBeenCalledTimes(1)
          } finally {
            probe.mockRestore()
          }
        }),
      { git: true },
    ),
  )

  it.live("memoryToolsEnabled reflects enable/disable immediately after invalidate", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const ctx = yield* InstanceState.context
          const root = (yield* Effect.promise(() => SonderrMemory.prepare({ ctx }))).toString()

          const first = yield* SonderrToolRegistry.memoryToolsEnabled({ ctx })
          expect(first).toBe(false)

          yield* Effect.promise(() => SonderrMemory.enable({ ctx }))

          // The bootstrap MemoryEvents subscriber invalidates on mutation; call it directly here.
          SonderrToolRegistry.invalidateMemoryEnabled(root)
          const afterEnable = yield* SonderrToolRegistry.memoryToolsEnabled({ ctx })
          expect(afterEnable).toBe(true)

          yield* Effect.promise(() => SonderrMemory.disable({ ctx }))

          SonderrToolRegistry.invalidateMemoryEnabled(root)
          const afterDisable = yield* SonderrToolRegistry.memoryToolsEnabled({ ctx })
          expect(afterDisable).toBe(false)
        }),
      { git: true },
    ),
  )

  it.live("includes memory tools when project memory is enabled", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const ctx = yield* InstanceState.context
          yield* Effect.promise(() => SonderrMemory.enable({ ctx }))

          const agent = yield* Agent.Service
          const build = yield* agent.get("build")
          const registry = yield* ToolRegistry.Service
          const tools = yield* registry.tools({ ...ref, agent: build })
          const ids = tools.map((tool) => tool.id)

          expect(ids).toContain("sonderr_memory_recall")
          expect(ids).toContain("sonderr_memory_save")
          expect(ids).toContain("sonderr_local_recall")
        }),
      { git: true },
    ),
  )

  test("conditionally includes Sonderr registry extras", () => {
    const prev = process.env["SONDERR_CLIENT"]
    const def = (id: string): Tool.Def => ({
      id,
      description: id,
      parameters: Schema.String,
      execute: () => Effect.succeed({ title: id, output: id, metadata: {} }),
    })
    const tools = {
      semantic: def("semantic_search"),
      recall: def("recall"),
      managerModels: def("agent_manager_models"),
      memory: def("sonderr_memory_recall"),
      save: def("sonderr_memory_save"),
      manager: def("agent_manager"),
      process: def("background_process"),
      chart: def("chart"),
      image: def("generate_image"),
      terminal: def("interactive_terminal"),
      notify: def("notify_user"),
      send: def("send_file"),
      notebookRead: def("notebook_read"),
      notebookEdit: def("notebook_edit"),
      notebookExecute: def("notebook_execute"),
    }

    try {
      process.env["SONDERR_CLIENT"] = "cli"
      expect(SonderrToolRegistry.extra(tools, {}).map((tool) => tool.id)).toEqual([
        "semantic_search",
        "sonderr_memory_recall",
        "sonderr_memory_save",
        "recall",
        "background_process",
        "interactive_terminal",
        "notify_user",
        "send_file",
      ])
      expect(
        SonderrToolRegistry.extra(tools, { experimental: { image_generation: true } }).map((tool) => tool.id),
      ).toEqual([
        "generate_image",
        "semantic_search",
        "sonderr_memory_recall",
        "sonderr_memory_save",
        "recall",
        "background_process",
        "interactive_terminal",
        "notify_user",
        "send_file",
      ])

      process.env["SONDERR_CLIENT"] = "vscode"
      expect(SonderrToolRegistry.extra(tools, {}).map((tool) => tool.id)).toEqual([
        "semantic_search",
        "sonderr_memory_recall",
        "sonderr_memory_save",
        "recall",
        "chart",
        "background_process",
        "agent_manager_models",
        "agent_manager",
        "notify_user",
        "send_file",
      ])
      expect(
        SonderrToolRegistry.extra(tools, {
          experimental: { native_notebook_tools: true },
        }).map((tool) => tool.id),
      ).toEqual([
        "semantic_search",
        "sonderr_memory_recall",
        "sonderr_memory_save",
        "recall",
        "chart",
        "background_process",
        "agent_manager_models",
        "agent_manager",
        "notebook_read",
        "notebook_edit",
        "notebook_execute",
        "notify_user",
        "send_file",
      ])
      expect(SonderrToolRegistry.extra({ ...tools, semantic: undefined }, {}).map((tool) => tool.id)).toEqual([
        "sonderr_memory_recall",
        "sonderr_memory_save",
        "recall",
        "chart",
        "background_process",
        "agent_manager_models",
        "agent_manager",
        "notify_user",
        "send_file",
      ])

      process.env["SONDERR_CLIENT"] = "desktop"
      expect(SonderrToolRegistry.extra(tools, {}).map((tool) => tool.id)).toEqual([
        "semantic_search",
        "sonderr_memory_recall",
        "sonderr_memory_save",
        "recall",
        "notify_user",
        "send_file",
      ])

      process.env["SONDERR_CLIENT"] = "run"
      expect(SonderrToolRegistry.extra(tools, {}).map((tool) => tool.id)).toEqual([
        "semantic_search",
        "sonderr_memory_recall",
        "sonderr_memory_save",
        "recall",
        "notify_user",
        "send_file",
      ])

      process.env["SONDERR_CLIENT"] = "acp"
      expect(SonderrToolRegistry.extra(tools, {}).map((tool) => tool.id)).toEqual([
        "semantic_search",
        "sonderr_memory_recall",
        "sonderr_memory_save",
        "recall",
        "notify_user",
        "send_file",
      ])
    } finally {
      if (prev === undefined) delete process.env["SONDERR_CLIENT"]
      if (prev !== undefined) process.env["SONDERR_CLIENT"] = prev
    }
  })

  test("logs indexing bootstrap failures without blocking session bootstrap", async () => {
    const platform = process.env["SONDERR_PLATFORM"]
    process.env["SONDERR_PLATFORM"] = "cli"
    const logger = Log.create({ service: "sonderr-bootstrap" })
    const err = new Error("indexing init failed")
    const calls: string[] = []
    const sessions = Layer.succeed(
      SonderrSessions.Service,
      SonderrSessions.Service.of({
        init: () => Effect.sync(() => calls.push("sessions")),
        sendAgentNotification: () => Effect.succeed({ ok: false as const, reason: "not_connected" }),
        reportSessionTitle: () => Effect.succeed({ ok: false as const, reason: "not_connected" }),
      }),
    )
    const bus = Layer.succeed(
      Bus.Service,
      Bus.Service.of({
        publish: () => Effect.void,
        subscribe: () => Effect.succeed(Stream.empty),
        subscribeAll: () => Effect.succeed(Stream.empty),
        subscribeCallback: () => Effect.succeed(() => {}),
        subscribeAllCallback: () => Effect.succeed(() => {}),
      }),
    )
    const memory = Layer.succeed(MemoryService.Service, MemoryService.make())
    const session = Layer.succeed(Session.Service, {} as Session.Interface)
    const summary = Layer.succeed(SessionSummary.Service, {} as SessionSummary.Interface)
    const provider = Layer.succeed(Provider.Service, {} as Provider.Interface)
    const watcher = Layer.succeed(SonderrWatcher.Service, SonderrWatcher.Service.of({ init: () => Effect.void }))
    const indexing = spyOn(SonderrIndexing, "init").mockRejectedValue(err)
    const warn = spyOn(logger, "warn").mockImplementation(() => {})

    try {
      await Effect.runPromise(
        SonderrBootstrap.Service.use((svc) => svc.init()).pipe(
          Effect.provide(
            SonderrBootstrap.layer.pipe(Layer.provide([sessions, bus, memory, session, summary, provider, watcher])),
          ),
          Effect.scoped,
        ),
      )
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(calls).toEqual(["sessions"])
      expect(indexing).toHaveBeenCalledTimes(1)
      expect(warn).toHaveBeenCalledWith("indexing bootstrap failed", { err })
    } finally {
      if (platform === undefined) delete process.env["SONDERR_PLATFORM"]
      else process.env["SONDERR_PLATFORM"] = platform
      indexing.mockRestore()
      warn.mockRestore()
    }
  })
})
