#!/usr/bin/env bun
/**
 * Enhanced package.json transform with Sonderr dependency injection
 *
 * This script handles package.json conflicts by:
 * 1. Taking upstream's version (to get new dependencies)
 * 2. Transforming package names (sonderr -> sonderr)
 * 3. Injecting Sonderr-specific dependencies
 * 4. Preserving Sonderr's version number
 * 5. Preserving overrides and patchedDependencies
 * 6. Preserving Sonderr's repository metadata
 * 7. Using "newest wins" strategy for dependency versions
 */

import { $ } from "bun"
import { info, success, warn, debug } from "../utils/logger"
import { getCurrentVersion } from "./preserve-versions"
import { oursHasSonderrChanges } from "../utils/git"

/**
 * Extract clean version string from a version specifier
 * Removes ^, ~, >=, etc. prefixes
 */
function extractVersion(version: string): string | null {
  // Handle special formats that can't be compared
  if (
    version.startsWith("workspace:") ||
    version.startsWith("catalog:") ||
    version.startsWith("http://") ||
    version.startsWith("https://") ||
    version.startsWith("git://") ||
    version.startsWith("git+") ||
    version.startsWith("file:") ||
    version.startsWith("link:") ||
    version.startsWith("npm:")
  ) {
    return null
  }

  // Remove common prefixes: ^, ~, >=, >, <=, <, =
  const cleaned = version.replace(/^[\^~>=<]+/, "").trim()

  // Basic semver validation (x.y.z with optional pre-release/build)
  if (/^\d+\.\d+\.\d+/.test(cleaned)) {
    return cleaned
  }

  // Handle x.y format
  if (/^\d+\.\d+$/.test(cleaned)) {
    return cleaned + ".0"
  }

  // Handle single number
  if (/^\d+$/.test(cleaned)) {
    return cleaned + ".0.0"
  }

  return null
}

/**
 * Parse a semver string into components
 */
function parseSemver(version: string): { major: number; minor: number; patch: number; prerelease: string } | null {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?/)
  if (!match) return null

  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4] || "",
  }
}

/**
 * Compare two version strings
 * Returns: 1 if a > b, -1 if a < b, 0 if equal
 * For special formats (URLs, catalog:, workspace:*), returns null (can't compare)
 */
function compareVersions(a: string, b: string): number | null {
  const cleanA = extractVersion(a)
  const cleanB = extractVersion(b)

  // If either can't be parsed, return null (can't compare)
  if (!cleanA || !cleanB) return null

  const semverA = parseSemver(cleanA)
  const semverB = parseSemver(cleanB)

  if (!semverA || !semverB) return null

  // Compare major.minor.patch
  if (semverA.major !== semverB.major) return semverA.major > semverB.major ? 1 : -1
  if (semverA.minor !== semverB.minor) return semverA.minor > semverB.minor ? 1 : -1
  if (semverA.patch !== semverB.patch) return semverA.patch > semverB.patch ? 1 : -1

  // Handle prerelease (no prerelease > prerelease)
  if (!semverA.prerelease && semverB.prerelease) return 1
  if (semverA.prerelease && !semverB.prerelease) return -1
  if (semverA.prerelease && semverB.prerelease) {
    return semverA.prerelease.localeCompare(semverB.prerelease)
  }

  return 0
}

function bun(value: unknown): { value: string; version: string } | null {
  if (typeof value !== "string") return null
  const match = value.match(/^bun@(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?)$/)
  if (!match) return null
  return { value, version: match[1] }
}

export function selectBunPackageManager(ours: unknown, theirs: unknown): string | undefined {
  const left = bun(ours)
  const right = bun(theirs)
  if (left && right) return compareVersions(left.version, right.version)! >= 0 ? left.value : right.value
  if (left) return left.value
  if (right) return right.value
  return undefined
}

export function fixPackageManager(
  pkg: Record<string, unknown>,
  path: string,
  ours: Record<string, unknown> | null,
  changes: string[],
): void {
  if (path !== "package.json") return
  const next = selectBunPackageManager(ours?.packageManager, pkg.packageManager)
  if (!next || pkg.packageManager === next) return
  const prior = typeof pkg.packageManager === "string" ? pkg.packageManager : "missing or invalid"
  changes.push(`packageManager: ${prior} -> ${next} (preserved Sonderr pin)`)
  pkg.packageManager = next
}

export function fixRepository(
  pkg: Record<string, unknown>,
  ours: Record<string, unknown> | null,
  changes: string[],
): void {
  if (!ours) return
  for (const key of ["repository", "homepage", "bugs"] as const) {
    if (ours[key] === undefined || JSON.stringify(pkg[key]) === JSON.stringify(ours[key])) continue
    pkg[key] = ours[key]
    changes.push(`${key}: preserved Sonderr metadata`)
  }
}

export function assertBunPackageManager(current: unknown, base: unknown, upstream: unknown): void {
  const inputs = [bun(base), bun(upstream)].filter((item): item is NonNullable<typeof item> => item !== null)
  if (inputs.length === 0) return
  const required = inputs.reduce((max, item) => (compareVersions(item.version, max.version)! > 0 ? item : max))
  const actual = bun(current)
  if (!actual) {
    throw new Error(
      `Bun packageManager validation failed: merged value is invalid; expected at least ${required.value}`,
    )
  }
  if (compareVersions(actual.version, required.version)! >= 0) return
  throw new Error(`Bun packageManager downgrade detected: merged ${actual.value}, expected at least ${required.value}`)
}

