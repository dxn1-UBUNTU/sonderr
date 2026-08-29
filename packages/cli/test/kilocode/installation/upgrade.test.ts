import { describe, expect } from "bun:test"
import { Effect, Layer, Stream } from "effect"
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/unstable/http"
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process"
import { InstallationChannel } from "@sonderr/core/installation/version"
import { AppProcess } from "@sonderr/core/process"
import { Installation } from "../../../src/installation"
import { testEffect } from "../../lib/effect"
import { AppNodeBuilder } from "@sonderr/core/effect/app-node-builder"
import { LayerNodePlatform } from "@sonderr/core/effect/app-node-platform"
import { CrossSpawnSpawner } from "@sonderr/core/cross-spawn-spawner"

const encoder = new TextEncoder()

function json(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  })
}

function http(handler: (request: HttpClientRequest.HttpClientRequest) => Response = () => json({})) {
  const client = HttpClient.make((request) => Effect.succeed(HttpClientResponse.fromWeb(request, handler(request))))
  return Layer.succeed(HttpClient.HttpClient, client)
}

function spawner(handler: (cmd: string, args: readonly string[]) => string) {
  const child = ChildProcessSpawner.make((command) => {
    const std = ChildProcess.isStandardCommand(command) ? command : undefined
    const output = handler(std?.command ?? "", std?.args ?? [])
    return Effect.succeed(
      ChildProcessSpawner.makeHandle({
        pid: ChildProcessSpawner.ProcessId(0),
        exitCode: Effect.succeed(ChildProcessSpawner.ExitCode(0)),
        isRunning: Effect.succeed(false),
        kill: () => Effect.void,
        stdin: { [Symbol.for("effect/Sink/TypeId")]: Symbol.for("effect/Sink/TypeId") } as never,
        stdout: output ? Stream.make(encoder.encode(output)) : Stream.empty,
        stderr: Stream.empty,
        all: Stream.empty,
        getInputFd: () => ({ [Symbol.for("effect/Sink/TypeId")]: Symbol.for("effect/Sink/TypeId") }) as never,
        getOutputFd: () => Stream.empty,
        unref: Effect.succeed(Effect.void),
      }),
    )
  })
  return Layer.succeed(ChildProcessSpawner.ChildProcessSpawner, child)
}

function layer(
  handler: (cmd: string, args: readonly string[]) => string,
  request?: (request: HttpClientRequest.HttpClientRequest) => Response,
) {
  return AppNodeBuilder.build(Installation.node, [
    [LayerNodePlatform.httpClient, http(request)],
    [CrossSpawnSpawner.node, spawner(handler)],
  ])
}

