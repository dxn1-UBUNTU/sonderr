import * as path from "path"
import { Effect, Schema } from "effect"
import * as Tool from "./tool"
import { EventV2Bridge } from "@/event-v2-bridge"
import { InstanceState } from "@/effect/instance-state"
import { assertExternalDirectoryEffect } from "./external-directory"
import { FSUtil } from "@sonderr/core/fs-util"
import { assertMutablePath } from "../sonderr/agent-manager/protection"
import * as EncodedIO from "../sonderr/tool/encoded-io"
import DESCRIPTION from "./code-analysis.txt"

export const Parameters = Schema.Struct({
  filePath: Schema.String.annotate({ description: "The absolute path to the file to analyze" }),
  analysisType: Schema.optional(
    Schema.Union([
      Schema.Literal("complexity"),
      Schema.Literal("dependencies"),
      Schema.Literal("symbols"),
      Schema.Literal("all"),
    ]),
  ).annotate({
    description: "Type of analysis: 'complexity', 'dependencies', 'symbols', or 'all'. Default: 'all'",
  }),
})

export const CodeAnalysisTool = Tool.define(
  "code_analysis",
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

          const analysisType = params.analysisType ?? "all"
          const pre = yield* EncodedIO.read(afs, filePath)
          const content = pre.text
          const lines = content.split("\n")

          const result: Record<string, unknown> = {}

          if (analysisType === "complexity" || analysisType === "all") {
            result.complexity = analyzeComplexity(content, lines)
          }

          if (analysisType === "dependencies" || analysisType === "all") {
            result.dependencies = analyzeDependencies(content)
          }

          if (analysisType === "symbols" || analysisType === "all") {
            result.symbols = analyzeSymbols(content, lines)
          }

          return {
            title: `Analysis: ${path.basename(filePath)}`,
            output: JSON.stringify(result, null, 2),
            metadata: {
              file: filePath,
              analysisType,
              lineCount: lines.length,
            },
          }
        }).pipe(Effect.orDie),
    }
  }),
)

function analyzeComplexity(content: string, lines: string[]): Record<string, unknown> {
  const cyclomaticComplexity = 1
  const controlFlowPatterns = /\b(if|else|for|while|switch|case|catch|&&|\?)\b/g
  const matches = content.match(controlFlowPatterns) ?? []
  const complexity = cyclomaticComplexity + matches.length

  return {
    cyclomaticComplexity: complexity,
    lineCount: lines.length,
    nonEmptyLines: lines.filter((l) => l.trim().length > 0).length,
    commentLines: lines.filter((l) => l.trim().startsWith("//") || l.trim().startsWith("*") || l.trim().startsWith("/*")).length,
    rating: complexity <= 10 ? "low" : complexity <= 20 ? "medium" : complexity <= 50 ? "high" : "very_high",
  }
}

function analyzeDependencies(content: string): Record<string, unknown> {
  const importPattern = /(?:import|require)\s*\(?['"]([^'"]+)['"]\)?/g
  const dynamicImportPattern = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g

  const staticImports: string[] = []
  const dynamicImports: string[] = []

  let match: RegExpExecArray | null
  while ((match = importPattern.exec(content)) !== null) {
    staticImports.push(match[1])
  }
  while ((match = dynamicImportPattern.exec(content)) !== null) {
    dynamicImports.push(match[1])
  }

  const external = staticImports.filter((i) => !i.startsWith(".") && !i.startsWith("/"))
  const internal = staticImports.filter((i) => i.startsWith(".") || i.startsWith("/"))

  return {
    totalImports: staticImports.length,
    staticImports: external.slice(0, 20),
    internalImports: internal.slice(0, 20),
    dynamicImports: dynamicImports.slice(0, 10),
    uniqueExternal: [...new Set(external)].slice(0, 20),
  }
}

function analyzeSymbols(content: string, lines: string[]): Record<string, unknown> {
  const functionPattern = /(?:function\s+|const\s+|let\s+|var\s+)(\w+)\s*(?:=\s*)?(?:\([^)]*\)|<[^>]*>)\s*(?:=>|=>\s*\{|\{)/g
  const classPattern = /class\s+(\w+)/g
  const interfacePattern = /interface\s+(\w+)/g
  const typePattern = /type\s+(\w+)/g

  const functions: string[] = []
  const classes: string[] = []
  const interfaces: string[] = []
  const types: string[] = []

  let match: RegExpExecArray | null
  while ((match = functionPattern.exec(content)) !== null) functions.push(match[1])
  while ((match = classPattern.exec(content)) !== null) classes.push(match[1])
  while ((match = interfacePattern.exec(content)) !== null) interfaces.push(match[1])
  while ((match = typePattern.exec(content)) !== null) types.push(match[1])

  return {
    functions: [...new Set(functions)].slice(0, 30),
    classes: [...new Set(classes)],
    interfaces: [...new Set(interfaces)],
    types: [...new Set(types)],
    totalSymbols: functions.length + classes.length + interfaces.length + types.length,
  }
}