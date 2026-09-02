import * as path from "path"
import { Effect, Schema } from "effect"
import * as Tool from "./tool"
import { InstanceState } from "@/effect/instance-state"
import { assertExternalDirectoryEffect } from "./external-directory"
import { FSUtil } from "@sonderr/core/fs-util"
import { assertMutablePath } from "../sonderr/agent-manager/protection"
import * as EncodedIO from "../sonderr/tool/encoded-io"
import DESCRIPTION from "./validate.txt"

export const Parameters = Schema.Struct({
  filePath: Schema.String.annotate({ description: "The absolute path to the file to validate" }),
  schema: Schema.optional(Schema.String).annotate({
    description: "JSON Schema to validate against (as JSON string). If not provided, validates syntax only.",
  }),
  strict: Schema.optional(Schema.Boolean).annotate({
    description: "Enable strict validation (default: false)",
  }),
})

export const ValidateTool = Tool.define(
  "validate",
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
          assertMutablePath(filePath)
          yield* assertExternalDirectoryEffect(ctx, filePath)

          const pre = yield* EncodedIO.read(afs, filePath)
          const content = pre.text
          const ext = path.extname(filePath).toLowerCase()

          const result: Record<string, unknown> = { file: filePath, format: ext }

          if (ext === ".json") {
            try {
              const parsed = JSON.parse(content)
              result.valid = true
              result.type = getType(parsed)
              if (params.schema) {
                const schema = JSON.parse(params.schema)
                result.schemaValidation = validateAgainstSchema(parsed, schema, params.strict ?? false)
              }
            } catch (e) {
              result.valid = false
              result.error = (e as Error).message
            }
          } else if (ext === ".yaml" || ext === ".yml") {
            try {
              const yaml = require("yaml")
              const parsed = yaml.parse(content)
              result.valid = true
              result.type = getType(parsed)
            } catch (e) {
              result.valid = false
              result.error = (e as Error).message
            }
          } else if (ext === ".toml") {
            try {
              const toml = require("@iarna/toml")
              const parsed = toml.parse(content)
              result.valid = true
              result.type = getType(parsed)
            } catch (e) {
              result.valid = false
              result.error = (e as Error).message
            }
          } else if (ext === ".ts" || ext === ".tsx") {
            try {
              const ts = require("typescript")
              const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true)
              result.valid = true
              result.diagnostics = sourceFile.parseDiagnostics?.map((d: any) => ({
                message: ts.flattenDiagnosticMessageText(d.messageText, "\n"),
                line: sourceFile.getLineAndCharacterOfPosition(d.start!).line + 1,
              })) ?? []
            } catch (e) {
              result.valid = false
              result.error = (e as Error).message
            }
          } else {
            result.valid = true
            result.note = "No validation available for this file type"
          }

          return {
            title: `Validate: ${path.basename(filePath)}`,
            output: JSON.stringify(result, null, 2),
            metadata: { file: filePath, valid: result.valid === true },
          }
        }).pipe(Effect.orDie),
    }
  }),
)

function getType(value: unknown): string {
  if (value === null) return "null"
  if (Array.isArray(value)) return "array"
  return typeof value
}

function validateAgainstSchema(
  data: unknown,
  schema: Record<string, unknown>,
  strict: boolean
): Record<string, unknown> {
  const errors: string[] = []

  if (schema.type === "object" && typeof data === "object" && data !== null) {
    const obj = data as Record<string, unknown>
    const properties = schema.properties as Record<string, unknown> | undefined
    const required = schema.required as string[] | undefined

    if (required) {
      for (const field of required) {
        if (!(field in obj)) {
          errors.push(`Missing required field: ${field}`)
        }
      }
    }

    if (properties) {
      for (const [key, value] of Object.entries(obj)) {
        const propSchema = properties[key] as Record<string, unknown> | undefined
        if (propSchema) {
          if (propSchema.type === "string" && typeof value !== "string") {
            errors.push(`Field '${key}' should be string, got ${typeof value}`)
          } else if (propSchema.type === "number" && typeof value !== "number") {
            errors.push(`Field '${key}' should be number, got ${typeof value}`)
          } else if (propSchema.type === "boolean" && typeof value !== "boolean") {
            errors.push(`Field '${key}' should be boolean, got ${typeof value}`)
          } else if (propSchema.type === "array" && !Array.isArray(value)) {
            errors.push(`Field '${key}' should be array, got ${typeof value}`)
          }
        } else if (strict) {
          errors.push(`Unknown field: ${key}`)
        }
      }
    }
  }

  return { valid: errors.length === 0, errors }
}