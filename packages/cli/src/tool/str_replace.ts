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
import DESCRIPTION from "./str_replace.txt"

export const Parameters = Schema.Struct({
  filePath: Schema.String.annotate({ description: "The absolute path to the file to modify" }),
  oldString: Schema.String.annotate({ description: "The text to replace (literal string, not regex)" }),
  newString: Schema.String.annotate({ description: "The text to replace it with" }),
  replaceAll: Schema.optional(Schema.Boolean).annotate({
    description: "Replace all occurrences (default false)",
  }),
})

export const StrReplaceTool = Tool.define(
  "str_replace",
  Effect.gen(function* () {
    const afs = yield* FSUtil.Service
    const events = yield* EventV2Bridge.Service

    return {
      description: DESCRIPTION,
      parameters: Parameters,
      execute: (params: Schema.Schema.Type<typeof Parameters>, ctx: Tool.Context) =>
        Effect.gen(function* () {
          if (!params.filePath) {
            throw new Error("filePath is required")
          }
          if (params.oldString === params.newString) {
            throw new Error("No changes to apply: oldString and newString are identical.")
          }

          const instance = yield* InstanceState.context
          const filePath = path.isAbsolute(params.filePath)
            ? params.filePath
            : path.join(instance.directory, params.filePath)
          assertMutablePath(filePath)
          yield* assertExternalDirectoryEffect(ctx, filePath)

          const pre = yield* EncodedIO.read(afs, filePath)
          const content = pre.text

          if (!content.includes(params.oldString)) {
            throw new Error(`String not found in file: "${params.oldString.slice(0, 80)}..."`)
          }

          const occurrences = content.split(params.oldString).length - 1
          let newContent: string

          if (params.replaceAll) {
            newContent = content.split(params.oldString).join(params.newString)
          } else {
            if (occurrences > 1) {
              throw new Error(
                `Found ${occurrences} occurrences. Use replaceAll: true to replace all, or provide more surrounding text to make the match unique.`,
              )
            }
            newContent = content.replace(params.oldString, params.newString)
          }

          const desiredBom = pre.encoding === "utf-8-bom"
          yield* EncodedIO.write(afs, filePath, newContent, Encoding.DEFAULT)
          yield* events.publish(FileSystem.Event.Edited, { file: filePath })
          yield* events.publish(Watcher.Event.Updated, { file: filePath, event: "change" })

          const replacementCount = params.replaceAll ? occurrences : 1
          return {
            title: `Replaced ${replacementCount} occurrence${replacementCount > 1 ? "s" : ""}`,
            output: `File: ${filePath}\nOccurrences replaced: ${replacementCount}`,
            metadata: {
              file: filePath,
              occurrences: replacementCount,
            },
          }
        }).pipe(Effect.orDie),
    }
  }),
)