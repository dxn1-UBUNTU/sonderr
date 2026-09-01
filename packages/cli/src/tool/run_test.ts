import * as path from "path"
import { Effect, Schema } from "effect"
import * as Tool from "./tool"
import { FSUtil } from "@sonderr/core/fs-util"
import { InstanceState } from "@/effect/instance-state"
import * as EncodedIO from "../sonderr/tool/encoded-io"
import DESCRIPTION from "./run_test.txt"

export const Parameters = Schema.Struct({
  testPattern: Schema.optional(Schema.String).annotate({
    description: "Pattern to match test files or test names (e.g. 'auth', '**/*.test.ts')",
  }),
  watch: Schema.optional(Schema.Boolean).annotate({
    description: "Run tests in watch mode (default false)",
  }),
  cwd: Schema.optional(Schema.String).annotate({
    description: "Working directory to run tests in (default: project root)",
  }),
})

export const RunTestTool = Tool.define(
  "run_test",
  Effect.gen(function* () {
    const afs = yield* FSUtil.Service

    return {
      description: DESCRIPTION,
      parameters: Parameters,
      execute: (params: Schema.Schema.Type<typeof Parameters>, ctx: Tool.Context) =>
        Effect.gen(function* () {
          const instance = yield* InstanceState.context
          const cwd = params.cwd ?? instance.directory

          const { execFile } = await import("child_process")
          const util = await import("util")
          const execFileAsync = util.promisify(execFile)

          const isBun = yield* Effect.tryPromise({
            try: async () => {
              const pre = await EncodedIO.read(afs, path.join(cwd, "bun.lockb"))
              return pre.exists
            },
            catch: () => false,
          })

          const isNode = yield* Effect.tryPromise({
            try: async () => {
              const pre = await EncodedIO.read(afs, path.join(cwd, "package.json"))
              return pre.exists
            },
            catch: () => false,
          })

          let cmd: string
          let args: string[]

          if (isBun) {
            cmd = "bun"
            args = ["test"]
            if (params.watch) args.push("--watch")
            if (params.testPattern) args.push(params.testPattern)
          } else if (isNode) {
            cmd = "npx"
            const pre = yield* EncodedIO.read(afs, path.join(cwd, "package.json"))
            const pkg = JSON.parse(pre.text)
            const hasVitest = pkg.devDependencies?.vitest || pkg.dependencies?.vitest
            const hasJest = pkg.devDependencies?.jest || pkg.dependencies?.jest

            if (hasVitest) {
              args = ["vitest", "run"]
              if (params.watch) args.push("--watch")
              if (params.testPattern) args.push("-t", params.testPattern)
            } else if (hasJest) {
              args = ["jest"]
              if (params.watch) args.push("--watch")
              if (params.testPattern) args.push("-t", params.testPattern)
            } else {
              args = ["test"]
              if (params.testPattern) args.push(params.testPattern)
            }
          } else {
            cmd = "python"
            args = ["-m", "pytest"]
            if (params.testPattern) args.push("-k", params.testPattern)
          }

          const timeout = 60000
          const { stdout, stderr, exitCode } = yield* Effect.tryPromise({
            try: async () => {
              try {
                const result = await execFileAsync(cmd, args, {
                  cwd,
                  timeout,
                  encoding: "utf-8",
                  maxBuffer: 10 * 1024 * 1024,
                })
                return { stdout: result.stdout, stderr: result.stderr, exitCode: 0 }
              } catch (err: any) {
                return {
                  stdout: err.stdout ?? "",
                  stderr: err.stderr ?? err.message ?? "",
                  exitCode: err.code ?? 1,
                }
              }
            },
            catch: (err) => new Error(`Test execution failed: ${err}`),
          })

          const output = [stdout, stderr].filter(Boolean).join("\n")
          const lines = output.split("\n")
          const summary = lines.slice(-10).join("\n")

          return {
            title: `Tests: ${params.testPattern ?? "all"} (exit ${exitCode})`,
            output: summary,
            metadata: {
              exitCode,
              pattern: params.testPattern,
              cwd,
            },
          }
        }).pipe(Effect.orDie),
    }
  }),
)