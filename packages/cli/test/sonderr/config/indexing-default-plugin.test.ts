import { AppNodeBuilder } from "@sonderr/core/effect/app-node-builder"
import { afterEach, describe, expect, test } from "bun:test"
import { Effect, Layer, Option } from "effect"
import { NodeFileSystem, NodePath } from "@effect/platform-node"
import path from "path"
import { Flag } from "@sonderr/core/flag/flag"
import { hasIndexingPlugin } from "@sonderr/sonderr-indexing/detect"
import { Account } from "../../../src/account/account"
import { Auth } from "../../../src/auth"
import { Config } from "../../../src/config/config"
import type { ConfigPlugin } from "../../../src/config/plugin"
import type { ConfigPluginV1 } from "@sonderr/core/v1/config/plugin"
import { SonderrDefaultPlugins } from "../../../src/sonderr/config/default-plugins"
import { INDEXING_PLUGIN } from "../../../src/sonderr/indexing-feature"
import * as CrossSpawnSpawner from "@sonderr/core/cross-spawn-spawner"
import { Env } from "../../../src/env"
import { Git } from "../../../src/git"
import { FSUtil } from "@sonderr/core/fs-util"
import { EffectFlock } from "@sonderr/core/util/effect-flock"
import { Filesystem } from "../../../src/util/filesystem"
import { provideTestInstance } from "../../fixture/fixture"
import { Npm } from "@sonderr/core/npm"
import { HttpClient } from "effect/unstable/http"
import { disposeAllInstances, tmpdir } from "../../fixture/fixture"
import { LayerNodePlatform } from "@sonderr/core/effect/app-node-platform"

const infra = AppNodeBuilder.build(CrossSpawnSpawner.node).pipe(
  Layer.provideMerge(Layer.mergeAll(NodeFileSystem.layer, NodePath.layer)),
)
const emptyAccount = Layer.mock(Account.Service)({
  active: () => Effect.succeed(Option.none()),
  activeOrg: () => Effect.succeed(Option.none()),
})
const emptyAuth = Layer.mock(Auth.Service)({
  all: () => Effect.succeed({}),
})
const noopNpm = Layer.mock(Npm.Service)({
  install: () => Effect.void,
  add: () => Effect.die("not implemented"),
  which: () => Effect.succeed(undefined),
})
const unexpectedHttp = HttpClient.make((request) =>
  Effect.die(`unexpected http request: ${request.method} ${request.url}`),
)
const layer = AppNodeBuilder.build(Config.node, [
  [Auth.node, emptyAuth],
  [Account.node, emptyAccount],
  [Npm.node, noopNpm],
  [LayerNodePlatform.httpClient, Layer.succeed(HttpClient.HttpClient, unexpectedHttp)],
]).pipe(Layer.provideMerge(infra))

const load = () => Effect.runPromise(Config.Service.use((svc) => svc.get()).pipe(Effect.scoped, Effect.provide(layer)))
describe("sonderr default indexing plugin", () => {
  afterEach(async () => {
    await disposeAllInstances()
  })

  test("injects indexing without registering an external plugin origin", () => {
    const config: { plugin?: ConfigPluginV1.Spec[]; plugin_origins?: ConfigPlugin.Origin[] } = {}

    SonderrDefaultPlugins.apply(config, { disabled: false })

    expect(hasIndexingPlugin(config.plugin ?? [])).toBe(true)
    expect(config.plugin_origins).toBeUndefined()
  })

  test("removes a persisted indexing marker from external plugin origins", () => {
    const external: ConfigPlugin.Origin = { spec: "global-plugin", source: "global", scope: "global" }
    const config = {
      plugin: [INDEXING_PLUGIN, external.spec],
      plugin_origins: [{ spec: INDEXING_PLUGIN, source: "global", scope: "global" as const }, external],
    }

    SonderrDefaultPlugins.apply(config, { disabled: true })

    expect(config.plugin).toEqual([INDEXING_PLUGIN, external.spec])
    expect(config.plugin_origins).toEqual([external])
  })

  test("does not hard-enable indexing plugin when default plugins are disabled", async () => {
    const original = Flag.SONDERR_DISABLE_DEFAULT_PLUGINS
    Flag.SONDERR_DISABLE_DEFAULT_PLUGINS = true

    try {
      await using tmp = await tmpdir({
        init: async (dir) => {
          await Filesystem.write(
            path.join(dir, "sonderr.json"),
            JSON.stringify({
              $schema: "https://app.kilo.ai/config.json",
              plugin: ["global-plugin-1"],
            }),
          )
        },
      })

      await provideTestInstance({
        directory: tmp.path,
        fn: async () => {
          const config = await load()
          expect(hasIndexingPlugin(config.plugin ?? [])).toBe(false)
        },
      })
    } finally {
      Flag.SONDERR_DISABLE_DEFAULT_PLUGINS = original
    }
  })
})
