import { describe, expect, spyOn, test } from "bun:test"
import { Effect, Schema } from "effect"
import * as Log from "@sonderr/core/util/log"
import { SonderrToolRegistry } from "../../src/sonderr/tool/registry"
import { Agent } from "../../src/agent/agent"
import * as Truncate from "../../src/tool/truncate"
import type * as Tool from "../../src/tool/tool"

const logger = Log.create({ service: "sonderr-tool-registry" })
const deps = { agent: {} as Agent.Interface, truncate: {} as Truncate.Interface }

describe("sonderr tool registry indexing import failure", () => {
  test("omits semantic_search when the indexing module cannot load", async () => {
    const err = new Error("indexing import failed")
    const warn = spyOn(logger, "warn").mockImplementation(() => {})

    try {
      const result = await Effect.runPromise(
        SonderrToolRegistry.build(infos(), deps, {
          indexing: async () => {
            throw err
          },
        }),
      )

      expect(result.semantic).toBeUndefined()
      expect(result.recall.id).toBe("recall")
      expect(warn.mock.calls[0]?.[0]).toBe("semantic search unavailable")
      expect(warn.mock.calls[0]?.[1]?.err).toBeDefined()
    } finally {
      warn.mockRestore()
    }
  })
})

function infos() {
  return {
    recall: info("recall"),
    managerModels: info("agent_manager_models"),
    memory: info("sonderr_memory_recall"),
    save: info("sonderr_memory_save"),
    manager: info("agent_manager"),
    process: info("background_process"),
    chart: info("chart"),
    image: info("generate_image"),
    notify: info("notify_user"),
    send: info("send_file"),
    notebookRead: info("notebook_read"),
    notebookEdit: info("notebook_edit"),
    notebookExecute: info("notebook_execute"),
  }
}

function info(id: string): Tool.Info {
  return {
    id,
    init: () =>
      Effect.succeed({
        description: id,
        parameters: Schema.String,
        execute: () => Effect.succeed({ title: id, output: id, metadata: {} }),
      }),
  }
}
