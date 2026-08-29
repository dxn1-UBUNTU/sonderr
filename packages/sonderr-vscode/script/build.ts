#!/usr/bin/env bun
import { $ } from "bun"
import { join } from "node:path"
import { existsSync, mkdirSync, rmSync, chmodSync } from "node:fs"
import {
  copySonderrSandboxWorker,
  copySandboxResources,
  copyTreeSitterResources,
} from "../src/services/cli-backend/cli-resources"
import { ensureFfmpegForTarget } from "./ffmpeg-helper"

const packageJsonPath = join(import.meta.dir, "..", "package.json")
const packageJson = await Bun.file(packageJsonPath).json()
const version = process.env.SONDERR_VERSION ? process.env.SONDERR_VERSION : packageJson.version
const prerelease = process.env.SONDERR_PRE_RELEASE === "true"

console.log(`Building VSCode extension version: ${version}${prerelease ? " (pre-release)" : ""}`)

if (packageJson.version !== version) {
  console.log(`Updating package.json version from ${packageJson.version} to ${version}`)
  packageJson.version = version
  await Bun.write(packageJsonPath, JSON.stringify(packageJson, null, 2) + "\n")
}

const cliDistDir = process.env.CLI_DIST_DIR || join(import.meta.dir, "..", "..", "sonderr", "dist")
console.log(`Using CLI dist directory: ${cliDistDir}`)

if (!existsSync(cliDistDir)) {
  throw new Error(`CLI dist directory not found: ${cliDistDir}`)
}

const targets = [
  { target: "linux-x64", cliDir: "@sonderr/cli-linux-x64", binary: "sonderr" },
  { target: "linux-arm64", cliDir: "@sonderr/cli-linux-arm64", binary: "sonderr" },
  { target: "alpine-x64", cliDir: "@sonderr/cli-linux-x64-musl", binary: "sonderr" },
  { target: "alpine-arm64", cliDir: "@sonderr/cli-linux-arm64-musl", binary: "sonderr" },
  { target: "darwin-x64", cliDir: "@sonderr/cli-darwin-x64", binary: "sonderr" },
  { target: "darwin-arm64", cliDir: "@sonderr/cli-darwin-arm64", binary: "sonderr" },
  { target: "win32-x64", cliDir: "@sonderr/cli-windows-x64", binary: "sonderr.exe" },
  { target: "win32-arm64", cliDir: "@sonderr/cli-windows-arm64", binary: "sonderr.exe" },
]

const binDir = join(import.meta.dir, "..", "bin")
const distDir = join(import.meta.dir, "..", "dist")
const outDir = join(import.meta.dir, "..", "out")

console.log("\n🧹 Cleaning up directories...")
for (const dir of [binDir, distDir, outDir]) {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true })
    console.log(`  ✓ Cleaned ${dir}`)
  }
}

mkdirSync(outDir, { recursive: true })
mkdirSync(distDir, { recursive: true })

console.log("\n🔄 Rebuilding SDK types (ensures dist/ is in sync with server API)...")
await $`bun run --cwd ${join(import.meta.dir, "..", "..", "sdk", "js")} build`

console.log("\n📦 Compiling extension...")
await $`bun run check-types`
await $`bun run lint`
await $`node ${join(import.meta.dir, "..", "esbuild.js")} --production`

for (const config of targets) {
  console.log(`\n🎯 Processing target: ${config.target}`)

  if (existsSync(binDir)) {
    rmSync(binDir, { recursive: true, force: true })
  }
  mkdirSync(binDir, { recursive: true })

  const sourceBinary = join(cliDistDir, config.cliDir, "bin", config.binary)
  const targetBinary = join(binDir, config.binary)

  if (!existsSync(sourceBinary)) {
    throw new Error(`CLI binary not found at ${sourceBinary}`)
  }

  console.log(`  📥 Copying binary from ${config.cliDir}/bin/${config.binary}...`)
  await $`cp ${sourceBinary} ${targetBinary}`
  await copyTreeSitterResources(sourceBinary, targetBinary)
  await copySandboxResources(sourceBinary, targetBinary)
  await copySonderrSandboxWorker(sourceBinary, targetBinary)

  if (config.binary !== "sonderr.exe") {
    chmodSync(targetBinary, 0o755)
  }

  console.log(`  ✅ Binary ready at ${targetBinary}`)

  console.log("Adding bundled FFmpeg helper...")
  await ensureFfmpegForTarget(config.target, binDir)

  console.log(`  📦 Packaging .vsix for ${config.target}${prerelease ? " (pre-release)" : ""}...`)
  const vsixPath = join(outDir, `sonderr-vscode-${config.target}.vsix`)
  const args = ["--no-dependencies", "--skip-license", "--target", config.target, "-o", vsixPath]
  if (prerelease) args.push("--pre-release")
  await $`vsce package ${args}`.env({
    ...process.env,
    npm_config_ignore_scripts: "true",
  })
  console.log(`  ✅ Created ${vsixPath}`)
}

console.log("\n✨ All VSIX packages built successfully!")