/**
 * Merge two dependency objects using "newest wins" strategy
 * For non-comparable versions (URLs, catalog:, workspace:*), upstream (theirs) wins
 *
 * Key order preserves ours' order first (so sonderr-only deps stay in their
 * original position), then appends theirs-only keys at the end. This avoids
 * relocating existing keys, which would otherwise let git's textual merge
 * produce duplicate JSON keys (ours keeps the line in place, theirs appears
 * to "add" the same key elsewhere → both survive the merge).
 */
export function mergeWithNewestVersions(
  ours: Record<string, string> | undefined,
  theirs: Record<string, string> | undefined,
  changes: string[],
  section: string,
): Record<string, string> {
  const result: Record<string, string> = {}

  // Seed with ours' keys in ours' order, applying newest-wins per key.
  if (ours) {
    for (const [name, ourVersion] of Object.entries(ours)) {
      const theirVersion = theirs?.[name]
      if (theirVersion === undefined) {
        result[name] = ourVersion
        changes.push(`${section}: preserved ${name}@${ourVersion} (sonderr-only)`)
        continue
      }
      if (ourVersion === theirVersion) {
        result[name] = theirVersion
        continue
      }
      const cmp = compareVersions(ourVersion, theirVersion)
      if (cmp === null) {
        result[name] = theirVersion
        changes.push(`${section}: ${name} kept upstream ${theirVersion} (special format)`)
      } else if (cmp > 0) {
        result[name] = ourVersion
        changes.push(`${section}: ${name} ${theirVersion} -> ${ourVersion} (sonderr newer)`)
      } else {
        result[name] = theirVersion
        if (cmp < 0) changes.push(`${section}: ${name} kept upstream ${theirVersion} (upstream newer)`)
      }
    }
  }

  // Append any theirs-only keys at the end, preserving theirs' relative order.
  if (theirs) {
    for (const [name, version] of Object.entries(theirs)) {
      if (result[name] === undefined) {
        result[name] = version
      }
    }
  }

  return result
}

export interface PackageJsonResult {
  file: string
  action: "transformed" | "skipped" | "failed" | "flagged"
  changes: string[]
  dryRun: boolean
}

export interface PackageJsonOptions {
  dryRun?: boolean
  verbose?: boolean
  preserveVersion?: boolean
}

export interface ReconcileOptions extends PackageJsonOptions {
  oursRef: string
  theirsRef: string
  /**
   * Files to skip (e.g. still-conflicted files where the user is going to
   * resolve manually). The reconciler would otherwise overwrite the conflict
   * markers and silently auto-resolve.
   */
  skip?: Set<string>
}

// Package name mappings
const PACKAGE_NAME_MAP: Record<string, string> = {
  "sonderr-ai": "@sonderr/cli",
  "@sonderr/cli": "@sonderr/cli",
  "@sonderr/sdk": "@sonderr/sdk",
  "@sonderr/plugin": "@sonderr/plugin",
}

// Sonderr-specific dependencies to inject into specific packages
// NOTE: When adding new Sonderr-specific workspace dependencies (packages starting with @sonderr/sonderr-*),
// add them here to prevent them from being removed during upstream merges
const SONDERR_DEPENDENCIES: Record<string, Record<string, string>> = {
  // packages/cli/package.json needs these
  "packages/cli/package.json": {
    "@sonderr/sonderr-gateway": "workspace:*",
    "@sonderr/sonderr-telemetry": "workspace:*",
  },
}

// Sonderr-specific bin entries to set on specific packages
const SONDERR_BIN: Record<string, Record<string, string>> = {
  "packages/cli/package.json": {
    sonderr: "./bin/sonderr",
    sonderr: "./bin/sonderr",
  },
}

// Packages that should have their name transformed
const TRANSFORM_PACKAGE_NAMES: Record<string, string> = {
  "package.json": "@sonderr/sonderr",
  "packages/cli/package.json": "@sonderr/cli",
  "packages/plugin/package.json": "@sonderr/plugin",
  "packages/sdk/js/package.json": "@sonderr/sdk",
}

// Sonderr-specific scripts to preserve from the base branch per package.json.
// Upstream's version wholesale-replaces the scripts block, so anything listed
// here gets re-applied from ours after taking theirs.
const PRESERVE_SCRIPTS: Record<string, string[]> = {
  "package.json": [
    "extension",
    "extension:isolated",
    "extension:isolated:clean",
    "changeset",
    "changeset:version",
    "dev-setup",
    "postinstall",
    "dev:local",
    "test:script:ci",
  ],
  "packages/cli/package.json": ["test", "test:ci"],
  // Upstream-shared packages where Sonderr adds a JUnit test:ci script for CI.
  // Without these entries every merge silently schedules zero tests for them.
  "packages/core/package.json": ["test:ci"],
  "packages/effect-drizzle-sqlite/package.json": ["test:ci"],
  "packages/http-recorder/package.json": ["test:ci"],
  "packages/client/package.json": ["test:ci"],
  "packages/httpapi-codegen/package.json": ["test:ci"],
  "packages/llm/package.json": ["test:ci"],
  "packages/sdk-next/package.json": ["test:ci"],
  "packages/session-ui/package.json": ["test:ci"],
  "packages/tui/package.json": ["test:ci"],
  "packages/ui/package.json": ["test:ci"],
  "packages/codemode/package.json": ["test:ci"],
}