describe("Sonderr installation upgrade", () => {
  const release: string[] = []
  testEffect(
    layer(
      () => "",
      (request) => {
        release.push(request.url)
        if (request.url === "https://api.github.com/repos/Sonderr-Org/sonderr/releases/latest") {
          return json({ tag_name: "jetbrains/v7.0.16" })
        }
        return json({ version: "8.8.8" })
      },
    ),
  ).effect("does not use polluted GitHub release tags for fallback versions", () =>
    Effect.gen(function* () {
      const result = yield* Installation.Service.use((svc) => svc.latest("unknown"))
      expect(result).toBe("8.8.8")
      expect(release).toContain(`https://registry.npmjs.org/@sonderr%2fcli/${InstallationChannel}`)
      expect(release).not.toContain("https://api.github.com/repos/Sonderr-Org/sonderr/releases/latest")
    }),
  )

  const urls: string[] = []
  testEffect(
    layer(
      () => "",
      (request) => {
        urls.push(request.url)
        return json({ version: "8.8.8" })
      },
    ),
  ).effect("reads yarn versions from the Sonderr package registry", () =>
    Effect.gen(function* () {
      const result = yield* Installation.Service.use((svc) => svc.latest("yarn"))
      expect(result).toBe("8.8.8")
      expect(urls).toContain(`https://registry.npmjs.org/@sonderr%2fcli/${InstallationChannel}`)
    }),
  )

  testEffect(
    layer((cmd, args) => {
      if (cmd === "npm" && args.includes("list")) return "@sonderr/cli@7.3.45"
      return ""
    }),
  ).effect("detects npm installs from the Sonderr package", () =>
    Effect.gen(function* () {
      const result = yield* Installation.Service.use((svc) => svc.method())
      expect(result).toBe("npm")
    }),
  )

  const choco: string[] = []
  testEffect(
    layer(
      () => "",
      (request) => {
        choco.push(request.url)
        return json({ d: { results: [{ Version: "8.8.8" }] } })
      },
    ),
  ).effect("reads choco versions from the Sonderr package", () =>
    Effect.gen(function* () {
      const result = yield* Installation.Service.use((svc) => svc.latest("choco"))
      expect(result).toBe("8.8.8")
      expect(choco).toContain(
        "https://community.chocolatey.org/api/v2/Packages?$filter=Id%20eq%20%27sonderr%27%20and%20IsLatestVersion&$select=Version",
      )
    }),
  )

  const scoop: string[] = []
  testEffect(
    layer(
      () => "",
      (request) => {
        scoop.push(request.url)
        return json({ version: "8.8.8" })
      },
    ),
  ).effect("reads scoop versions from the Sonderr manifest", () =>
    Effect.gen(function* () {
      const result = yield* Installation.Service.use((svc) => svc.latest("scoop"))
      expect(result).toBe("8.8.8")
      expect(scoop).toContain("https://raw.githubusercontent.com/ScoopInstaller/Main/master/bucket/sonderr.json")
    }),
  )

  const calls: string[] = []
  const upgrade = layer((cmd, args) => {
    calls.push([cmd, ...args].join(" "))
    return ""
  })

  testEffect(upgrade).effect("installs the Sonderr npm package", () =>
    Effect.gen(function* () {
      yield* Installation.Service.use((svc) => svc.upgrade("npm", "9.9.9"))
      expect(calls).toContain("npm install -g @sonderr/cli@9.9.9")
    }),
  )

  testEffect(upgrade).effect("installs the Sonderr yarn package", () =>
    Effect.gen(function* () {
      yield* Installation.Service.use((svc) => svc.upgrade("yarn", "9.9.9"))
      expect(calls).toContain("yarn global add @sonderr/cli@9.9.9")
    }),
  )

  testEffect(upgrade).effect("installs the Sonderr pnpm package", () =>
    Effect.gen(function* () {
      yield* Installation.Service.use((svc) => svc.upgrade("pnpm", "9.9.9"))
      expect(calls).toContain("pnpm install -g @sonderr/cli@9.9.9")
    }),
  )

  testEffect(upgrade).effect("installs the Sonderr bun package", () =>
    Effect.gen(function* () {
      yield* Installation.Service.use((svc) => svc.upgrade("bun", "9.9.9"))
      expect(calls).toContain("bun install -g @sonderr/cli@9.9.9")
    }),
  )

  const brew: string[] = []
  const brewer = layer((cmd, args) => {
    brew.push([cmd, ...args].join(" "))
    if (cmd === "brew" && args.includes("list")) return "sonderr"
    if (cmd === "brew" && args.includes("--repo")) return "/tmp/sonderr-homebrew-tap"
    return ""
  })

  testEffect(brewer).effect("upgrades the Sonderr brew formula", () =>
    Effect.gen(function* () {
      yield* Installation.Service.use((svc) => svc.upgrade("brew", "9.9.9"))
      expect(brew).toContain("brew tap Sonderr-Org/tap")
      expect(brew).toContain("brew upgrade Sonderr-Org/tap/sonderr")
    }),
  )

  testEffect(upgrade).effect("upgrades the Sonderr choco package", () =>
    Effect.gen(function* () {
      yield* Installation.Service.use((svc) => svc.upgrade("choco", "9.9.9"))
      expect(calls).toContain("choco upgrade sonderr --version=9.9.9 -y")
    }),
  )

  testEffect(upgrade).effect("installs the Sonderr scoop package", () =>
    Effect.gen(function* () {
      yield* Installation.Service.use((svc) => svc.upgrade("scoop", "9.9.9"))
      expect(calls).toContain("scoop install sonderr@9.9.9")
    }),
  )

  const curl: string[] = []
  testEffect(
    layer(
      (cmd, args) => {
        curl.push([cmd, ...args].join(" "))
        return ""
      },
      (request) => {
        curl.push(request.url)
        return new Response("#!/usr/bin/env bash", { status: 200 })
      },
    ),
  ).effect("uses the Sonderr install script for curl upgrades", () =>
    Effect.gen(function* () {
      yield* Installation.Service.use((svc) => svc.upgrade("curl", "9.9.9"))
      expect(curl).toContain("https://kilo.ai/cli/install")
      expect(curl).toContain("sh")
    }),
  )
})
