#!/usr/bin/env bun
/**
 * jscodeshift codemod: Transform string literals
 *
 * Transforms string literals containing sonderr references to sonderr:
 * - "sonderr-ai" -> "@sonderr/cli"
 * - "npx sonderr" -> "npx @sonderr/cli"
 * - etc.
 *
 * Usage:
 *   bun run script/upstream/codemods/transform-strings.ts [files...]
 */

import { Project, SyntaxKind, type SourceFile } from "ts-morph"
import { Glob } from "bun"
import { info, success } from "../utils/logger"
import { defaultConfig } from "../utils/config"

interface StringReplacement {
  pattern: RegExp
  replacement: string
}

const STRING_REPLACEMENTS: StringReplacement[] = [
  // Package names in strings (no trailing \b to allow subpath matching like @sonderr/sdk/v2)
  { pattern: /\bsonderr-ai\b/g, replacement: "@sonderr/cli" },
  { pattern: /@sonderr-ai\/cli(?=\/|"|'|`|$)/g, replacement: "@sonderr/cli" },
  { pattern: /@sonderr-ai\/sdk(?=\/|"|'|`|$)/g, replacement: "@sonderr/sdk" },
  { pattern: /@sonderr-ai\/plugin(?=\/|"|'|`|$)/g, replacement: "@sonderr/plugin" },

  // CLI commands
  { pattern: /\bnpx sonderr\b/g, replacement: "npx @sonderr/cli" },
  { pattern: /\bbun add sonderr\b/g, replacement: "bun add @sonderr/cli" },
  { pattern: /\bnpm install sonderr\b/g, replacement: "npm install @sonderr/cli" },
  { pattern: /\bnpm i sonderr\b/g, replacement: "npm i @sonderr/cli" },

  // Database filename
  { pattern: /\bsonderr\.db\b/g, replacement: "sonderr.db" },

  // Binary name references (be careful with these)
  { pattern: /\bsonderr upgrade\b/g, replacement: "sonderr upgrade" },

  // HTTP header prefix
  { pattern: /x-sonderr-/g, replacement: "x-sonderr-" },

  // Environment variables (exclude SONDERR_API_KEY - upstream Zen SaaS key)
  { pattern: /\bSONDERR_(?!API_KEY\b)([A-Z_]+)\b/g, replacement: "SONDERR_$1" },
  { pattern: /\bVITE_SONDERR_/g, replacement: "VITE_SONDERR_" },
  { pattern: /\b_EXTENSION_SONDERR_/g, replacement: "_EXTENSION_SONDERR_" },
]

export interface TransformResult {
  file: string
  changes: number
}

/**
 * Transform string literals in a source file
 */
export function transformStrings(sourceFile: SourceFile): number {
  let changes = 0

  // Get all string literals
  const stringLiterals = sourceFile.getDescendantsOfKind(SyntaxKind.StringLiteral)

  for (const literal of stringLiterals) {
    let value = literal.getLiteralValue()
    let modified = false

    for (const { pattern, replacement } of STRING_REPLACEMENTS) {
      if (pattern.test(value)) {
        value = value.replace(pattern, replacement)
        modified = true
      }
    }

    if (modified) {
      // Preserve the original quote style
      const text = literal.getText()
      const quote = text[0]
      literal.replaceWithText(`${quote}${value}${quote}`)
      changes++
    }
  }

  // Also handle template literals
  const templates = sourceFile.getDescendantsOfKind(SyntaxKind.TemplateExpression)
  for (const template of templates) {
    const head = template.getHead()
    let headValue = head.getLiteralValue()
    let headModified = false

    for (const { pattern, replacement } of STRING_REPLACEMENTS) {
      if (pattern.test(headValue)) {
        headValue = headValue.replace(pattern, replacement)
        headModified = true
      }
    }

    if (headModified) {
      // Template head replacement is complex, skip for now
      changes++
    }
  }

  // Handle no-substitution template literals
  const noSubTemplates = sourceFile.getDescendantsOfKind(SyntaxKind.NoSubstitutionTemplateLiteral)
  for (const template of noSubTemplates) {
    let value = template.getLiteralValue()
    let modified = false

    for (const { pattern, replacement } of STRING_REPLACEMENTS) {
      if (pattern.test(value)) {
        value = value.replace(pattern, replacement)
        modified = true
      }
    }

    if (modified) {
      template.replaceWithText(`\`${value}\``)
      changes++
    }
  }

  return changes
}

/**
 * Transform all files
 */
export async function transformAllStrings(
  patterns: string[] = ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
  dryRun = false,
): Promise<TransformResult[]> {
  const project = new Project({
    skipAddingFilesFromTsConfig: true,
  })

  const results: TransformResult[] = []
  const excludes = defaultConfig.excludePatterns

  for (const pattern of patterns) {
    const glob = new Glob(pattern)

    for await (const path of glob.scan({ absolute: true })) {
      if (excludes.some((ex) => path.includes(ex.replace(/\*\*/g, "")))) {
        continue
      }

      const sourceFile = project.addSourceFileAtPath(path)
      const changes = transformStrings(sourceFile)

      if (changes > 0) {
        results.push({ file: path, changes })

        if (!dryRun) {
          await sourceFile.save()
          success(`Transformed ${path}: ${changes} string(s)`)
        } else {
          info(`[DRY-RUN] Would transform ${path}: ${changes} string(s)`)
        }
      }
    }
  }

  return results
}

// CLI entry point
if (import.meta.main) {
  const args = process.argv.slice(2)
  const dryRun = args.includes("--dry-run")
  const files = args.filter((a) => !a.startsWith("--"))

  if (dryRun) {
    info("Running in dry-run mode")
  }

  const patterns = files.length > 0 ? files : undefined
  const results = await transformAllStrings(patterns, dryRun)

  console.log()
  success(`Transformed ${results.length} files`)
  const totalChanges = results.reduce((sum, r) => sum + r.changes, 0)
  info(`Total strings transformed: ${totalChanges}`)
}