// Upstream-only trusted dependencies to delete per package.json. Trusted deps
// get native lifecycle scripts run on install; Sonderr keeps tree-sitter-powershell
// for its WASM grammar only and avoids a root node-gyp requirement, so
// upstream's native-build trust must not come over.
const DELETE_UPSTREAM_TRUSTED_DEPS: Record<string, string[]> = {
  "package.json": ["tree-sitter-powershell"],
}

// Upstream-only scripts to delete per package.json. These reference packages
// Sonderr doesn't ship (desktop-electron, console/app, app) and would otherwise
// reappear on every merge.
const DELETE_UPSTREAM_SCRIPTS: Record<string, string[]> = {
  "package.json": ["dev:desktop", "dev:web", "dev:console", "translate:app"],
}

// Upstream-only catalog entries to delete per package.json. These are pulled
// in by upstream features (e.g. desktop Sentry integration) that Sonderr doesn't
// ship, so they add install weight with zero consumers in our tree.
const DELETE_UPSTREAM_CATALOG: Record<string, string[]> = {
  "package.json": ["@sentry/solid", "@sentry/vite-plugin", "opentui-spinner"],
}

const DELETE_UPSTREAM_DEPENDENCIES = new Set(["opentui-spinner"])

/**
 * Re-apply Sonderr-specific scripts on top of the upstream-shaped scripts block,
 * and prune upstream-only scripts that target packages Sonderr doesn't ship.
 */
export function fixScripts(
  pkg: Record<string, unknown>,
  path: string,
  ours: Record<string, unknown> | null,
  changes: string[],
): void {
  const theirs = (pkg.scripts as Record<string, string> | undefined) || {}
  const oursScripts = (ours?.scripts as Record<string, string> | undefined) || {}

  for (const name of PRESERVE_SCRIPTS[path] || []) {
    const val = oursScripts[name]
    if (val && theirs[name] !== val) {
      theirs[name] = val
      changes.push(`scripts.${name}: preserved from base`)
    }
  }

  for (const name of DELETE_UPSTREAM_SCRIPTS[path] || []) {
    if (theirs[name]) {
      delete theirs[name]
      changes.push(`scripts.${name}: removed (upstream-only, no Sonderr target)`)
    }
  }

  if (Object.keys(theirs).length > 0) pkg.scripts = theirs
}

/**
 * Prune upstream-only trusted dependencies whose native lifecycle builds
 * conflict with Sonderr's install policy.
 */
export function fixTrustedDependencies(pkg: Record<string, unknown>, path: string, changes: string[]): void {
  const trusted = pkg.trustedDependencies as string[] | undefined
  if (!trusted) return
  for (const name of DELETE_UPSTREAM_TRUSTED_DEPS[path] || []) {
    const index = trusted.indexOf(name)
    if (index !== -1) {
      trusted.splice(index, 1)
      changes.push(`trustedDependencies: removed ${name} (native build conflicts with Sonderr install policy)`)
    }
  }
}

/**
 * Drop upstream patchedDependencies entries that conflict with Sonderr's pins or
 * whose patch file did not come over. Sonderr pins newer patched versions of some
 * packages (e.g. fff-bun, pacote, xai), and stale upstream entries for the
 * same package, or entries with a missing patch file, break bun install.
 */
export async function prunePatchedDependencies(
  pkg: Record<string, unknown>,
  ours: Record<string, unknown> | null,
  changes: string[],
): Promise<void> {
  const patched = pkg.patchedDependencies as Record<string, string> | undefined
  const ourPatched = (ours?.patchedDependencies as Record<string, string> | undefined) || {}
  if (!patched || Object.keys(ourPatched).length === 0) return
  const ourPackages = new Set(Object.keys(ourPatched).map((key) => key.replace(/@[^@]+$/, "")))
  for (const [key, patch] of Object.entries(patched)) {
    if (!(key in ourPatched) && ourPackages.has(key.replace(/@[^@]+$/, ""))) {
      delete patched[key]
      changes.push(`patchedDependencies: dropped upstream ${key} (Sonderr pins a different version)`)
      continue
    }
    if (patch && !(await Bun.file(patch).exists())) {
      delete patched[key]
      changes.push(`patchedDependencies: dropped ${key} (patch file ${patch} not present)`)
    }
  }
}

/**
 * Prune upstream-only catalog entries that have no consumers in Sonderr.
 */
export function fixCatalog(pkg: Record<string, unknown>, path: string, changes: string[]): void {
  const ws = pkg.workspaces as { catalog?: Record<string, string> } | undefined
  const cat = ws?.catalog
  if (!cat) return
  for (const name of DELETE_UPSTREAM_CATALOG[path] || []) {
    if (cat[name]) {
      delete cat[name]
      changes.push(`workspaces.catalog.${name}: removed (upstream-only, no Sonderr consumer)`)
    }
  }
}

export function fixMetadata(
  pkg: Record<string, unknown>,
  path: string,
  ours: Record<string, unknown> | null,
  changes: string[],
): void {
  if (path !== "packages/cli/package.json") return
  if (!ours) return
  if (Array.isArray(ours.keywords) && JSON.stringify(pkg.keywords) !== JSON.stringify(ours.keywords)) {
    pkg.keywords = ours.keywords
    changes.push("keywords: preserved from base")
  }
  if (typeof ours.private === "boolean" && pkg.private !== ours.private) {
    pkg.private = ours.private
    changes.push("private: preserved from base")
  }
}

