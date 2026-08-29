#!/usr/bin/env bun
/**
 * Transform package names and branding from sonderr to sonderr
 *
 * This script transforms:
 * - sonderr-ai -> @sonderr/cli
 * - @sonderr/cli -> @sonderr/cli
 * - @sonderr/sdk -> @sonderr/sdk
 * - @sonderr/plugin -> @sonderr/plugin
 * - SONDERR_* -> SONDERR_* (env variables, excluding SONDERR_API_KEY)
 * - x-sonderr-* -> x-sonderr-* (HTTP headers)
 * - sonderr.db -> sonderr.db (database filename)
 * - window.__SONDERR__ -> window.__SONDERR__ (window global)
 */

import { Glob } from "bun"
import { info, success } from "../utils/logger"
import { defaultConfig } from "../utils/config"

export interface TransformResult {
  file: string
  changes: number
  dryRun: boolean
}

export interface TransformOptions {
  dryRun?: boolean
  verbose?: boolean
}

const PACKAGE_PATTERNS = [
  // In package.json name field
  { pattern: /"name":\s*"sonderr-ai"/, replacement: '"name": "@sonderr/cli"' },
  { pattern: /"name":\s*"@sonderr-ai\/cli"/, replacement: '"name": "@sonderr/cli"' },

  // In dependencies/devDependencies
  { pattern: /"sonderr-ai":\s*"/g, replacement: '"@sonderr/cli": "' },
  { pattern: /"@sonderr-ai\/cli":\s*"/g, replacement: '"@sonderr/cli": "' },
  { pattern: /"@sonderr-ai\/sdk":\s*"/g, replacement: '"@sonderr/sdk": "' },
  { pattern: /"@sonderr-ai\/plugin":\s*"/g, replacement: '"@sonderr/plugin": "' },

  // In any string context (mock.module, dynamic references, etc.)
  // Only cli, sdk, and plugin are renamed — other @sonderr/* packages
  // (e.g. @sonderr/ui, @sonderr/util) keep their upstream names.
  { pattern: /@sonderr-ai\/cli(?=\/|"|'|`|$)/g, replacement: "@sonderr/cli" },
  { pattern: /@sonderr-ai\/sdk(?=\/|"|'|`|$)/g, replacement: "@sonderr/sdk" },
  { pattern: /@sonderr-ai\/plugin(?=\/|"|'|`|$)/g, replacement: "@sonderr/plugin" },

  // In import statements (supports subpaths like @sonderr/sdk/v2)
  { pattern: /from\s+["']sonderr-ai["']/g, replacement: 'from "@sonderr/cli"' },
  { pattern: /from\s+["']@sonderr-ai\/cli(\/[^"']*)?["']/g, replacement: 'from "@sonderr/cli$1"' },
  { pattern: /from\s+["']@sonderr-ai\/sdk(\/[^"']*)?["']/g, replacement: 'from "@sonderr/sdk$1"' },
  { pattern: /from\s+["']@sonderr-ai\/plugin(\/[^"']*)?["']/g, replacement: 'from "@sonderr/plugin$1"' },

  // In require statements (supports subpaths like @sonderr/sdk/v2)
  { pattern: /require\(["']sonderr-ai["']\)/g, replacement: 'require("@sonderr/cli")' },
  { pattern: /require\(["']@sonderr-ai\/cli(\/[^"']*)?["']\)/g, replacement: 'require("@sonderr/cli$1")' },
  { pattern: /require\(["']@sonderr-ai\/sdk(\/[^"']*)?["']\)/g, replacement: 'require("@sonderr/sdk$1")' },
  { pattern: /require\(["']@sonderr-ai\/plugin(\/[^"']*)?["']\)/g, replacement: 'require("@sonderr/plugin$1")' },

  // Internal placeholder hostname used for in-process RPC (never resolved by DNS)
  { pattern: /sonderr\.internal/g, replacement: "kilo.internal" },

  // In npx/npm commands
  { pattern: /npx sonderr-ai/g, replacement: "npx @sonderr/cli" },
  { pattern: /npm install sonderr-ai/g, replacement: "npm install @sonderr/cli" },
  { pattern: /bun add sonderr-ai/g, replacement: "bun add @sonderr/cli" },

  // SDK public API renames (Sonderr → Sonderr)
  // Order matters: longer names first to avoid partial matches
  { pattern: /SonderrClientConfig/g, replacement: "SonderrClientConfig" },
  { pattern: /createSonderrClient/g, replacement: "createSonderrClient" },
  { pattern: /createSonderrServer/g, replacement: "createSonderrServer" },
  { pattern: /createSonderrTui/g, replacement: "createSonderrTui" },
  { pattern: /SonderrClient/g, replacement: "SonderrClient" },
  // createSonderr (without suffix) needs negative lookahead to avoid matching createSonderrClient
  { pattern: /\bcreateSonderr\b(?!Client|Server|Tui)/g, replacement: "createSonderr" },

  // Branding: environment variables (exclude SONDERR_API_KEY — upstream Zen SaaS key)
  { pattern: /\bSONDERR_(?!API_KEY\b)([A-Z_]+)\b/g, replacement: "SONDERR_$1" },
  { pattern: /VITE_SONDERR_/g, replacement: "VITE_SONDERR_" },
  { pattern: /_EXTENSION_SONDERR_/g, replacement: "_EXTENSION_SONDERR_" },

  // Branding: HTTP header prefix
  { pattern: /x-sonderr-/g, replacement: "x-sonderr-" },

  // Branding: window global
  { pattern: /window\.__SONDERR__/g, replacement: "window.__SONDERR__" },

  // Branding: database filename
  { pattern: /sonderr\.db/g, replacement: "sonderr.db" },
]

/**
 * Apply package name and branding transforms to content.
 */
export function applyPackageNameTransforms(input: string): { result: string; changes: number } {
  return PACKAGE_PATTERNS.reduce(
    (state, { pattern, replacement }) => {
      const regex = typeof pattern === "string" ? new RegExp(pattern, "g") : pattern
      regex.lastIndex = 0
      const count = (state.result.match(regex) || []).length
      regex.lastIndex = 0
      const result = state.result.replace(regex, replacement)
      if (result === state.result) return state
      return { result, changes: state.changes + count }
    },
    { result: input, changes: 0 },
  )
}

/**
 * Transform package names in a single file
 */
export async function transformFile(filePath: string, options: TransformOptions = {}): Promise<TransformResult> {
  const file = Bun.file(filePath)
  const input = await file.text()
  const { result, changes } = applyPackageNameTransforms(input)

  if (changes > 0 && !options.dryRun) {
    await Bun.write(filePath, result)
  }

  return {
    file: filePath,
    changes,
    dryRun: options.dryRun ?? false,
  }
}

/**
 * Transform package names in all relevant files
 */
export async function transformAll(options: TransformOptions = {}): Promise<TransformResult[]> {
  const results: TransformResult[] = []

  // Find all relevant files
  const patterns = ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx", "**/*.json", "**/*.md"]

  const excludes = defaultConfig.excludePatterns

  for (const pattern of patterns) {
    const glob = new Glob(pattern)

    for await (const path of glob.scan({ absolute: true })) {
      // Skip excluded paths
      if (excludes.some((ex) => path.includes(ex.replace(/\*\*/g, "")))) {
        continue
      }

      const result = await transformFile(path, options)

      if (result.changes > 0) {
        results.push(result)

        if (options.dryRun) {
          info(`[DRY-RUN] Would transform ${result.file}: ${result.changes} changes`)
        } else {
          success(`Transformed ${result.file}: ${result.changes} changes`)
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
  const verbose = args.includes("--verbose")

  if (dryRun) {
    info("Running in dry-run mode (no files will be modified)")
  }

  const results = await transformAll({ dryRun, verbose })

  console.log()
  success(`Transformed ${results.length} files`)

  if (dryRun) {
    info("Run without --dry-run to apply changes")
  }
}
