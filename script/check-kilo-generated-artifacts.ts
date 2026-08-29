#!/usr/bin/env bun
// sonderr_change - new file

/**
 * Guards generated Sonderr config dependency artifacts.
 *
 * Sonderr loads project config from .sonderr/ and .sonderr/ and installs
 * @sonderr/plugin there at runtime. npm writes package.json, lockfiles,
 * .gitignore, and node_modules as generated local state. These paths must stay
 * untracked so background installs do not create recurring branch diffs.
 */

import { spawnSync } from "node:child_process"

const paths = [
  ".sonderr/.gitignore",
  ".sonderr/package.json",
  ".sonderr/package-lock.json",
  ".sonderr/pnpm-lock.yaml",
  ".sonderr/bun.lock",
  ".sonderr/yarn.lock",
  ".sonderr/node_modules",
  ".sonderr/.gitignore",
  ".sonderr/package.json",
  ".sonderr/package-lock.json",
  ".sonderr/pnpm-lock.yaml",
  ".sonderr/bun.lock",
  ".sonderr/yarn.lock",
  ".sonderr/node_modules",
]

const git = spawnSync("git", ["ls-files", "-z", "--", ...paths], { encoding: "utf8" })

if (git.status !== 0) {
  console.error(git.stderr.trim() || "git ls-files failed")
  process.exit(1)
}

const bad = git.stdout.split("\0").filter(Boolean).sort()

if (bad.length === 0) {
  console.log("check-sonderr-generated-artifacts: ok")
  process.exit(0)
}

console.error("Generated Sonderr config dependency artifacts are tracked:")
for (const file of bad) console.error(`  ${file}`)
console.error("")
console.error("These files are created by runtime dependency installs in .sonderr/ and .sonderr/.")
console.error("Remove them from git and keep them ignored.")
process.exit(1)