/**
 * Check if file is a package.json
 */
export function isPackageJson(file: string): boolean {
  return file.endsWith("package.json")
}

/**
 * Transform dependencies in package.json
 */
export function transformDependencies(deps: Record<string, string> | undefined): {
  result: Record<string, string>
  changes: string[]
} {
  if (!deps) return { result: {}, changes: [] }

  const result: Record<string, string> = {}
  const changes: string[] = []

  for (const [name, version] of Object.entries(deps)) {
    if (DELETE_UPSTREAM_DEPENDENCIES.has(name)) {
      changes.push(`${name}: removed (incompatible OpenTUI runtime)`)
      continue
    }
    const newName = PACKAGE_NAME_MAP[name]
    if (newName) {
      result[newName] = version
      changes.push(`${name} -> ${newName}`)
    } else {
      result[name] = version
    }
  }

  return { result, changes }
}

/**
 * Transform a package.json file
 */
export async function transformPackageJson(file: string, options: PackageJsonOptions = {}): Promise<PackageJsonResult> {
  const changes: string[] = []

  if (options.dryRun) {
    info(`[DRY-RUN] Would transform package.json: ${file}`)
    return { file, action: "transformed", changes: [], dryRun: true }
  }

  // If our version has sonderr_change markers, flag for manual resolution
  if (await oursHasSonderrChanges(file)) {
    warn(`${file} has sonderr_change markers — skipping auto-transform, needs manual resolution`)
    return { file, action: "flagged", changes: [], dryRun: false }
  }

  try {
    // Save Sonderr's version BEFORE taking theirs
    let ourPkg: Record<string, unknown> | null = null
    try {
      const ourContent = await $`git show :2:${file}`.text() // :2: is "ours" in merge
      ourPkg = JSON.parse(ourContent)
    } catch {
      // File might not exist in ours (new file from upstream)
      // or we're not in a merge conflict - try reading current file
      try {
        const currentContent = await Bun.file(file).text()
        if (!currentContent.includes("<<<<<<<")) {
          // Not a conflict, read as-is
          ourPkg = JSON.parse(currentContent)
        }
      } catch {
        // File doesn't exist yet
      }
    }

    // Take upstream's version
    await $`git checkout --theirs ${file}`.quiet().nothrow()
    await $`git add ${file}`.quiet().nothrow()

    // Read and parse upstream's version
    const content = await Bun.file(file).text()
    const pkg = JSON.parse(content)

    // 1. Transform package name if needed
    const relativePath = file.replace(process.cwd() + "/", "")
    const newName = TRANSFORM_PACKAGE_NAMES[relativePath]
    if (newName && pkg.name !== newName) {
      changes.push(`name: ${pkg.name} -> ${newName}`)
      pkg.name = newName
    }

    fixPackageManager(pkg, relativePath, ourPkg, changes)

    // 2. Preserve Sonderr version if requested
    if (options.preserveVersion !== false) {
      const sonderrVersion = await getCurrentVersion()
      if (pkg.version !== sonderrVersion) {
        changes.push(`version: ${pkg.version} -> ${sonderrVersion}`)
        pkg.version = sonderrVersion
      }
    }

    // 3. Merge dependencies with "newest wins" strategy
    if (ourPkg) {
      pkg.dependencies = mergeWithNewestVersions(
        ourPkg.dependencies as Record<string, string> | undefined,
        pkg.dependencies,
        changes,
        "dependencies",
      )

      pkg.devDependencies = mergeWithNewestVersions(
        ourPkg.devDependencies as Record<string, string> | undefined,
        pkg.devDependencies,
        changes,
        "devDependencies",
      )

      pkg.peerDependencies = mergeWithNewestVersions(
        ourPkg.peerDependencies as Record<string, string> | undefined,
        pkg.peerDependencies,
        changes,
        "peerDependencies",
      )

      // 4. Preserve/merge overrides
      const ourOverrides = ourPkg.overrides as Record<string, string> | undefined
      if (ourOverrides || pkg.overrides) {
        pkg.overrides = mergeWithNewestVersions(ourOverrides, pkg.overrides, changes, "overrides")
      }

      // 5. Preserve patchedDependencies (Sonderr-specific, upstream won't have these)
      const ourPatchedDeps = ourPkg.patchedDependencies as Record<string, string> | undefined
      if (ourPatchedDeps) {
        pkg.patchedDependencies = pkg.patchedDependencies || {}
        await prunePatchedDependencies(pkg, ourPkg, changes)
        for (const [name, patch] of Object.entries(ourPatchedDeps)) {
          if (!pkg.patchedDependencies[name]) {
            pkg.patchedDependencies[name] = patch
            changes.push(`patchedDependencies: preserved ${name}`)
          }
        }
      }

      // 6. Preserve repository metadata so published packages keep Sonderr links
      fixRepository(pkg, ourPkg, changes)

      fixMetadata(pkg, relativePath, ourPkg, changes)

      // 7. Handle workspaces for root package.json
      // Sonderr has removed hosted platform packages (console/*, slack, etc.)
      // so we need to preserve Sonderr's workspace configuration instead of taking upstream's
      const ourWorkspaces = ourPkg.workspaces as { packages?: string[]; catalog?: Record<string, string> } | undefined
      const theirWorkspaces = pkg.workspaces as { packages?: string[]; catalog?: Record<string, string> } | undefined

      if (relativePath === "package.json" && ourWorkspaces?.packages) {
        pkg.workspaces = pkg.workspaces || {}
        pkg.workspaces.packages = ourWorkspaces.packages
        changes.push(`workspaces.packages: preserved Sonderr's workspace configuration`)
      }

      fixScripts(pkg, relativePath, ourPkg, changes)

      // Merge catalog with "newest wins" strategy
      if (ourWorkspaces?.catalog || theirWorkspaces?.catalog) {
        pkg.workspaces = pkg.workspaces || {}
        pkg.workspaces.catalog = mergeWithNewestVersions(
          ourWorkspaces?.catalog,
          theirWorkspaces?.catalog,
          changes,
          "workspaces.catalog",
        )
      }

      fixCatalog(pkg, relativePath, changes)
      fixTrustedDependencies(pkg, relativePath, changes)
    }

    // 7. Transform dependency names (sonderr -> sonderr)
    if (pkg.dependencies) {
      const { result, changes: depChanges } = transformDependencies(pkg.dependencies)
      pkg.dependencies = result
      changes.push(...depChanges.map((c) => `dependencies: ${c}`))
    }

    if (pkg.devDependencies) {
      const { result, changes: devChanges } = transformDependencies(pkg.devDependencies)
      if (devChanges.length > 0) {
        pkg.devDependencies = result
        changes.push(...devChanges.map((c) => `devDependencies: ${c}`))
      }
    }

    if (pkg.peerDependencies) {
      const { result, changes: peerChanges } = transformDependencies(pkg.peerDependencies)
      if (peerChanges.length > 0) {
        pkg.peerDependencies = result
        changes.push(...peerChanges.map((c) => `peerDependencies: ${c}`))
      }
    }

    // 8. Inject Sonderr-specific dependencies
    const sonderrDeps = SONDERR_DEPENDENCIES[relativePath]
    if (sonderrDeps) {
      pkg.dependencies = pkg.dependencies || {}
      for (const [name, version] of Object.entries(sonderrDeps)) {
        if (!pkg.dependencies[name]) {
          pkg.dependencies[name] = version
          changes.push(`injected: ${name}`)
        }
      }
    }

    // 9. Set Sonderr-specific bin entries
    const sonderrBin = SONDERR_BIN[relativePath]
    if (sonderrBin) {
      pkg.bin = sonderrBin
      changes.push(`bin: set Sonderr bin entries`)
    }

    // Write back with proper formatting
    const newContent = JSON.stringify(pkg, null, 2) + "\n"
    await Bun.write(file, newContent)
    await $`git add ${file}`.quiet().nothrow()

    if (changes.length > 0) {
      success(`Transformed ${file}: ${changes.length} changes`)
      if (options.verbose) {
        for (const change of changes) {
          debug(`  - ${change}`)
        }
      }
    }

    return { file, action: "transformed", changes, dryRun: false }
  } catch (err) {
    warn(`Failed to transform ${file}: ${err}`)
    return { file, action: "failed", changes: [], dryRun: false }
  }
}

