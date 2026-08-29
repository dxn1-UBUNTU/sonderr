import { LayerNode } from "@sonderr/core/effect/layer-node"
import { AppNodeBuilder } from "@sonderr/core/effect/app-node-builder"
import { httpClient } from "@sonderr/core/effect/app-node-platform"
import { Effect, Layer, Schema, Context, Stream } from "effect"
import { serviceUse } from "@sonderr/core/effect/service-use"
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/unstable/http"
import { withTransientReadRetry } from "@/util/effect-http-client"
import { errorMessage } from "@/util/error"
import { ChildProcess } from "effect/unstable/process"
import { AppProcess } from "@sonderr/core/process"
import path from "path"
import { makeRuntime } from "@sonderr/core/effect/runtime"
import semver from "semver"
import { InstallationChannel, InstallationVersion } from "@sonderr/core/installation/version"
import { NpmConfig } from "@sonderr/core/npm-config"
// sonderr_change start
import {
  Brew as SonderrBrew,
  Choco as SonderrChoco,
  Npm as SonderrNpm,
  Release as SonderrRelease,
  Scoop as SonderrScoop,
} from "@/sonderr/installation"
import { latest as sonderrLatest } from "@/sonderr/installation/latest"
// sonderr_change end
import { InstallationEvent } from "@sonderr/schema/installation-event"

export type Method = "curl" | "npm" | "yarn" | "pnpm" | "bun" | "brew" | "scoop" | "choco" | "unknown"

export type ReleaseType = "patch" | "minor" | "major"

export const Event = InstallationEvent

export function getReleaseType(current: string, latest: string): ReleaseType {
  const currMajor = semver.major(current)
  const currMinor = semver.minor(current)
  const newMajor = semver.major(latest)
  const newMinor = semver.minor(latest)

  if (newMajor > currMajor) return "major"
  if (newMinor > currMinor) return "minor"
  return "patch"
}

export const Info = Schema.Struct({
  version: Schema.String,
  latest: Schema.String,
}).annotate({ identifier: "InstallationInfo" })
export type Info = Schema.Schema.Type<typeof Info>

export function userAgent(client = "cli") {
  return `sonderr/${InstallationChannel}/${InstallationVersion}/${client}` // sonderr_change
}

export const USER_AGENT = userAgent()

export function isPreview() {
  return InstallationChannel !== "latest"
}

export function isLocal() {
  return InstallationChannel === "local"
}

export class UpgradeFailedError extends Schema.TaggedErrorClass<UpgradeFailedError>()("UpgradeFailedError", {
  stderr: Schema.String,
}) {
  override get message() {
    return this.stderr
  }
}

// Response schemas for external version APIs
const NpmPackage = Schema.Struct({ version: Schema.String })
const BrewFormula = Schema.Struct({
  versions: Schema.Struct({ stable: Schema.String }),
})
const BrewInfoV2 = Schema.Struct({
  formulae: Schema.Array(Schema.Struct({ versions: Schema.Struct({ stable: Schema.String }) })),
})
const ChocoPackage = Schema.Struct({
  d: Schema.Struct({
    results: Schema.Array(Schema.Struct({ Version: Schema.String })),
  }),
})
const ScoopManifest = NpmPackage

export interface Interface {
  readonly info: () => Effect.Effect<Info>
  readonly method: () => Effect.Effect<Method>
  readonly latest: (method?: Method) => Effect.Effect<string>
  readonly upgrade: (method: Method, target: string) => Effect.Effect<void, UpgradeFailedError>
}

export class Service extends Context.Service<Service, Interface>()("@sonderr/Installation") {}

export const use = serviceUse(Service)

