import * as path from "path"
import { Effect, Schema } from "effect"
import * as Tool from "./tool"
import { FSUtil } from "@sonderr/core/fs-util"
import { InstanceState } from "@/effect/instance-state"
import * as EncodedIO from "../sonderr/tool/encoded-io"
import DESCRIPTION from "./json_path.txt"

export const Parameters = Schema.Struct({
  filePath: Schema.String.annotate({ description: "The absolute path to the JSON file to query" }),
  query: Schema.String.annotate({
    description: "JSONPath expression (e.g. '$.items[*].name', '$.users[?(@.age > 18)]', '$..price')",
  }),
  compact: Schema.optional(Schema.Boolean).annotate({
    description: "Output compact JSON (default false)",
  }),
})

export const JsonPathTool = Tool.define(
  "json_path",
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
          const json = JSON.parse(pre.text)

          const result = yield* Effect.tryPromise({
            try: async () => {
              const { JSONPath } = await import("jsonpath-plus").catch(() => {
                throw new Error("jsonpath-plus not installed. Run: bun add jsonpath-plus")
              })
              return JSONPath({ path: params.query, json })
            },
            catch: (err) => new Error(`JSONPath query failed: ${err}`),
          })

          const output = JSON.stringify(result, null, params.compact ? 0 : 2)

          return {
            title: `JSONPath: ${params.query}`,
            output: output,
            metadata: {
              file: filePath,
              query: params.query,
              results: Array.isArray(result) ? result.length : 1,
            },
          }
        }).pipe(Effect.orDie),
    }
  }),
)