#!/usr/bin/env bun

/**
 * Verifies that every Sonderr-specific change in shared upstream-owned source files
 * is annotated with a sonderr_change marker.
 *
 * Usage:
 *   bun run script/check-sonderr-annotations.ts                  # diff origin/main...HEAD
 *   bun run script/check-sonderr-annotations.ts --base <ref>     # diff <ref>...HEAD
 *   bun run script/check-sonderr-annotations.ts --worktree       # diff HEAD..worktree plus untracked files
 *
 * A line is "covered" if it:
 *   - contains a sonderr_change marker comment           (inline annotation)
 *   - falls inside a sonderr_change start/end block      (block annotation)
 *   - is in a file whose first non-shebang non-empty line is (whole-file annotation)
 *     // sonderr_change - new file
 *   - is empty / whitespace-only                          (skipped)
 *   - is itself a marker line                             (auto-covered)
 *
 * JS (//), JSX ({/ * ... * /}), YAML (#), TOML (#), and shell (#) comment styles are recognized.
 * Extensionless files with shebangs are treated as source files.
 *
 * Exempt paths (no markers needed — entirely Sonderr-specific):
 *   - packages/cli/src/sonderr/**
 *   - packages/cli/test/sonderr/**
 *   - Any path containing "sonderr" in directory or filename
 *   - Any path with a directory starting with "sonderr-" (e.g. sonderr-sessions/)
 *   - script/upstream/**
 *   - Sonderr-specific annotation checker support files
 */

import { spawnSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

const ROOT = path.resolve(import.meta.dir, "..")
const SOURCE_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".yml", ".yaml", ".toml", ".sh", ".bash", ".zsh"])
const SCOPES = [
  "packages/cli",
  "packages/core",
  "packages/llm",
  "packages/schema",
  "packages/protocol",
  "packages/server",
  "packages/tui",
  "packages/extensions",
  "packages/ui",
  "packages/shared",
  "packages/script",
  "packages/storybook",
  "script",
  ".github",
  "github",
]
const EXEMPT_SCOPES = [
  "script/upstream",
  "script/check-sonderr-annotations.ts",
  "packages/script/tests/check-sonderr-annotations.test.ts",
  ".github/workflows/check-sonderr-annotations.yml",
  ".github/workflows/watch-sonderr-releases.yml",
]

const args = process.argv.slice(2)
const unknown = args.find((arg, i) => arg !== "--base" && arg !== "--worktree" && args[i - 1] !== "--base")
if (unknown) {
  console.error(`Unknown argument: ${unknown}`)
  process.exit(1)
}
const baseIdx = args.indexOf("--base")
const worktree = args.includes("--worktree")
if (worktree && baseIdx !== -1) {
  console.error("--base cannot be used with --worktree")
  process.exit(1)
}
const base = (() => {
  if (baseIdx === -1) return "origin/main"
  const ref = args[baseIdx + 1]
  if (ref && !ref.startsWith("--")) return ref
  console.error("Missing value for --base")
  process.exit(1)
})()

function run(cmd: string, args: string[]) {
  const result = spawnSync(cmd, args, { cwd: ROOT, encoding: "utf8" })
  if (result.status !== 0) {
    const msg = result.stderr?.trim() || result.stdout?.trim() || "unknown error"
    console.error(`Command failed: ${cmd} ${args.join(" ")}\n${msg}`)
    process.exit(1)
  }
  return result.stdout?.trim() ?? ""
}

const ref = worktree ? "HEAD" : `${base}...HEAD`

function lines(out: string) {
  return out ? out.split("\n").filter(Boolean) : []
}

function untracked(file?: string) {
  if (!worktree) return []
  const pathspec = file ? [file] : SCOPES
  return lines(run("git", ["ls-files", "--others", "--exclude-standard", "--", ...pathspec]))
}

function changedFiles() {
  const out = run("git", ["diff", "--name-only", "--diff-filter=AMRT", ref, "--", ...SCOPES])
  return [...new Set([...lines(out), ...untracked()])]
}

function isUpstreamMerge() {
  const out = run("git", ["log", "--format=%P%x09%s", `${base}..HEAD`])
  return out.split("\n").some((line) => {
    const [parents = "", subject = ""] = line.split("\t")
    if (!parents.includes(" ")) return false
    const s = subject.toLowerCase()
    return (
      s.startsWith("merge: upstream ") || s.startsWith("merge: sonderr ") || s.startsWith("resolve merge conflict")
    )
  })
}

function isExempt(file: string) {
  const norm = file.replaceAll("\\", "/").toLowerCase()
  if (norm.split("/").some((part) => part.includes("sonderr") || part.startsWith("sonderr-"))) return true
  return EXEMPT_SCOPES.some((scope) => norm === scope || norm.startsWith(`${scope}/`))
}

function isChecked(file: string) {
  const norm = file.replaceAll("\\", "/")
  return SCOPES.some((scope) => norm === scope || norm.startsWith(`${scope}/`))
}

function isSource(file: string) {
  const ext = path.extname(file)
  if (SOURCE_EXTS.has(ext)) return true
  if (ext) return false
  return content(file).startsWith("#!") // sonderr_change
}