/**
 * Transform conflicted package.json files
 */
export async function transformConflictedPackageJson(
  files: string[],
  options: PackageJsonOptions = {},
): Promise<PackageJsonResult[]> {
  const results: PackageJsonResult[] = []

  for (const file of files) {
    if (!isPackageJson(file)) {
      results.push({ file, action: "skipped", changes: [], dryRun: options.dryRun ?? false })
      continue
    }

    const result = await transformPackageJson(file, options)
    results.push(result)
  }

  return results
}

/**
 * Get Sonderr's package.json from the base branch (main) for comparison
 * Used during pre-merge to compare upstream versions against Sonderr's versions
 */
async function getSonderrPackageJson(path: string, baseBranch = "main"): Promise<Record<string, unknown> | null> {
  try {
    // Try to get the file from origin/main (or whatever base branch)
    const content = await $`git show origin/${baseBranch}:${path}`.text()
    return JSON.parse(content)
  } catch {
    // File might not exist in Sonderr
    return null
  }
}

/**
 * Transform all package.json files (pre-merge, on sonderr branch)
 * This function merges Sonderr's versions with upstream, using "newest wins" strategy
 */
export async function transformAllPackageJson(options: PackageJsonOptions = {}): Promise<PackageJsonResult[]> {
  const { Glob } = await import("bun")
  const results: PackageJsonResult[] = []

  // Find all package.json files
  const glob = new Glob("**/package.json")

  for await (const path of glob.scan({ absolute: false })) {
    // Skip node_modules
    if (path.includes("node_modules")) continue

    const file = Bun.file(path)
    if (!(await file.exists())) continue

    try {
      const content = await file.text()
      const pkg = JSON.parse(content) // This is upstream's version
      const changes: string[] = []

      // Get Sonderr's version from base branch for comparison
      const sonderrPkg = await getSonderrPackageJson(path)

      // 1. Transform package name if needed
      const newName = TRANSFORM_PACKAGE_NAMES[path]
      if (newName && pkg.name !== newName) {
        changes.push(`name: ${pkg.name} -> ${newName}`)
        pkg.name = newName
      }

      fixPackageManager(pkg, path, sonderrPkg, changes)

      // 2. Preserve Sonderr version if requested
      if (options.preserveVersion !== false) {
        const sonderrVersion = await getCurrentVersion()
        if (pkg.version !== sonderrVersion) {
          changes.push(`version: ${pkg.version} -> ${sonderrVersion}`)
          pkg.version = sonderrVersion
        }
      }

      // 3. Merge dependencies with "newest wins" strategy (if Sonderr has this file)
      if (sonderrPkg) {
        pkg.dependencies = mergeWithNewestVersions(
          sonderrPkg.dependencies as Record<string, string> | undefined,
          pkg.dependencies,
          changes,
          "dependencies",
        )

        pkg.devDependencies = mergeWithNewestVersions(
          sonderrPkg.devDependencies as Record<string, string> | undefined,
          pkg.devDependencies,
          changes,
          "devDependencies",
        )

        pkg.peerDependencies = mergeWithNewestVersions(
          sonderrPkg.peerDependencies as Record<string, string> | undefined,
          pkg.peerDependencies,
          changes,
          "peerDependencies",
        )

        // 4. Preserve/merge overrides
        const sonderrOverrides = sonderrPkg.overrides as Record<string, string> | undefined
        if (sonderrOverrides || pkg.overrides) {
          pkg.overrides = mergeWithNewestVersions(sonderrOverrides, pkg.overrides, changes, "overrides")
        }

        // 5. Preserve patchedDependencies (Sonderr-specific, upstream won't have these)
        const sonderrPatchedDeps = sonderrPkg.patchedDependencies as Record<string, string> | undefined
        if (sonderrPatchedDeps) {
          pkg.patchedDependencies = pkg.patchedDependencies || {}
          await prunePatchedDependencies(pkg, sonderrPkg, changes)
          for (const [name, patch] of Object.entries(sonderrPatchedDeps)) {
            if (!pkg.patchedDependencies[name]) {
              pkg.patchedDependencies[name] = patch
              changes.push(`patchedDependencies: preserved ${name}`)
            }
          }
        }

        // 6. Preserve repository (Sonderr-specific, upstream doesn't have this)
        const sonderrRepo = sonderrPkg.repository
        if (sonderrRepo && JSON.stringify(pkg.repository) !== JSON.stringify(sonderrRepo)) {
          pkg.repository = sonderrRepo
          changes.push(`repository: preserved Sonderr's repository configuration`)
        }

        fixMetadata(pkg, path, sonderrPkg, changes)

        // 7. Handle workspaces for root package.json
        // Sonderr has removed hosted platform packages (console/*, slack, etc.)
        // so we need to preserve Sonderr's workspace configuration instead of taking upstream's
        const sonderrWorkspaces = sonderrPkg.workspaces as
          | { packages?: string[]; catalog?: Record<string, string> }
          | undefined
        const upstreamWorkspaces = pkg.workspaces as
          | { packages?: string[]; catalog?: Record<string, string> }
          | undefined

        if (path === "package.json" && sonderrWorkspaces?.packages) {
          pkg.workspaces = pkg.workspaces || {}
          pkg.workspaces.packages = sonderrWorkspaces.packages
          changes.push(`workspaces.packages: preserved Sonderr's workspace configuration`)
        }

        fixScripts(pkg, path, sonderrPkg, changes)

        // Merge catalog with "newest wins" strategy
        if (sonderrWorkspaces?.catalog || upstreamWorkspaces?.catalog) {
          pkg.workspaces = pkg.workspaces || {}
          pkg.workspaces.catalog = mergeWithNewestVersions(
            sonderrWorkspaces?.catalog,
            upstreamWorkspaces?.catalog,
            changes,
            "workspaces.catalog",
          )
        }

        fixCatalog(pkg, path, changes)
        fixTrustedDependencies(pkg, path, changes)
      }

      // 7. Transform dependency names (sonderr -> sonderr)
      if (pkg.dependencies) {
        const { result, changes: depChanges } = transformDependencies(pkg.dependencies)
        if (depChanges.length > 0) {
          pkg.dependencies = result
          changes.push(...depChanges.map((c) => `dependencies: ${c}`))
        }
      }

      if (pkg.devDependencies) {
        const { result, changes: devChanges } = transformDependencies(pkg.devDependencies)
        if (devChanges.length > 0) {
          pkg.devDependencies = result
          changes.push(...devChanges.map((c) => `devDependencies: ${c}`))
        }
      }

      if (pkg.peerDependencies) {
        const { result, changes: peerChanges } = transformDependencies(pkg.peerDependencies)
        if (peerChanges.length > 0) {
          pkg.peerDependencies = result
          changes.push(...peerChanges.map((c) => `peerDependencies: ${c}`))
        }
      }

      // 8. Inject Sonderr-specific dependencies
      const sonderrDeps = SONDERR_DEPENDENCIES[path]
      if (sonderrDeps) {
        pkg.dependencies = pkg.dependencies || {}
        for (const [name, version] of Object.entries(sonderrDeps)) {
          if (!pkg.dependencies[name]) {
            pkg.dependencies[name] = version
            changes.push(`injected: ${name}`)
          }
        }
      }

      // 9. Set Sonderr-specific bin entries
      const sonderrBin = SONDERR_BIN[path]
      if (sonderrBin) {
        pkg.bin = sonderrBin
        changes.push(`bin: set Sonderr bin entries`)
      }

      if (changes.length > 0) {
        if (!options.dryRun) {
          const newContent = JSON.stringify(pkg, null, 2) + "\n"
          await Bun.write(path, newContent)
          success(`Transformed ${path}: ${changes.length} changes`)
        } else {
          info(`[DRY-RUN] Would transform ${path}: ${changes.length} changes`)
        }
      }

      results.push({ file: path, action: "transformed", changes, dryRun: options.dryRun ?? false })
    } catch (err) {
      warn(`Failed to transform ${path}: ${err}`)
      results.push({ file: path, action: "failed", changes: [], dryRun: options.dryRun ?? false })
    }
  }

  return results
}

