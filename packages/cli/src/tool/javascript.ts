import { Effect, Schema } from "effect"
import * as Tool from "./tool"
import { execFile } from "child_process"
import { promisify } from "util"
import { InstanceState } from "@/effect/instance-state"
import DESCRIPTION from "./javascript.txt"

const execFileAsync = promisify(execFile)

export const Parameters = Schema.Struct({
  code: Schema.String.annotate({
    description: "JavaScript/TypeScript code to execute. Use console.log/table/error for output.",
  }),
  args: Schema.optional(Schema.Array(Schema.String)).annotate({
    description: "Arguments passed to the script via process.argv (default: [])",
  }),
  cwd: Schema.optional(Schema.String).annotate({
    description: "Working directory (default: project root)",
  }),
  timeout: Schema.optional(Schema.Number).annotate({
    description: "Timeout in milliseconds (default: 30000)",
  }),
})

export const JavaScriptTool = Tool.define(
  "javascript",
  Effect.gen(function* () {
    return {
      description: DESCRIPTION,
      parameters: Parameters,
      execute: (params: Schema.Schema.Type<typeof Parameters>, ctx: Tool.Context) =>
        Effect.gen(function* () {
          const instance = yield* InstanceState.context
          const cwd = params.cwd ?? instance.directory
          const timeout = params.timeout ?? 30000

          const script = params.code
          const scriptArgs = params.args ?? []

          const fs = require("fs")
          const path = require("path")
          const tmpFile = path.join(cwd, `.sonderr-js-${Date.now()}.${Math.random().toString(36).slice(2, 8)}.js`)
          fs.writeFileSync(tmpFile, script)

          try {
            const cmd = process.execPath
            const args = [tmpFile, ...scriptArgs]

            const { stdout, stderr } = yield* Effect.tryPromise({
              try: async () => {
                try {
                  return await execFileAsync(cmd, args, {
                    cwd,
                    timeout,
                    encoding: "utf8",
                    maxBuffer: 10 * 1024 * 1024,
                  })
                } catch (error: any) {
                  return {
                    stdout: error.stdout ?? "",
                    stderr: error.stderr ?? error.message ?? "",
                    exitCode: error.code ?? 1,
                  }
                }
              },
              catch: (error) =>
                new Error(`JavaScript execution failed: ${error instanceof Error ? error.message : String(error)}`),
            })

            const output = [stdout, stderr].filter(Boolean).join("\n").trim()
            if (!output) return { title: "JavaScript executed", output: "(no output)", metadata: {} }

            return { title: "JavaScript executed", output, metadata: { tmpFile } }
          } finally {
            try {
              fs.unlinkSync(tmpFile)
            } catch {
              // best effort cleanup
            }
          }
        }).pipe(Effect.orDie),
    }
  }),
)
