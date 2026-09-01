import * as path from "path"
import { Effect, Schema } from "effect"
import * as Tool from "./tool"
import { FileSystem } from "@sonderr/core/filesystem"
import { Watcher } from "@sonderr/core/filesystem/watcher"
import { EventV2Bridge } from "@/event-v2-bridge"
import { InstanceState } from "@/effect/instance-state"
import { assertExternalDirectoryEffect } from "./external-directory"
import { FSUtil } from "@sonderr/core/fs-util"
import { assertMutablePath } from "../sonderr/agent-manager/protection"
import * as EncodedIO from "../sonderr/tool/encoded-io"
import * as Encoding from "../sonderr/encoding"
import DESCRIPTION from "./diff.txt"

export const Parameters = Schema.Struct({
  filePath: Schema.String.annotate({ description: "The absolute path to the file to diff" }),
  compareAgainst: Schema.optional(
    Schema.Union([Schema.Literal("HEAD"), Schema.Literal("HEAD~1"), Schema.Literal("staged"), Schema.Literal("working")]),
  ).annotate({
    description: "What to compare against: 'HEAD' (last commit), 'HEAD~1' (previous commit), 'staged' (index), 'working' (working tree). Default: 'HEAD'",
  }),
  contextLines: Schema.optional(Schema.Number).annotate({
    description: "Number of context lines around changes (default: 3)",
  }),
})

export const DiffTool = Tool.define(
  "diff",
  Effect.gen(function* () {
    const afs = yield* FSUtil.Service
    const events = yield* EventV2Bridge.Service

    return {
      description: DESCRIPTION,
      parameters: Parameters,
      execute: (params: Schema.Schema.Type<typeof Parameters>, ctx: Tool.Context) =>
        Effect.gen(function* () {
          const instance = yield* InstanceState.context
          const filePath = path.isAbsolute(params.filePath)
            ? params.filePath
            : path.join(instance.directory, params.filePath)
          assertMutablePath(filePath)
          yield* assertExternalDirectoryEffect(ctx, filePath)

          const compareAgainst = params.compareAgainst ?? "HEAD"
          const contextLines = params.contextLines ?? 3

          const pre = yield* EncodedIO.read(afs, filePath)
          const currentContent = pre.text

          let oldContent = ""
          let oldLabel = ""

          if (compareAgainst === "working") {
            oldContent = currentContent
            oldLabel = "working tree"
          } else {
            const gitArgs = compareAgainst === "staged"
              ? ["show", `::${filePath}`]
              : ["show", `${compareAgainst}:${filePath}`]

            const gitResult = yield* Effect.tryPromise({
              try: async () => {
                const { execFile } = await import("child_process")
                const util = await import("util")
                const execFileAsync = util.promisify(execFile)
                return execFileAsync("git", gitArgs, {
                  cwd: instance.directory,
                  encoding: "utf-8",
                })
              },
              catch: () => new Error(`File not found in ${compareAgainst}`),
            })

            oldContent = gitResult.stdout
            oldLabel = compareAgainst
          }

          const diff = yield* Effect.tryPromise({
            try: () => {
              const { createTwoFilesPatch } = require("diff")
              return createTwoFilesPatch(
                `${oldLabel}/${path.basename(filePath)}`,
                `current/${path.basename(filePath)}`,
                oldContent,
                currentContent,
                "",
                "",
                { context: contextLines },
              )
            },
            catch: (err) => new Error(`Failed to generate diff: ${err}`),
          })

          const lines = diff.split("\n")
          const added = lines.filter((l) => l.startsWith("+") && !l.startsWith("+++")).length
          const removed = lines.filter((l) => l.startsWith("-") && !l.startsWith("---")).length

          return {
            title: `Diff: ${path.basename(filePath)} vs ${oldLabel}`,
            output: diff,
            metadata: {
              file: filePath,
              compareAgainst: oldLabel,
              added,
              removed,
            },
          }
        }).pipe(Effect.orDie),
    }
  }),
)