/**
 * Reconcile a single package.json after a merge has finished, regardless of
 * whether it was conflicted or auto-resolved (by rerere or git's textual
 * merge). Reads ours from `oursRef` and theirs from `theirsRef`, then applies
 * the same merge logic used for conflict resolution and writes the result to
 * the working tree. Stages the file.
 *
 * This is needed because rerere can replay stale resolutions for files like
 * `package.json` that include cosmetic reordering — those resolutions bypass
 * `transformConflictedPackageJson` entirely. Running this reconciler after
 * the merge guarantees our merge logic always wins.
 *
 * Returns "skipped" if neither side touched the file (or both sides match) so
 * callers can avoid unnecessary churn. Returns "flagged" if ours has
 * sonderr_change markers (manual review needed).
 */
export async function reconcilePackageJsonFromRefs(
  file: string,
  options: ReconcileOptions,
): Promise<PackageJsonResult> {
  const changes: string[] = []
  const dryRun = options.dryRun ?? false

  if (await oursHasSonderrChanges(file)) {
    warn(`${file} has sonderr_change markers — skipping reconcile, needs manual resolution`)
    return { file, action: "flagged", changes: [], dryRun }
  }

  let ourPkg: Record<string, unknown> | null = null
  try {
    const ourContent = await $`git show ${options.oursRef}:${file}`.text()
    ourPkg = JSON.parse(ourContent)
  } catch {
    // file didn't exist in ours - that's fine
  }

  let pkg: Record<string, unknown> | null = null
  try {
    const theirContent = await $`git show ${options.theirsRef}:${file}`.text()
    pkg = JSON.parse(theirContent)
  } catch {
    // file didn't exist in theirs either - nothing to reconcile
  }

  if (!pkg) {
    if (!ourPkg) return { file, action: "skipped", changes: [], dryRun }
    pkg = JSON.parse(JSON.stringify(ourPkg))
  }
  if (!pkg) return { file, action: "skipped", changes: [], dryRun }

  const relativePath = file.replace(process.cwd() + "/", "")
  const newName = TRANSFORM_PACKAGE_NAMES[relativePath]
  if (newName && pkg.name !== newName) {
    changes.push(`name: ${pkg.name} -> ${newName}`)
    pkg.name = newName
  }

  fixPackageManager(pkg, relativePath, ourPkg, changes)

  if (options.preserveVersion !== false) {
    const sonderrVersion = await getCurrentVersion()
    if (pkg.version !== sonderrVersion) {
      changes.push(`version: ${pkg.version} -> ${sonderrVersion}`)
      pkg.version = sonderrVersion
    }
  }

  if (ourPkg) {
    pkg.dependencies = mergeWithNewestVersions(
      ourPkg.dependencies as Record<string, string> | undefined,
      pkg.dependencies as Record<string, string> | undefined,
      changes,
      "dependencies",
    )
    pkg.devDependencies = mergeWithNewestVersions(
      ourPkg.devDependencies as Record<string, string> | undefined,
      pkg.devDependencies as Record<string, string> | undefined,
      changes,
      "devDependencies",
    )
    pkg.peerDependencies = mergeWithNewestVersions(
      ourPkg.peerDependencies as Record<string, string> | undefined,
      pkg.peerDependencies as Record<string, string> | undefined,
      changes,
      "peerDependencies",
    )

    const ourOverrides = ourPkg.overrides as Record<string, string> | undefined
    if (ourOverrides || pkg.overrides) {
      pkg.overrides = mergeWithNewestVersions(
        ourOverrides,
        pkg.overrides as Record<string, string> | undefined,
        changes,
        "overrides",
      )
    }

    const ourPatched = ourPkg.patchedDependencies as Record<string, string> | undefined
    if (ourPatched) {
      pkg.patchedDependencies = (pkg.patchedDependencies as Record<string, string>) || {}
      await prunePatchedDependencies(pkg, ourPkg, changes)
      const patched = pkg.patchedDependencies as Record<string, string>
      for (const [name, patch] of Object.entries(ourPatched)) {
        if (!patched[name]) {
          patched[name] = patch
          changes.push(`patchedDependencies: preserved ${name}`)
        }
      }
    }

    const ourRepo = ourPkg.repository
    if (ourRepo && JSON.stringify(pkg.repository) !== JSON.stringify(ourRepo)) {
      pkg.repository = ourRepo
      changes.push(`repository: preserved Sonderr's repository configuration`)
    }

    fixMetadata(pkg, relativePath, ourPkg, changes)

    const ourWs = ourPkg.workspaces as { packages?: string[]; catalog?: Record<string, string> } | undefined
    const theirWs = pkg.workspaces as { packages?: string[]; catalog?: Record<string, string> } | undefined

    if (relativePath === "package.json" && ourWs?.packages) {
      pkg.workspaces = (pkg.workspaces as Record<string, unknown>) || {}
      ;(pkg.workspaces as { packages: string[] }).packages = ourWs.packages
      changes.push(`workspaces.packages: preserved Sonderr's workspace configuration`)
    }

    fixScripts(pkg, relativePath, ourPkg, changes)

    if (ourWs?.catalog || theirWs?.catalog) {
      pkg.workspaces = (pkg.workspaces as Record<string, unknown>) || {}
      ;(pkg.workspaces as { catalog: Record<string, string> }).catalog = mergeWithNewestVersions(
        ourWs?.catalog,
        theirWs?.catalog,
        changes,
        "workspaces.catalog",
      )
    }

    fixCatalog(pkg, relativePath, changes)
    fixTrustedDependencies(pkg, relativePath, changes)
  }

  if (pkg.dependencies) {
    const { result, changes: depChanges } = transformDependencies(pkg.dependencies as Record<string, string>)
    pkg.dependencies = result
    changes.push(...depChanges.map((c) => `dependencies: ${c}`))
  }
  if (pkg.devDependencies) {
    const { result, changes: devChanges } = transformDependencies(pkg.devDependencies as Record<string, string>)
    if (devChanges.length > 0) {
      pkg.devDependencies = result
      changes.push(...devChanges.map((c) => `devDependencies: ${c}`))
    }
  }
  if (pkg.peerDependencies) {
    const { result, changes: peerChanges } = transformDependencies(pkg.peerDependencies as Record<string, string>)
    if (peerChanges.length > 0) {
      pkg.peerDependencies = result
      changes.push(...peerChanges.map((c) => `peerDependencies: ${c}`))
    }
  }

  const sonderrDeps = SONDERR_DEPENDENCIES[relativePath]
  if (sonderrDeps) {
    pkg.dependencies = (pkg.dependencies as Record<string, string>) || {}
    const deps = pkg.dependencies as Record<string, string>
    for (const [name, version] of Object.entries(sonderrDeps)) {
      if (!deps[name]) {
        deps[name] = version
        changes.push(`injected: ${name}`)
      }
    }
  }

  const sonderrBin = SONDERR_BIN[relativePath]
  if (sonderrBin) {
    pkg.bin = sonderrBin
    changes.push(`bin: set Sonderr bin entries`)
  }

  if (dryRun) {
    info(`[DRY-RUN] Would reconcile ${file}: ${changes.length} changes`)
    return { file, action: "transformed", changes, dryRun: true }
  }

  const newContent = JSON.stringify(pkg, null, 2) + "\n"
  await Bun.write(file, newContent)
  await $`git add ${file}`.quiet().nothrow()

  if (changes.length > 0) {
    success(`Reconciled ${file}: ${changes.length} changes`)
    if (options.verbose) {
      for (const change of changes) debug(`  - ${change}`)
    }
  }

  return { file, action: "transformed", changes, dryRun: false }
}

