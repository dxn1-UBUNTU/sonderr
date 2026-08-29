#!/usr/bin/env bun

import { Script } from "@sonderr/script"
import { $ } from "bun"
import { fileURLToPath } from "url"

console.log("=== publishing ===\n")

// sonderr_change start - keep JetBrains CLI pin reviewable outside CLI release commits
const jetbrainsPkg = fileURLToPath(new URL("../packages/sonderr-jetbrains/package.json", import.meta.url))
const jetbrainsPin = await Bun.file(jetbrainsPkg).text()
// sonderr_change end

// sonderr_change start - consume changesets on the publish runner so changelog
// changes are included in the release commit. Previously this ran in the
// version job on a separate runner whose workspace was discarded.
{
  await $`bun install`
  const paths = ["packages/sonderr-vscode/CHANGELOG.md", "packages/cli/CHANGELOG.md"]
  const before = new Map<string, string>()
  for (const p of paths) {
    before.set(
      p,
      await Bun.file(p)
        .text()
        .catch(() => ""),
    )
  }
  await $`bunx changeset version`
  // Changeset computes its own version from package.json, but we use
  // Script.version. Fix the heading in any changelog that was modified.
  for (const p of paths) {
    const content = await Bun.file(p)
      .text()
      .catch(() => "")
    if (content !== before.get(p)) {
      await Bun.write(p, content.replace(/^## .+$/m, `## ${Script.version}`))
    }
  }
}
// sonderr_change end

const pkgjsons = await Array.fromAsync(
  new Bun.Glob("**/package.json").scan({
    absolute: true,
  }),
).then((arr) => arr.filter((x) => !x.includes("node_modules") && !x.includes("dist")))

for (const file of pkgjsons) {
  // sonderr_change start - create a follow-up PR for JetBrains CLI pin bumps
  if (file === jetbrainsPkg) {
    console.log("preserved JetBrains CLI pin:", file)
    await Bun.file(file).write(jetbrainsPin)
    continue
  }
  // sonderr_change end
  let pkg = await Bun.file(file).text()
  pkg = pkg.replaceAll(/"version": "[^"]+"/g, `"version": "${Script.version}"`)
  console.log("updated:", file)
  await Bun.file(file).write(pkg)
}

const extensionToml = fileURLToPath(new URL("../packages/extensions/zed/extension.toml", import.meta.url))
let toml = await Bun.file(extensionToml).text()
toml = toml.replace(/^version = "[^"]+"/m, `version = "${Script.version}"`)
toml = toml.replaceAll(/releases\/download\/v[^/]+\//g, `releases/download/v${Script.version}/`)
console.log("updated:", extensionToml)
await Bun.file(extensionToml).write(toml)

await $`bun install`
await import(`../packages/sdk/js/script/build.ts`)

if (Script.release) {
  // sonderr_change start - commit, tag, and push with rebase + retry to handle
  // concurrent merges to main. Rebase (instead of cherry-pick) handles
  // overlapping file changes cleanly, and the retry loop covers the narrow
  // window between fetch and push where another commit could land.
  await $`git commit -am "release: v${Script.version}"`
  await $`git tag v${Script.version}`
  const retries = 3
  for (let i = 1; i <= retries; i++) {
    await $`git fetch origin main`
    const rebase = await $`git rebase origin/main`.nothrow()
    if (rebase.exitCode !== 0) {
      console.error(`rebase failed (attempt ${i}/${retries}), aborting rebase`)
      await $`git rebase --abort`.nothrow()
      if (i === retries)
        throw new Error("failed to rebase release commit onto origin/main after " + retries + " attempts")
      await new Promise((r) => setTimeout(r, 3_000))
      continue
    }
    const push = await $`git push origin HEAD:main --tags --no-verify --force-with-lease`.nothrow()
    if (push.exitCode === 0) {
      console.log("release commit pushed successfully")
      break
    }
    console.warn(`push rejected (attempt ${i}/${retries}), retrying...`)
    if (i === retries) throw new Error("failed to push release commit after " + retries + " attempts")
    await new Promise((r) => setTimeout(r, 3_000))
  }
  // sonderr_change end

  // sonderr_change start - publish channel-aware GitHub release notes
  const { publishNotes } = await import("./sonderr/release-notes")
  await publishNotes({
    version: Script.version,
    prerelease: Script.preview,
    repo: process.env.GH_REPO,
    temp: process.env.RUNNER_TEMP,
  })
  // sonderr_change end
}

console.log("\n=== cli ===\n")
await import(`../packages/cli/script/publish.ts`)

// sonderr_change - Sonderr does not ship the upstream preview CLI package

console.log("\n=== sdk ===\n")
await import(`../packages/sdk/js/script/publish.ts`)

console.log("\n=== plugin ===\n")
await import(`../packages/plugin/script/publish.ts`)

// sonderr_change - Sonderr does not publish the upstream-owned @sonderr/ui package

// sonderr_change start
console.log("\n=== vscode ===\n")
await import(`../packages/sonderr-vscode/script/publish.ts`)
// sonderr_change end

// sonderr_change start - Sonderr does not ship the sonderr desktop app
// if (Script.release) {
//   await $`bun ./packages/desktop/scripts/finalize-latest-json.ts`
//   await $`bun ./packages/desktop/scripts/finalize-latest-yml.ts`
// }
// sonderr_change end

const dir = fileURLToPath(new URL("..", import.meta.url))
process.chdir(dir)

// sonderr_change start - non-blocking JetBrains CLI pin bump PR after stable CLI release
await createJetbrainsPinPr()
// sonderr_change end

// sonderr_change start
async function createJetbrainsPinPr() {
  console.log("\n=== jetbrains cli pin bump pr ===\n")
  if (!Script.release) {
    console.log("Skipping JetBrains CLI pin bump PR: not a release build")
    return
  }
  if (Script.preview) {
    console.log(`Skipping JetBrains CLI pin bump PR for pre-release v${Script.version}`)
    return
  }
  const result =
    await $`bun .sonderr/skills/release-jetbrains/script/set-pin.ts --version ${Script.version} --pr`.nothrow()
  const out = result.stdout.toString().trim()
  const err = result.stderr.toString().trim()
  if (result.exitCode === 0) {
    if (out) console.log(out)
    const url = out.match(/https:\/\/github\.com\/\S+\/pull\/\d+/)?.[0]
    if (url) console.log(`::notice title=JetBrains CLI pin bump PR::${url}`)
    return
  }
  console.warn("JetBrains CLI pin bump PR creation failed; release will continue.")
  if (out) console.warn(out)
  if (err) console.warn(err)
  console.warn(
    "::warning title=JetBrains CLI pin bump PR failed::Release completed, but the JetBrains CLI pin bump PR was not created. Check the logs above and create it manually if needed.",
  )
}
// sonderr_change end
