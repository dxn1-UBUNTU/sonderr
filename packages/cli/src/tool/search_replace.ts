import * as path from "path"
import { Effect, Schema } from "effect"
import * as Tool from "./tool"
import { glob } from "glob"
import { FSUtil } from "@sonderr/core/fs-util"
import { InstanceState } from "@/effect/instance-state"
import * as EncodedIO from "../sonderr/tool/encoded-io"
import * as Encoding from "../sonderr/encoding"
import DESCRIPTION from "./search_replace.txt"

export const Parameters = Schema.Struct({
  pattern: Schema.String.annotate({ description: "The literal string pattern to search for" }),
  replacement: Schema.String.annotate({ description: "The replacement string" }),
  glob: Schema.optional(Schema.String).annotate({
    description: "Glob pattern to limit which files are searched (e.g. '**/*.ts', 'src/**/*.js'). Default: all files",
  }),
  replaceAll: Schema.optional(Schema.Boolean).annotate({
    description: "Replace all occurrences in each file (default true)",
  }),
  dryRun: Schema.optional(Schema.Boolean).annotate({
    description: "Preview changes without applying them (default true)",
  }),
})

export const SearchReplaceTool = Tool.define(
  "search_replace",
  Effect.gen(function* () {
    const afs = yield* FSUtil.Service

    return {
      description: DESCRIPTION,
      parameters: Parameters,
      execute: (params: Schema.Schema.Type<typeof Parameters>, ctx: Tool.Context) =>
        Effect.gen(function* () {
          const instance = yield* InstanceState.context
          const root = instance.directory

          const files = yield* Effect.tryPromise({
            try: () => glob(params.glob ?? "**/*", {
              cwd: root,
              nodir: true,
              ignore: ["node_modules/**", ".git/**", "dist/**", "build/**"],
            }),
            catch: (err) => new Error(`Glob failed: ${err}`),
          })

          const results: Array<{ file: string; occurrences: number; preview: string }> = []

          for (const relPath of files) {
            const absPath = path.join(root, relPath)
            const pre = yield* EncodedIO.read(afs, absPath).pipe(Effect.catch(() => Effect.undefined))
            if (!pre) continue

            const content = pre.text
            if (!content.includes(params.pattern)) continue

            const occurrences = content.split(params.pattern).length - 1
            const newContent = params.replaceAll === false
              ? content.replace(params.pattern, params.replacement)
              : content.split(params.pattern).join(params.replacement)

            const lines = newContent.split("\n").slice(0, 50).join("\n")

            if (params.dryRun !== false) {
              results.push({ file: relPath, occurrences, preview: lines.slice(0, 500) })
            } else {
              yield* EncodedIO.write(afs, absPath, newContent, Encoding.DEFAULT)
              results.push({ file: relPath, occurrences, preview: "applied" })
            }
          }

          const totalFiles = results.length
          const totalOccurrences = results.reduce((sum, r) => sum + r.occurrences, 0)

          const output = results
            .slice(0, 20)
            .map((r) => `${r.file}: ${r.occurrences} occurrences\n${r.preview}`)
            .join("\n\n")

          return {
            title: `Search/Replace: ${totalFiles} files, ${totalOccurrences} occurrences`,
            output: `${output}\n\n${totalFiles > 20 ? `... and ${totalFiles - 20} more files` : ""}\n\nMode: ${params.dryRun !== false ? "DRY RUN (no changes applied)" : "APPLIED"}`,
            metadata: {
              files: totalFiles,
              occurrences: totalOccurrences,
              dryRun: params.dryRun !== false,
            },
          }
        }).pipe(Effect.orDie),
    }
  }),
)