const layer: Layer.Layer<Service, never, HttpClient.HttpClient | AppProcess.Service> = Layer.effect(
  Service,
  Effect.gen(function* () {
    const http = yield* HttpClient.HttpClient
    const httpOk = HttpClient.filterStatusOk(withTransientReadRetry(http))
    const appProcess = yield* AppProcess.Service

    const text = Effect.fnUntraced(
      function* (cmd: string[], opts?: { cwd?: string; env?: Record<string, string> }) {
        const result = yield* appProcess.run(
          ChildProcess.make(cmd[0], cmd.slice(1), {
            cwd: opts?.cwd,
            env: opts?.env,
            extendEnv: true,
          }),
        )
        return result.stdout.toString("utf8")
      },
      Effect.catch(() => Effect.succeed("")),
    )

    const run = Effect.fnUntraced(
      function* (cmd: string[], opts?: { cwd?: string; env?: Record<string, string> }) {
        const result = yield* appProcess.run(
          ChildProcess.make(cmd[0], cmd.slice(1), {
            cwd: opts?.cwd,
            env: opts?.env,
            extendEnv: true,
          }),
        )
        return {
          code: result.exitCode,
          stdout: result.stdout.toString("utf8"),
          stderr: result.stderr.toString("utf8"),
        }
      },
      Effect.catch((err) => Effect.succeed({ code: 1, stdout: "", stderr: errorMessage(err) })),
    )

    const getBrewFormula = Effect.fnUntraced(function* () {
      const tapFormula = yield* text(["brew", "list", "--formula", SonderrBrew.formula]) // sonderr_change
      if (tapFormula.includes(SonderrBrew.name)) return SonderrBrew.formula // sonderr_change
      const coreFormula = yield* text(["brew", "list", "--formula", SonderrBrew.name]) // sonderr_change
      if (coreFormula.includes(SonderrBrew.name)) return SonderrBrew.name // sonderr_change
      return SonderrBrew.formula // sonderr_change
    })

    const upgradeFailure = (method: Method, result?: { code: number; stdout: string; stderr: string }) => {
      if (method === "choco") return "not running from an elevated command shell"
      if (result) return `Upgrade failed for ${method} (exit code ${result.code}).`
      return `Upgrade failed for ${method}.`
    }

    const upgradeScriptShell = Effect.fnUntraced(function* () {
      const bashVersion = yield* text(["bash", "--version"])
      if (bashVersion) return "bash"
      return "sh"
    })

    const upgradeCurl = Effect.fnUntraced(
      function* (target: string) {
        const response = yield* httpOk.execute(HttpClientRequest.get(SonderrRelease.install)) // sonderr_change
        const body = yield* response.text
        const bodyBytes = new TextEncoder().encode(body)
        const shell = yield* upgradeScriptShell()
        const result = yield* appProcess.run(
          ChildProcess.make(shell, [], {
            stdin: Stream.make(bodyBytes),
            env: { VERSION: target },
            extendEnv: true,
          }),
        )
        return {
          code: result.exitCode,
          stdout: result.stdout.toString("utf8"),
          stderr: result.stderr.toString("utf8"),
        }
      },
      Effect.mapError(() => new UpgradeFailedError({ stderr: upgradeFailure("curl") })),
    )

    const result: Interface = {
      info: Effect.fn("Installation.info")(function* () {
        return {
          version: InstallationVersion,
          latest: yield* result.latest(),
        }
      }),
      method: Effect.fn("Installation.method")(function* () {
        if (process.execPath.includes(path.join(".sonderr", "bin"))) return "curl" as Method // sonderr_change
        if (process.execPath.includes(path.join(".sonderr", "bin"))) return "curl" as Method
        if (process.execPath.includes(path.join(".local", "bin"))) return "curl" as Method
        const exec = process.execPath.toLowerCase()

        const checks: Array<{
          name: Method
          command: () => Effect.Effect<string>
        }> = [
          {
            name: "npm",
            command: () => text(["npm", "list", "-g", "--depth=0"]),
          },
          { name: "yarn", command: () => text(["yarn", "global", "list"]) },
          {
            name: "pnpm",
            command: () => text(["pnpm", "list", "-g", "--depth=0"]),
          },
          { name: "bun", command: () => text(["bun", "pm", "ls", "-g"]) },
          {
            name: "brew",
            command: () => text(["brew", "list", "--formula", SonderrBrew.formula]),
          }, // sonderr_change
          {
            name: "scoop",
            command: () => text(["scoop", "list", SonderrScoop.name]),
          }, // sonderr_change
          {
            name: "choco",
            command: () => text(["choco", "list", "--limit-output", SonderrChoco.name]),
          }, // sonderr_change
        ]

        checks.sort((a, b) => {
          const aMatches = exec.includes(a.name)
          const bMatches = exec.includes(b.name)
          if (aMatches && !bMatches) return -1
          if (!aMatches && bMatches) return 1
          return 0
        })

        for (const check of checks) {
          const output = yield* check.command()
          // sonderr_change start
          const installedName =
            check.name === "brew"
              ? SonderrBrew.name
              : check.name === "choco"
                ? SonderrChoco.name
                : check.name === "scoop"
                  ? SonderrScoop.name
                  : SonderrNpm.name
          // sonderr_change end
          if (output.includes(installedName)) {
            return check.name
          }
        }

        return "unknown" as Method
      }),
      latest: Effect.fn("Installation.latest")(function* (installMethod?: Method) {
        const detectedMethod = installMethod || (yield* result.method())

        if (detectedMethod === "brew") {
          const formula = yield* getBrewFormula()
          if (formula.includes("/")) {
            const infoJson = yield* text(["brew", "info", "--json=v2", formula])
            const info = yield* Schema.decodeUnknownEffect(Schema.fromJsonString(BrewInfoV2))(infoJson)
            return info.formulae[0].versions.stable
          }
          const response = yield* httpOk.execute(
            HttpClientRequest.get(SonderrBrew.api).pipe(HttpClientRequest.acceptJson), // sonderr_change
          )
          const data = yield* HttpClientResponse.schemaBodyJson(BrewFormula)(response)
          return data.versions.stable
        }

        if (
          detectedMethod === "npm" ||
          detectedMethod === "yarn" ||
          detectedMethod === "bun" ||
          detectedMethod === "pnpm"
        ) {
          // sonderr_change
          const response = yield* httpOk.execute(
            HttpClientRequest.get(
              `${yield* NpmConfig.registry(process.cwd())}/${SonderrNpm.path}/${InstallationChannel}`, // sonderr_change
            ).pipe(HttpClientRequest.acceptJson),
          )
          const data = yield* HttpClientResponse.schemaBodyJson(NpmPackage)(response)
          return data.version
        }

        if (detectedMethod === "choco") {
          const response = yield* httpOk.execute(
            HttpClientRequest.get(
              SonderrChoco.api, // sonderr_change
            ).pipe(
              HttpClientRequest.setHeaders({
                Accept: "application/json;odata=verbose",
              }),
            ),
          )
          const data = yield* HttpClientResponse.schemaBodyJson(ChocoPackage)(response)
          return data.d.results[0].Version
        }

        if (detectedMethod === "scoop") {
          const response = yield* httpOk.execute(
            HttpClientRequest.get(
              SonderrScoop.manifest, // sonderr_change
            ).pipe(HttpClientRequest.setHeaders({ Accept: "application/json" })),
          )
          const data = yield* HttpClientResponse.schemaBodyJson(ScoopManifest)(response)
          return data.version
        }

        return yield* sonderrLatest(httpOk, SonderrNpm.path, InstallationChannel) // sonderr_change
      }, Effect.orDie),
      upgrade: Effect.fn("Installation.upgrade")(function* (m: Method, target: string) {
        let upgradeResult: { code: number; stdout: string; stderr: string } | undefined
        switch (m) {
          case "curl":
            upgradeResult = yield* upgradeCurl(target)
            break
          // sonderr_change start
          case "npm":
            upgradeResult = yield* run(["npm", "install", "-g", `${SonderrNpm.name}@${target}`])
            break
          case "yarn":
            upgradeResult = yield* run(["yarn", "global", "add", `${SonderrNpm.name}@${target}`])
            break
          // sonderr_change end
          case "pnpm":
            upgradeResult = yield* run(["pnpm", "install", "-g", `${SonderrNpm.name}@${target}`]) // sonderr_change
            break
          case "bun":
            upgradeResult = yield* run(["bun", "install", "-g", `${SonderrNpm.name}@${target}`]) // sonderr_change
            break
          case "brew": {
            const formula = yield* getBrewFormula()
            const env = { HOMEBREW_NO_AUTO_UPDATE: "1" }
            if (formula.includes("/")) {
              const tap = yield* run(["brew", "tap", SonderrBrew.tap], { env }) // sonderr_change
              if (tap.code !== 0) {
                upgradeResult = tap
                break
              }
              const repo = yield* text(["brew", "--repo", SonderrBrew.tap]) // sonderr_change
              const dir = repo.trim()
              if (dir) {
                const pull = yield* run(["git", "pull", "--ff-only"], {
                  cwd: dir,
                  env,
                })
                if (pull.code !== 0) {
                  upgradeResult = pull
                  break
                }
              }
            }
            upgradeResult = yield* run(["brew", "upgrade", formula], { env })
            break
          }
          case "choco":
            upgradeResult = yield* run(["choco", "upgrade", SonderrChoco.name, `--version=${target}`, "-y"]) // sonderr_change
            break
          case "scoop":
            upgradeResult = yield* run(["scoop", "install", `${SonderrScoop.name}@${target}`]) // sonderr_change
            break
          default:
            return yield* new UpgradeFailedError({
              stderr: `Unknown installation method: ${m}`,
            })
        }
        if (!upgradeResult || upgradeResult.code !== 0) {
          return yield* new UpgradeFailedError({
            stderr: upgradeFailure(m, upgradeResult),
          })
        }
        yield* Effect.logInfo("upgraded", {
          method: m,
          target,
          stdout: upgradeResult.stdout,
          stderr: upgradeResult.stderr,
        })
        yield* text([process.execPath, "--version"])
      }),
    }

    return Service.of(result)
  }),
)

export const node = LayerNode.make({ service: Service, layer: layer, deps: [httpClient, AppProcess.node] })

const { runPromise } = makeRuntime(Service, AppNodeBuilder.build(node))

export const latest = (...args: Parameters<Interface["latest"]>) => runPromise((s) => s.latest(...args))
export const method = () => runPromise((s) => s.method())
export const upgrade = (...args: Parameters<Interface["upgrade"]>) => runPromise((s) => s.upgrade(...args))

export * as Installation from "."
