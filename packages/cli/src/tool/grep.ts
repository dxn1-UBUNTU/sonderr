import path from "path"
import { Effect, Schema } from "effect"
import { InstanceState } from "@/effect/instance-state"
import { FSUtil } from "@sonderr/core/fs-util"
import { Ripgrep } from "@sonderr/core/ripgrep"
import * as SonderrGrep from "@/sonderr/tool/grep-signal-controls" // sonderr_change
import { assertExternalDirectoryEffect } from "./external-directory"
import DESCRIPTION from "./grep.txt"
import * as Tool from "./tool"

export const Parameters = Schema.Struct({
  pattern: Schema.String.annotate({ description: "Pattern to search for in file contents (regex by default)" }), // sonderr_change
  path: Schema.optional(Schema.String).annotate({
    description: "The directory to search in. Defaults to the current working directory.",
  }),
  include: Schema.optional(Schema.String).annotate({
    description: 'File pattern to include in the search (e.g. "*.js", "*.{ts,tsx}")',
  }),
  ...SonderrGrep.fields, // sonderr_change
})

export const GrepTool = Tool.define(
  "grep",
  Effect.gen(function* () {
    const fs = yield* FSUtil.Service
    const ripgrep = yield* Ripgrep.Service
    return {
      description: SonderrGrep.describe(DESCRIPTION), // sonderr_change
      parameters: Parameters,
      execute: (params: Schema.Schema.Type<typeof Parameters>, ctx: Tool.Context) =>
        Effect.gen(function* () {
          const limit = params.limit ?? SonderrGrep.DEFAULT_LIMIT // sonderr_change
          const context = params.context ?? 0 // sonderr_change
          const empty = {
            title: params.pattern,
            metadata: { matches: 0, truncated: false },
            output: "No files found",
          }
          if (!params.pattern) {
            throw new Error("pattern is required")
          }

          yield* ctx.ask({
            permission: "grep",
            patterns: [params.pattern],
            always: ["*"],
            metadata: {
              pattern: params.pattern,
              path: params.path,
              include: params.include,
              ...SonderrGrep.metadata(params, limit, context), // sonderr_change
            },
          })

          const ins = yield* InstanceState.context
          const requested = path.isAbsolute(params.path ?? ins.directory)
            ? (params.path ?? ins.directory)
            : path.join(ins.directory, params.path ?? ".")
          const requestedInfo = yield* fs.stat(requested).pipe(Effect.catch(() => Effect.succeed(undefined)))
          yield* assertExternalDirectoryEffect(ctx, requested, {
            bypass: false,
            kind: requestedInfo?.type === "Directory" ? "directory" : "file",
          })

          const search = FSUtil.resolve(requested)
          const info = yield* fs.stat(search).pipe(Effect.catch(() => Effect.succeed(undefined)))
          if (!info || (info.type !== "File" && info.type !== "Directory")) return empty // sonderr_change
          const cwd = info?.type === "Directory" ? search : path.dirname(search)
          const result = yield* ripgrep.grep({
            cwd,
            file: info?.type === "File" ? path.basename(search) : undefined, // sonderr_change - constrain exact-file searches
            pattern: params.pattern,
            include: params.include,
            ...SonderrGrep.options(params, limit, context), // sonderr_change
            signal: ctx.abort, // sonderr_change - stop ripgrep when the tool call is cancelled
          })
          // sonderr_change start
          const matches = result.items
          if (matches.length === 0) return empty
          // sonderr_change end

          const rows = matches.map((item) => ({
            // sonderr_change
            path: path.resolve(
              requestedInfo?.type === "Directory" ? requested : path.dirname(requested),
              item.entry.path,
            ),
            line: item.line,
            text: item.text,
            context: item.context, // sonderr_change
            textTruncated: item.textTruncated, // sonderr_change
          }))

          const truncated = result.truncated // sonderr_change
          const final = rows
          if (final.length === 0) return empty

          const total = rows.filter((row) => !row.context).length // sonderr_change
          const hasMore = truncated // sonderr_change
          const output = [`Found ${total} matches${hasMore ? " (more matches available)" : ""}`]

          let current = ""
          for (const match of final) {
            if (current !== match.path) {
              if (current !== "") output.push("")
              current = match.path
              output.push(`${match.path}:`)
            }
            output.push(SonderrGrep.line(match, context)) // sonderr_change
          }

          if (truncated) {
            output.push("")
            output.push(SonderrGrep.limitNotice(limit)) // sonderr_change
          }
          output.push(...SonderrGrep.notices(rows)) // sonderr_change
          if (result.partial) output.push("", "(Some paths were inaccessible.)") // sonderr_change

          return {
            title: params.pattern,
            metadata: {
              matches: total,
              truncated,
            },
            output: output.join("\n"),
          }
        }).pipe(Effect.orDie),
    }
  }),
)
