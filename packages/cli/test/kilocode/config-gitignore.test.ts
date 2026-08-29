// sonderr_change - new file
//
// Sonderr uses Npm.Service (arborist) for dependency installation and may write
// a .gitignore inside the .sonderr config dir. Users may have pnpm or yarn as
// their system package manager, which can produce lockfiles in the .sonderr/
// config directory. These must be ignored so they don't appear as untracked
// files in the user's project.

import { AppNodeBuilder } from "@sonderr/core/effect/app-node-builder"
import { expect, test } from "bun:test"
import fs from "fs/promises"
import path from "path"
import { Effect, Layer, Option } from "effect"
import { NodeFileSystem, NodePath } from "@effect/platform-node"
import { Config } from "../../src/config/config"
import { EffectFlock } from "@sonderr/core/util/effect-flock"
import { Npm } from "@sonderr/core/npm"
import { FSUtil } from "@sonderr/core/fs-util"
import { Env } from "../../src/env"
import { Git } from "../../src/git"
import { Auth } from "../../src/auth"
import { Account } from "../../src/account/account"
import { provideTestInstance } from "../fixture/fixture"
import { Filesystem } from "../../src/util/filesystem"
import * as CrossSpawnSpawner from "@sonderr/core/cross-spawn-spawner"
import { HttpClient } from "effect/unstable/http"
import { tmpdir } from "../fixture/fixture"
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

const testLayer = AppNodeBuilder.build(Config.node, [
  [Auth.node, emptyAuth],
  [Account.node, emptyAccount],
  [Npm.node, noopNpm],
  [LayerNodePlatform.httpClient, Layer.succeed(HttpClient.HttpClient, unexpectedHttp)],
]).pipe(Layer.provideMerge(infra))

test(".gitignore in .sonderr config dir includes pnpm and yarn lockfile patterns", async () => {
  await using tmp = await tmpdir()
  const dir = path.join(tmp.path, "a")
  const sonderr = path.join(dir, ".sonderr")
  await fs.mkdir(sonderr, { recursive: true })

  await provideTestInstance({
    directory: dir,
    fn: async () => {
      await Effect.runPromise(Config.Service.use((svc) => svc.get()).pipe(Effect.scoped, Effect.provide(testLayer)))
    },
  })

  const ignore = await Filesystem.readText(path.join(sonderr, ".gitignore"))
  expect(ignore).toContain("pnpm-lock.yaml")
  expect(ignore).toContain("yarn.lock")
})
