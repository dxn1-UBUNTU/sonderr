import * as path from "path"
import { Effect, Schema } from "effect"
import * as Tool from "./tool"
import { glob } from "glob"
import { FSUtil } from "@sonderr/core/fs-util"
import { InstanceState } from "@/effect/instance-state"
import * as EncodedIO from "../sonderr/tool/encoded-io"
import * as Encoding from "../sonderr/encoding"
import DESCRIPTION from "./notes.txt"

const NOTES_DIR = ".sonderr/notes"

export const Parameters = Schema.Struct({
  action: Schema.Union([
    Schema.Literal("list"),
    Schema.Literal("read"),
    Schema.Literal("write"),
    Schema.Literal("delete"),
  ]).annotate({ description: "Action: 'list' (show all notes), 'read' (read a note), 'write' (create/update), 'delete'" }),
  name: Schema.optional(Schema.String).annotate({
    description: "Note name (without extension). Required for read/write/delete.",
  }),
  content: Schema.optional(Schema.String).annotate({
    description: "Note content. Required for write action.",
  }),
  append: Schema.optional(Schema.Boolean).annotate({
    description: "Append to existing note instead of overwriting (default false)",
  }),
})

export const NotesTool = Tool.define(
  "notes",
  Effect.gen(function* () {
    const afs = yield* FSUtil.Service

    return {
      description: DESCRIPTION,
      parameters: Parameters,
      execute: (params: Schema.Schema.Type<typeof Parameters>, ctx: Tool.Context) =>
        Effect.gen(function* () {
          const instance = yield* InstanceState.context
          const notesDir = path.join(instance.directory, NOTES_DIR)

          if (params.action === "list") {
            const files = yield* Effect.tryPromise({
              try: async () => glob.sync("*.md", { cwd: notesDir, nodir: true }),
              catch: () => [] as string[],
            })

            if (files.length === 0) {
              return {
                title: "Notes: empty",
                output: "No notes found. Use notes(action: 'write', name: 'my-note', content: '...') to create one.",
                metadata: { count: 0 },
              }
            }

            const items = yield* Effect.all(
              files.map((f) =>
                Effect.gen(function* () {
                  const pre = yield* EncodedIO.read(afs, path.join(notesDir, f))
                  const firstLine = pre.text.split("\n")[0]?.slice(0, 80) ?? ""
                  return `${f}: ${firstLine}`
                }),
              ),
            )

            return {
              title: `Notes: ${files.length} notes`,
              output: items.join("\n"),
              metadata: { count: files.length },
            }
          }

          if (!params.name) {
            yield* Effect.fail(new Error("Note name is required for read/write/delete actions"))
          }

          const notePath = path.join(notesDir, `${params.name}.md`)

          if (params.action === "read") {
            const pre = yield* EncodedIO.read(afs, notePath)
            if (!pre.exists) {
              yield* Effect.fail(new Error(`Note not found: ${params.name}`))
            }
            return {
              title: `Note: ${params.name}`,
              output: pre.text,
              metadata: { name: params.name },
            }
          }

          if (params.action === "write") {
            if (!params.content) {
              yield* Effect.fail(new Error("Content is required for write action"))
            }

            const exists = yield* EncodedIO.read(afs, notePath).pipe(
              Effect.map((p) => p.exists),
              Effect.catch(() => Effect.succeed(false)),
            )

            if (exists && params.append) {
              const existing = yield* EncodedIO.read(afs, notePath)
              const newContent = existing.text + "\n" + params.content
              yield* EncodedIO.write(afs, notePath, newContent, Encoding.DEFAULT)
            } else {
              yield* EncodedIO.write(afs, notePath, params.content, Encoding.DEFAULT)
            }

            return {
              title: `Note ${exists && params.append ? "updated" : "created"}: ${params.name}`,
              output: `Note saved to ${notePath}`,
              metadata: { name: params.name, appended: params.append && exists },
            }
          }

          if (params.action === "delete") {
            const exists = yield* EncodedIO.read(afs, notePath).pipe(
              Effect.map((p) => p.exists),
              Effect.catch(() => Effect.succeed(false)),
            )
            if (!exists) {
              yield* Effect.fail(new Error(`Note not found: ${params.name}`))
            }
            yield* afs.remove(notePath)
            return {
              title: `Note deleted: ${params.name}`,
              output: `Note ${params.name} deleted`,
              metadata: { name: params.name },
            }
          }

          yield* Effect.fail(new Error(`Unknown action: ${params.action}`))
        }).pipe(Effect.orDie),
    }
  }),
)