/**
 * Reconcile every package.json that differs between `oursRef` and `theirsRef`
 * after a merge. This is meant to run after `git merge` (whether the merge
 * was clean, conflict-resolved, or rerere-replayed) to ensure our merge logic
 * is the source of truth for package.json content.
 */
export async function reconcileAllPackageJson(options: ReconcileOptions): Promise<PackageJsonResult[]> {
  // Collect every package.json that differs in either direction so we cover
  // upstream-only and sonderr-only files alike.
  const diffOurs = await $`git diff --name-only ${options.oursRef} -- '*package.json'`.text()
  const diffTheirs = await $`git diff --name-only ${options.theirsRef} -- '*package.json'`.text()
  const candidates = new Set<string>()
  for (const line of [...diffOurs.split("\n"), ...diffTheirs.split("\n")]) {
    const path = line.trim()
    if (!path) continue
    if (path.includes("node_modules")) continue
    if (!path.endsWith("package.json")) continue
    candidates.add(path)
  }

  const results: PackageJsonResult[] = []
  for (const file of candidates) {
    if (options.skip?.has(file)) {
      results.push({ file, action: "skipped", changes: [], dryRun: options.dryRun ?? false })
      continue
    }
    const f = Bun.file(file)
    if (!(await f.exists())) {
      // file was removed by the merge - nothing to reconcile
      continue
    }
    results.push(await reconcilePackageJsonFromRefs(file, options))
  }
  return results
}

// CLI entry point
if (import.meta.main) {
  const args = process.argv.slice(2)
  const dryRun = args.includes("--dry-run")
  const verbose = args.includes("--verbose")

  const files = args.filter((a) => !a.startsWith("--"))

  if (files.length === 0) {
    info("Usage: transform-package-json.ts [--dry-run] [--verbose] <file1> <file2> ...")
    process.exit(1)
  }

  if (dryRun) {
    info("Running in dry-run mode")
  }

  const results = await transformConflictedPackageJson(files, { dryRun, verbose })

  const transformed = results.filter((r) => r.action === "transformed")
  const totalChanges = results.reduce((sum, r) => sum + r.changes.length, 0)

  console.log()
  success(`Transformed ${transformed.length} package.json files with ${totalChanges} changes`)

  if (dryRun) {
    info("Run without --dry-run to apply changes")
  }
}
