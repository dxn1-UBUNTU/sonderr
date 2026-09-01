import * as path from "path"
import { Effect, Schema } from "effect"
import * as Tool from "./tool"
import { FSUtil } from "@sonderr/core/fs-util"
import { InstanceState } from "@/effect/instance-state"
import * as EncodedIO from "../sonderr/tool/encoded-io"
import DESCRIPTION from "./file_outline.txt"

export const Parameters = Schema.Struct({
  filePath: Schema.String.annotate({ description: "The absolute path to the file to outline" }),
  maxDepth: Schema.optional(Schema.Number).annotate({
    description: "Maximum depth of nested symbols (default: 2)",
  }),
})

interface Symbol {
  name: string
  kind: string
  line: number
  endLine?: number
  children?: Symbol[]
}

export const FileOutlineTool = Tool.define(
  "file_outline",
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
          const content = pre.text
          const lines = content.split("\n")
          const ext = path.extname(filePath).toLowerCase()

          const symbols = parseSymbols(lines, ext, params.maxDepth ?? 2)

          const formatSymbol = (sym: Symbol, indent: number = 0): string => {
            const prefix = "  ".repeat(indent)
            const line = sym.endLine ? `L${sym.line}-${sym.endLine}` : `L${sym.line}`
            let result = `${prefix}${sym.kind}: ${sym.name} (${line})`
            if (sym.children) {
              result += "\n" + sym.children.map((c) => formatSymbol(c, indent + 1)).join("\n")
            }
            return result
          }

          const output = symbols.map((s) => formatSymbol(s)).join("\n")

          return {
            title: `Outline: ${path.basename(filePath)}`,
            output: output || "No symbols found",
            metadata: {
              file: filePath,
              symbolCount: symbols.length,
            },
          }
        }).pipe(Effect.orDie),
    }
  }),
)

function parseSymbols(lines: string[], ext: string, maxDepth: number): Symbol[] {
  const symbols: Symbol[] = []

  if ([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"].includes(ext)) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      const funcMatch = line.match(/^(?:export\s+)?(?:async\s+)?function\s+(\w+)/)
      if (funcMatch) {
        symbols.push({ name: funcMatch[1], kind: "function", line: i + 1 })
        continue
      }

      const arrowMatch = line.match(/^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(?.*\)?\s*=>/)
      if (arrowMatch) {
        symbols.push({ name: arrowMatch[1], kind: "arrow", line: i + 1 })
        continue
      }

      const classMatch = line.match(/^(?:export\s+)?class\s+(\w+)/)
      if (classMatch) {
        symbols.push({ name: classMatch[1], kind: "class", line: i + 1 })
        continue
      }

      const interfaceMatch = line.match(/^(?:export\s+)?interface\s+(\w+)/)
      if (interfaceMatch) {
        symbols.push({ name: interfaceMatch[1], kind: "interface", line: i + 1 })
        continue
      }

      const typeMatch = line.match(/^(?:export\s+)?type\s+(\w+)/)
      if (typeMatch) {
        symbols.push({ name: typeMatch[1], kind: "type", line: i + 1 })
        continue
      }

      const importMatch = line.match(/^import\s+.*from\s+['"]([^'"]+)['"]/)
      if (importMatch) {
        symbols.push({ name: importMatch[1], kind: "import", line: i + 1 })
        continue
      }

      const exportMatch = line.match(/^export\s+(?:default\s+)?(\w+)/)
      if (exportMatch) {
        symbols.push({ name: exportMatch[1], kind: "export", line: i + 1 })
      }
    }
  } else if ([".py"].includes(ext)) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      const funcMatch = line.match(/^def\s+(\w+)/)
      if (funcMatch) {
        symbols.push({ name: funcMatch[1], kind: "function", line: i + 1 })
        continue
      }

      const classMatch = line.match(/^class\s+(\w+)/)
      if (classMatch) {
        symbols.push({ name: classMatch[1], kind: "class", line: i + 1 })
        continue
      }

      const importMatch = line.match(/^(?:import|from)\s+(\w+)/)
      if (importMatch) {
        symbols.push({ name: importMatch[1], kind: "import", line: i + 1 })
      }
    }
  } else if ([".go"].includes(ext)) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      const funcMatch = line.match(/^func\s+(\w+)/)
      if (funcMatch) {
        symbols.push({ name: funcMatch[1], kind: "function", line: i + 1 })
        continue
      }

      const structMatch = line.match(/^type\s+(\w+)\s+struct/)
      if (structMatch) {
        symbols.push({ name: structMatch[1], kind: "struct", line: i + 1 })
        continue
      }

      const importMatch = line.match(/^import\s+"([^"]+)"/)
      if (importMatch) {
        symbols.push({ name: importMatch[1], kind: "import", line: i + 1 })
      }
    }
  } else {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (line.startsWith("//") || line.startsWith("#") || line.startsWith("/*")) continue
      const headerMatch = line.match(/^#+\s+(.+)$/)
      if (headerMatch) {
        symbols.push({ name: headerMatch[1], kind: "heading", line: i + 1 })
      }
    }
  }

  return symbols
}