import { readdirSync, readFileSync } from "node:fs"
import { join, relative } from "node:path"
import { describe, expect, test } from "bun:test"

// sonderr_change start - branding tripwire
// Upstream syncs keep trying to reintroduce kilocode branding (ASCII art, UI
// strings, prompt text) into the TUI/CLI sources. This test fails the build
// the moment any of it sneaks back in, so "kilo code" can never ship again.
//
// Scope: every source file under packages/cli/src and packages/tui/src (the
// two packages whose output a user actually sees), plus electron/ and
// gui-wizard/. Docs/tests/upstream-sync scripts are out of scope: they are
// allowed to MENTION the heritage (this file does too), surfaces must not
// display it.

const TEST_DIR = import.meta.dir // packages/cli/test
const REPO_ROOT = join(TEST_DIR, "../../..")
const ROOTS = [
  join(REPO_ROOT, "packages/cli/src"),
  join(REPO_ROOT, "packages/tui/src"),
  join(REPO_ROOT, "electron"),
]

const EXTS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".cjs",
  ".mjs",
  ".txt",
  ".md",
  ".json",
  ".html",
  ".css",
  ".sh",
])

// Files allowed to contain heritage strings, with the reason:
// - sources.ts reads legacy ".kilo"/".kilocode" config dirs for compat
// - tui/src/logo.ts documents that the old KILO/GO art was replaced
// - const.ts sends a kilocode.ai HTTP-Referer header to provider APIs
//   (functional attribution, never rendered on screen)
// - docs/skills .md files ship inside the package but are agent-facing
//   documentation of the gateway API, whose real hostnames are kilo.ai
const ALLOWED_FILES = new Set([
  "packages/cli/src/sonderr/config/sources.ts",
  "packages/tui/src/logo.ts",
  "packages/cli/src/sonderr/const.ts",
  "packages/cli/src/sonderr/docs/migration.md",
  "packages/cli/src/sonderr/skills/sonderr-config.md",
])

// Rendered-branding patterns: the phrase in any casing/separator, the bare
// uppercase word used by the art, and the kilocode domains users would see.
const BANNED = [
  /kilo[\s_.-]*code/i,
  /\bKILO\b/,
  /\bKILOCODE\b/i,
  /kilocode\.(ai|com|dev|app|io)/i,
]

function* walk(dir: string): Generator<string> {
  let entries: string[]
  try {
    entries = readdirSync(dir, { withFileTypes: true }).map((e) => e.name)
  } catch {
    return
  }
  for (const name of entries) {
    if (name === "node_modules" || name === "dist" || name.startsWith(".")) continue
    const full = join(dir, name)
    let isDir = false
    try {
      isDir = readdirSync(full, { withFileTypes: true }) !== undefined
    } catch {
      isDir = false
    }
    if (isDir) yield* walk(full)
    else if (EXTS.has(name.slice(name.lastIndexOf(".")))) yield full
  }
}

describe("branding tripwire", () => {
  test("no kilocode branding in user-visible sources", () => {
    const offenders: string[] = []
    let scanned = 0
    for (const root of ROOTS) {
      for (const file of walk(root)) {
        scanned++
        const rel = relative(REPO_ROOT, file).replace(/\\/g, "/")
        if (ALLOWED_FILES.has(rel)) continue
        const text = readFileSync(file, "utf8")
        const lines = text.split("\n")
        for (let i = 0; i < lines.length; i++) {
          for (const pattern of BANNED) {
            if (pattern.test(lines[i])) {
              offenders.push(`${rel}:${i + 1} ${lines[i].trim().slice(0, 120)}`)
              break
            }
          }
        }
      }
    }
    // Guard against vacuous passes: the scan must have actually covered the
    // known surfaces (regression would mean ROOTS rotted).
    expect(scanned).toBeGreaterThan(1000)
    expect(offenders).toEqual([])
  })

  test("tripwire itself is wired (sanity)", () => {
    // Proves the patterns actually match kilocode branding, so the main test
    // can never silently pass because a regex rotted.
    expect(/kilo[\s_.-]*code/i.test("Kilo Code")).toBe(true)
    expect(/kilo[\s_.-]*code/i.test("KiloCode")).toBe(true)
    expect(/\bKILO\b/.test("the KILO art")).toBe(true)
    expect(/\bKILO\b/.test("kilobytes")).toBe(false)
  })
})
// sonderr_change end