// Parses the unified=0 diff for `file` against the selected target and returns:
//   - added: every added line number on the checked version
//   - revert: true when the file's diff removes any sonderr_change marker.
//     In that case the changes are reverting Sonderr modifications back to the
//     upstream baseline, so newly added lines (which are restoring upstream
//     content) should not require a marker. Refs that depended on a removed
//     Sonderr construct (e.g. `unixSkip(` → `unix(`) often live in different
//     hunks than the marker itself, so we use file-level detection rather
//     than hunk-level to avoid false positives on legitimate reverts.
function addedLines(file: string): { added: Set<number>; revert: boolean } {
  const added = new Set<number>()
  if (untracked(file).includes(file)) {
    const text = content(file)
    const count = text.split(/\r?\n/).length
    for (const n of Array.from({ length: count }, (_, i) => i + 1)) added.add(n)
    return { added, revert: false }
  }

  const diff = run("git", ["diff", "--unified=0", "--diff-filter=AMRT", ref, "--", file])
  let revert = false
  const all = diff.split("\n")

  let i = 0
  while (i < all.length) {
    const header = all[i] ?? ""
    const m = header.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/)
    if (!m) {
      i++
      continue
    }

    const start = Number(m[1])
    let pos = 0
    let j = i + 1
    while (j < all.length) {
      const hl = all[j] ?? ""
      if (hl.startsWith("@@") || hl.startsWith("diff ")) break
      if (hl.startsWith("+") && !hl.startsWith("+++")) {
        added.add(start + pos)
        pos++
      } else if (hl.startsWith("-") && !hl.startsWith("---") && hasMarker(hl.slice(1))) {
        revert = true
      }
      j++
    }

    i = j
  }

  return { added, revert }
}

// sonderr_change start
function content(file: string) {
  const abs = path.join(ROOT, file)
  if (existsSync(abs)) return readFileSync(abs, "utf8")

  const out = run("git", ["show", `HEAD:${file}`])
  const target = out.trim()
  if (!target.startsWith("../")) return out

  return readFileSync(path.resolve(path.dirname(abs), target), "utf8")
}
// sonderr_change end

// Matches the start of a sonderr_change marker in JS, JSX, YAML, TOML, and shell comments.
const MARKER_PREFIX = /(?:\/\/|\{?\s*\/\*|#)\s*sonderr_change\b/

function hasMarker(line: string) {
  return MARKER_PREFIX.test(line)
}

function coveredLines(text: string): { lines: string[]; covered: Set<number> } {
  const lines = text.split(/\r?\n/)
  const covered = new Set<number>()

  // Whole-file annotation: first non-shebang non-empty line is a sonderr_change - new file marker.
  const first = lines.find((x) => x.trim() !== "" && !x.startsWith("#!"))
  if (first?.match(/(?:\/\/|\{?\s*\/\*|#)\s*sonderr_change\s*-\s*new\s*file\b/)) {
    for (let i = 1; i <= lines.length; i++) covered.add(i)
    return { lines, covered }
  }

  let block = false
  for (let i = 0; i < lines.length; i++) {
    const n = i + 1
    const line = lines[i] ?? ""

    if (line.match(/(?:\/\/|\{?\s*\/\*|#)\s*sonderr_change\s+start\b/)) {
      block = true
      covered.add(n)
      continue
    }

    if (line.match(/(?:\/\/|\{?\s*\/\*|#)\s*sonderr_change\s+end\b/)) {
      covered.add(n)
      block = false
      continue
    }

    if (block) {
      covered.add(n)
      continue
    }

    if (hasMarker(line)) covered.add(n)
  }

  return { lines, covered }
}

// --- main ---

if (!worktree && isUpstreamMerge()) {
  console.log("Skipping shared upstream annotation check — upstream merge detected.")
  process.exit(0)
}

const files = changedFiles().filter((f) => isChecked(f) && !isExempt(f) && isSource(f))

if (files.length === 0) {
  console.log("No shared upstream source files changed — nothing to check.")
  process.exit(0)
}

const violations: string[] = []

for (const file of files) {
  const { added, revert } = addedLines(file)
  if (added.size === 0) continue
  if (revert) continue // sonderr_change - file is reverting Sonderr modifications back to upstream

  const text = content(file) // sonderr_change
  const { lines, covered } = coveredLines(text)

  for (const n of added) {
    const line = lines[n - 1] ?? ""
    const trim = line.trim()
    if (!trim) continue
    if (hasMarker(trim)) continue
    if (!covered.has(n)) violations.push(`  ${file}:${n}: ${trim}`)
  }
}

if (violations.length === 0) {
  console.log("All shared upstream changes are annotated with sonderr_change markers.")
  process.exit(0)
}

console.error(
  [
    "Unannotated Sonderr changes found in shared upstream files:",
    "",
    ...violations,
    "",
    "Every Sonderr-specific change in shared upstream source files must be annotated.",
    "",
    "Checked paths:",
    ...SCOPES.map((scope) => `  - ${scope}/**`),
    "",
    "Inline (single line):",
    "  const url = Flag.SONDERR_MODELS_URL || 'https://models.dev' // sonderr_change",
    "",
    "Block (multiple lines):",
    "  // sonderr_change start",
    "  ...",
    "  // sonderr_change end",
    "",
    "JSX/TSX (inside JSX templates):",
    "  {/* sonderr_change */}",
    "  {/* sonderr_change start */}",
    "  ...",
    "  {/* sonderr_change end */}",
    "",
    "YAML/TOML/shell:",
    "  # sonderr_change",
    "  # sonderr_change start",
    "  ...",
    "  # sonderr_change end",
    "",
    "New file:",
    "  // sonderr_change - new file",
    "",
    "Exempt paths (no markers needed):",
    "  - packages/cli/src/sonderr/**",
    "  - packages/cli/test/sonderr/**",
    "  - Any path containing 'sonderr' in the directory or filename",
    "  - Any directory starting with 'sonderr-' (e.g. sonderr-sessions/)",
    "  - script/upstream/**",
    "  - Sonderr-specific annotation checker support files",
    "",
    "See AGENTS.md for details.",
  ].join("\n"),
)

process.exit(1)
