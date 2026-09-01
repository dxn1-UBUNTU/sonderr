import * as path from "path"
import { Effect, Schema } from "effect"
import * as Tool from "./tool"
import { FSUtil } from "@sonderr/core/fs-util"
import { InstanceState } from "@/effect/instance-state"
import * as EncodedIO from "../sonderr/tool/encoded-io"
import * as Encoding from "../sonderr/encoding"
import DESCRIPTION from "./format.txt"

export const Parameters = Schema.Struct({
  filePath: Schema.String.annotate({ description: "The absolute path to the file to format" }),
  formatter: Schema.optional(
    Schema.Union([
      Schema.Literal("auto"),
      Schema.Literal("prettier"),
      Schema.Literal("biome"),
      Schema.Literal("rustfmt"),
      Schema.Literal("gofmt"),
      Schema.Literal("black"),
    ]),
  ).annotate({
    description: "Formatter to use: 'auto' (detect from project), 'prettier', 'biome', 'rustfmt', 'gofmt', 'black'. Default: 'auto'",
  }),
})

export const FormatTool = Tool.define(
  "format",
  Effect.gen(function* () {
    const afs = yield* FSUtil.Service

    return {
      description: DESCRIPTION,
      parameters: Parameters,
      execute: (params: Schema.Schema.Type<typeof Parameters>, ctx: Tool.Context) =>
        Effect.gen(function* () {
          const instance = yield* InstanceState.context
          const filePath = path.isAbsolute(params.filePath)
            ? params.filePath
            : path.join(instance.directory, params.filePath)

          const pre = yield* EncodedIO.read(afs, filePath)
          const original = pre.text
          const ext = path.extname(filePath).toLowerCase()

          let formatter = params.formatter ?? "auto"

          if (formatter === "auto") {
            if ([".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".css", ".scss", ".html"].includes(ext)) {
              const hasPrettier = yield* Effect.tryPromise({
                try: async () => {
                  const pkg = await EncodedIO.read(afs, path.join(instance.directory, "package.json"))
                  if (!pkg.exists) return false
                  const json = JSON.parse(pkg.text)
                  return !!(json.devDependencies?.prettier || json.dependencies?.prettier ||
                    await EncodedIO.read(afs, path.join(instance.directory, ".prettierrc")).then(r => r.exists).catch(() => false))
                },
                catch: () => false,
              })
              const hasBiome = yield* Effect.tryPromise({
                try: async () => {
                  const pkg = await EncodedIO.read(afs, path.join(instance.directory, "package.json"))
                  if (!pkg.exists) return false
                  const json = JSON.parse(pkg.text)
                  return !!(json.devDependencies?.biome || json.dependencies?.biome ||
                    await EncodedIO.read(afs, path.join(instance.directory, "biome.json")).then(r => r.exists).catch(() => false))
                },
                catch: () => false,
              })
              formatter = hasBiome ? "biome" : hasPrettier ? "prettier" : "prettier"
            } else if ([".rs"].includes(ext)) {
              formatter = "rustfmt"
            } else if ([".go"].includes(ext)) {
              formatter = "gofmt"
            } else if ([".py"].includes(ext)) {
              formatter = "black"
            }
          }

          const { execFile } = await import("child_process")
          const util = await import("util")
          const execFileAsync = util.promisify(execFile)

          let cmd: string
          let args: string[]

          switch (formatter) {
            case "prettier":
              cmd = "npx"
              args = ["prettier", "--write", filePath]
              break
            case "biome":
              cmd = "npx"
              args = ["biome", "format", "--write", filePath]
              break
            case "rustfmt":
              cmd = "rustfmt"
              args = [filePath]
              break
            case "gofmt":
              cmd = "gofmt"
              args = ["-w", filePath]
              break
            case "black":
              cmd = "python"
              args = ["-m", "black", filePath]
              break
            default:
              cmd = "npx"
              args = ["prettier", "--write", filePath]
          }

          yield* Effect.tryPromise({
            try: async () => {
              await execFileAsync(cmd, args, { cwd: instance.directory, timeout: 30000 })
            },
            catch: (err: any) => new Error(`Formatter ${formatter} failed: ${err.message}`),
          })

          const post = yield* EncodedIO.read(afs, filePath)
          const formatted = post.text

          const { createTwoFilesPatch } = require("diff")
          const diff = createTwoFilesPatch(
            path.basename(filePath),
            path.basename(filePath),
            original,
            formatted,
            "",
            "",
            { context: 3 },
          )

          const lines = diff.split("\n")
          const changed = lines.filter((l) => (l.startsWith("+") || l.startsWith("-")) && !l.startsWith("---") && !l.startsWith("+++")).length

          return {
            title: `Formatted: ${path.basename(filePath)} (${formatter})`,
            output: changed > 0 ? `${changed} lines changed\n\n${diff}` : "No changes needed — already formatted",
            metadata: {
              file: filePath,
              formatter,
              linesChanged: changed,
            },
          }
        }).pipe(Effect.orDie),
    }
  }),
)