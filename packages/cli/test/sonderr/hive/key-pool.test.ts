import { describe, expect, test } from "bun:test"
import { Effect, Layer } from "effect"
import { SonderrKeyPool } from "../../../src/sonderr/hive/index"
import { Auth } from "../../../src/auth"
import { FSUtil } from "@sonderr/core/fs-util"
import { Global } from "@sonderr/core/global"
import { LayerNode } from "@sonderr/core/effect/layer-node"
import path from "path"

const fakeAuth = (infos: Record<string, Auth.Info>) =>
  Layer.mock(Auth.Service)({
    all: () => Effect.succeed(infos),
    get: (providerID: string) => Effect.succeed(infos[providerID]),
  })

function layerForTest() {
  const dir = path.join("/tmp", `hive-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  return LayerNode.compile(
    LayerNode.group([SonderrKeyPool.node]),
    [
      [Auth.node, fakeAuth({ openai: { type: "api", key: "sk-primary" } as Auth.Info })],
      [Global.node, Global.layerWith({ data: dir })],
    ],
  ).pipe(Layer.provide(FSUtil.defaultLayer))
}

describe("SonderrKeyPool", () => {
  test("next returns primary key when pool is empty", () =>
    Effect.gen(function* () {
      const pool = yield* SonderrKeyPool.Service
      const result = yield* pool.next("openai")
      expect((result as Auth.Api)?.key).toBe("sk-primary")
    }).pipe(Effect.provide(layerForTest()), Effect.runPromise))

  test("add and next round-robins keys", () =>
    Effect.gen(function* () {
      const pool = yield* SonderrKeyPool.Service
      yield* pool.add("openai", { type: "api", key: "sk-1" } as Auth.Info)
      yield* pool.add("openai", { type: "api", key: "sk-2" } as Auth.Info)
      const first = yield* pool.next("openai")
      const second = yield* pool.next("openai")
      expect((first as Auth.Api)?.key).toBe("sk-1")
      expect((second as Auth.Api)?.key).toBe("sk-2")
    }).pipe(Effect.provide(layerForTest()), Effect.runPromise))

  test("list returns all keys per provider", () =>
    Effect.gen(function* () {
      const pool = yield* SonderrKeyPool.Service
      yield* pool.add("openai", { type: "api", key: "sk-1" } as Auth.Info)
      const all = yield* pool.list()
      expect(all["openai"]).toHaveLength(1)
    }).pipe(Effect.provide(layerForTest()), Effect.runPromise))

  test("remove drops key by index", () =>
    Effect.gen(function* () {
      const pool = yield* SonderrKeyPool.Service
      yield* pool.add("openai", { type: "api", key: "sk-1" } as Auth.Info)
      yield* pool.add("openai", { type: "api", key: "sk-2" } as Auth.Info)
      yield* pool.remove("openai", 0)
      const all = yield* pool.list()
      expect(all["openai"]).toHaveLength(1)
      expect((all["openai"][0] as Auth.Api)?.key).toBe("sk-2")
    }).pipe(Effect.provide(layerForTest()), Effect.runPromise))
})
