#!/usr/bin/env node

const childProcess = require("child_process")
const fs = require("fs")
const path = require("path")
const os = require("os")

const forwardedSignals = ["SIGINT", "SIGTERM", "SIGHUP"]

// sonderr_change start - point packaged binaries at co-located tree-sitter WASM resources
function configureTreeSitterResources(target) {
  const wasmDir = path.join(path.dirname(target), "tree-sitter")
  if (!process.env.SONDERR_TREE_SITTER_WASM_DIR && fs.existsSync(path.join(wasmDir, "tree-sitter.wasm"))) {
    process.env.SONDERR_TREE_SITTER_WASM_DIR = wasmDir
  }
}
// sonderr_change end

function run(target, fallback) {
  // sonderr_change - preserve cached binary fallback
  configureTreeSitterResources(target) // sonderr_change
  // sonderr_change start - fall through if the cached binary cannot be spawned
  const child = (() => {
    try {
      return childProcess.spawn(target, process.argv.slice(2), {
        stdio: "inherit",
      })
    } catch (error) {
      if (fallback) {
        run(fallback)
        return
      }
      console.error(error.message)
      process.exit(1)
    }
  })()
  if (!child) return
  // sonderr_change end

  const forwarders = {}
  const clear = () => {
    // sonderr_change - remove listeners before cached binary fallback
    for (const signal of forwardedSignals) {
      process.removeListener(signal, forwarders[signal])
    }
  }

  child.on("error", (error) => {
    clear() // sonderr_change
    // sonderr_change start - fall through to findBinary() if cached binary fails
    if (fallback) {
      run(fallback)
      return
    }
    // sonderr_change end
    console.error(error.message)
    process.exit(1)
  })

  for (const signal of forwardedSignals) {
    forwarders[signal] = () => {
      try {
        child.kill(signal)
      } catch {
        // The child may have already exited.
      }
    }
    process.on(signal, forwarders[signal])
  }

  child.on("exit", (code, signal) => {
    clear() // sonderr_change

    if (signal) {
      process.kill(process.pid, signal)
      return
    }

    process.exit(typeof code === "number" ? code : 0)
  })
}

// sonderr_change start - run from source when no platform binary is available (dev checkouts)
function findSource(startDir) {
  let current = startDir
  for (;;) {
    const manifest = path.join(current, "package.json")
    const entry = path.join(current, "src", "index.ts")
    if (fs.existsSync(manifest) && fs.existsSync(entry)) {
      try {
        if (JSON.parse(fs.readFileSync(manifest, "utf8")).name === "@sonderr/cli") return current
      } catch {
        // unreadable manifest - keep walking
      }
    }
    const parent = path.dirname(current)
    if (parent === current) {
      return
    }
    current = parent
  }
}

function runSource(bun, packageDir) {
  // Spawn from the CLI package directory so Bun's module resolution and tsconfig
  // handling are identical for every launch directory, and pass the user's real
  // directory via SONDERR_DEV_CWD (the same wrapper contract sonderr-dev uses)
  // so the TUI opens the project the user actually ran `sonderr` in.
  const entry = path.join(packageDir, "src", "index.ts")
  const userCwd = fs.realpathSync(process.cwd())
  const spawnCwd = fs.realpathSync(packageDir)
  const env = { ...process.env }
  if (userCwd !== spawnCwd) {
    // Same wrapper contract as sonderr-dev: run from the checkout, but keep the
    // user's directory as the project via SONDERR_DEV_CWD. PWD is updated to
    // match the spawn cwd so "stale PWD" guards inside the app stay consistent.
    if (env.SONDERR_DEV_CWD === undefined) env.SONDERR_DEV_CWD = userCwd
    env.PWD = spawnCwd
  }

  const child = (() => {
    try {
      return childProcess.spawn(bun, ["run", "--conditions=browser", entry, ...process.argv.slice(2)], {
        stdio: "inherit",
        cwd: spawnCwd,
        env,
      })
    } catch (error) {
      console.error(error.message)
      process.exit(1)
    }
  })()
  if (!child) return

  const forwarders = {}
  const clear = () => {
    for (const signal of forwardedSignals) {
      process.removeListener(signal, forwarders[signal])
    }
  }

  child.on("error", (error) => {
    clear()
    console.error(`[sonderr] failed to launch Bun (${error.message}). Install it manually: https://bun.sh`)
    process.exit(1)
  })

  for (const signal of forwardedSignals) {
    forwarders[signal] = () => {
      try {
        child.kill(signal)
      } catch {
        // The child may have already exited.
      }
    }
    process.on(signal, forwarders[signal])
  }

  child.on("exit", (code, signal) => {
    clear()

    if (signal) {
      process.kill(process.pid, signal)
      return
    }

    process.exit(typeof code === "number" ? code : 0)
  })
}
// sonderr_change end

// sonderr_change start - source bootstrap: locate/download Bun + install workspace deps
function bunVersion(bun) {
  const probe = childProcess.spawnSync(bun, ["--version"], { encoding: "utf8" })
  return probe.status === 0 ? (probe.stdout || "").trim() : undefined
}

function bunBin() {
  return process.platform === "win32" ? "bun.exe" : "bun"
}

// The official installer targets the passwd home (not $HOME) unless BUN_INSTALL
// is set, so probe every plausible location before deciding Bun is missing.
function bunCandidates() {
  const candidates = []
  if (process.env.BUN_INSTALL) candidates.push(path.join(process.env.BUN_INSTALL, "bin", bunBin()))
  candidates.push(path.join(os.homedir(), ".bun", "bin", bunBin()))
  if (process.platform !== "win32") {
    try {
      const passwdHome = childProcess
        .spawnSync("/bin/bash", ["-c", 'eval echo "~$(id -un)"'], { encoding: "utf8" })
        .stdout?.trim()
      if (passwdHome) candidates.push(path.join(passwdHome, ".bun", "bin", bunBin()))
    } catch {
      // passwd lookup unavailable - skip
    }
  }
  return [...new Set(candidates)]
}

function findBun() {
  const override = process.env.SONDERR_BUN_PATH
  if (override && fs.existsSync(override)) return override
  if (bunVersion("bun")) return "bun"
  for (const candidate of bunCandidates()) {
    if (fs.existsSync(candidate) && bunVersion(candidate)) return candidate
  }
}

function installBun() {
  console.error("[sonderr] Bun not found - downloading the official installer...")
  if (platform === "windows") {
    const script = 'irm bun.sh/install.ps1 | iex'
    for (const exe of ["powershell.exe", "pwsh.exe", "pwsh", "powershell"]) {
      try {
        const result = childProcess.spawnSync(exe, ["-NoProfile", "-NonInteractive", "-Command", script], {
          stdio: "inherit",
          timeout: 300000,
        })
        if (result.status === 0) break
      } catch {
        continue
      }
    }
  } else {
    const oneLiner = (() => {
      try {
        if (childProcess.spawnSync("curl", ["--version"], { stdio: "ignore" }).status === 0) {
          return "curl -fsSL https://bun.sh/install | bash"
        }
      } catch {}
      try {
        if (childProcess.spawnSync("wget", ["--version"], { stdio: "ignore" }).status === 0) {
          return "wget -qO- https://bun.sh/install | bash"
        }
      } catch {}
    })()
    if (!oneLiner) {
      console.error("[sonderr] neither curl nor wget is available - cannot download Bun automatically")
      return
    }
    const shell = fs.existsSync("/bin/bash") ? "/bin/bash" : "sh"
    const result = childProcess.spawnSync(shell, ["-c", oneLiner], { stdio: "inherit", timeout: 300000 })
    if (result.status !== 0) {
      console.error("[sonderr] the Bun installer failed - install it manually: https://bun.sh")
      return
    }
  }
  for (const candidate of bunCandidates()) {
    if (fs.existsSync(candidate) && bunVersion(candidate)) {
      console.error(`[sonderr] Bun ${bunVersion(candidate)} installed to ${candidate}`)
      return candidate
    }
  }
  console.error("[sonderr] Bun was installed but could not be found - restart your shell or set SONDERR_BUN_PATH")
}

function findWorkspaceRoot(startDir) {
  let current = startDir
  for (;;) {
    if (fs.existsSync(path.join(current, "bun.lock")) || fs.existsSync(path.join(current, "bun.lockb"))) {
      return current
    }
    const parent = path.dirname(current)
    if (parent === current) {
      return
    }
    current = parent
  }
}

function depsFingerprint(workspaceRoot) {
  const inputs = ["bun.lock", "bun.lockb", "package.json"]
  try {
    for (const name of fs.readdirSync(path.join(workspaceRoot, "packages"))) {
      inputs.push(path.join("packages", name, "package.json"))
    }
  } catch {
    // not a workspace checkout - root inputs only
  }
  const parts = []
  for (const rel of inputs) {
    try {
      parts.push(rel + ":" + Math.round(fs.statSync(path.join(workspaceRoot, rel)).mtimeMs))
    } catch {
      // missing file - skip
    }
  }
  return parts.join("|")
}

function ensureDeps(bun, workspaceRoot) {
  if (!workspaceRoot) return
  const modules = path.join(workspaceRoot, "node_modules")
  if (!fs.existsSync(modules)) {
    console.error("[sonderr] first run - installing dependencies (this can take a minute)...")
  }
  const stampPath = path.join(modules, ".sonderr-source-stamp")
  const fingerprint = depsFingerprint(workspaceRoot)
  if (fs.existsSync(stampPath)) {
    try {
      if (fs.readFileSync(stampPath, "utf8") === fingerprint) return
    } catch {
      // unreadable stamp - reinstall
    }
  }
  console.error("[sonderr] syncing dependencies with bun install...")
  let result = childProcess.spawnSync(bun, ["install", "--frozen-lockfile", "--linker=hoisted"], { cwd: workspaceRoot, stdio: "inherit" })
  if (result.status !== 0) {
    console.error("[sonderr] lockfile out of date - updating...")
    result = childProcess.spawnSync(bun, ["install", "--linker=hoisted"], { cwd: workspaceRoot, stdio: "inherit" })
    if (result.status !== 0) {
      console.error("[sonderr] bun install failed - if the lockfile needs a newer Bun, run: bun upgrade")
      process.exit(result.status === null ? 1 : result.status)
    }
    console.error("[sonderr] note: bun.lock was updated - commit it if your checkout tracks it")
  }
  // stamp with the post-install fingerprint - bun install may rewrite bun.lock,
  // and a pre-install fingerprint would trigger a resync on every launch
  const settled = depsFingerprint(workspaceRoot)
  try {
    fs.mkdirSync(modules, { recursive: true })
    fs.writeFileSync(stampPath, settled)
  } catch {
    // stamp is best-effort
  }
}

// sonderr_change start - keep the checkout fresh: git pull before the toolchain dance
function gitRoot(startDir) {
  let current = startDir
  for (;;) {
    if (fs.existsSync(path.join(current, ".git"))) return current
    const parent = path.dirname(current)
    if (parent === current) {
      return
    }
    current = parent
  }
}

function updateSource(startDir) {
  if (process.env.SONDERR_NO_UPDATE || process.env.SONDERR_NO_BOOTSTRAP) return
  const root = gitRoot(startDir)
  if (!root) return
  try {
    if (childProcess.spawnSync("git", ["--version"], { stdio: "ignore" }).status !== 0) return
  } catch {
    return
  }
  console.error("[sonderr] updating Sonderr (git pull)...")
  const result = childProcess.spawnSync(
    "git",
    ["pull", "--ff-only", "--autostash"],
    {
      cwd: root,
      stdio: "inherit",
      timeout: 120000,
      env: {
        ...process.env,
        GIT_TERMINAL_PROMPT: "0",
        GIT_SSH_COMMAND: "ssh -oBatchMode=yes",
      },
    },
  )
  if (result.status !== 0) {
    console.error("[sonderr] git pull failed (offline, diverged, or auth required) - continuing with the local checkout")
  }
}
// sonderr_change end

const envPath = process.env.SONDERR_BIN_PATH

const scriptPath = fs.realpathSync(__filename)
const scriptDir = path.dirname(scriptPath)

const cached = path.join(scriptDir, ".sonderr")

const platformMap = {
  darwin: "darwin",
  linux: "linux",
  win32: "windows",
}
const archMap = {
  x64: "x64",
  arm64: "arm64",
  arm: "arm",
}

let platform = platformMap[os.platform()]
if (!platform) {
  platform = os.platform()
}
let arch = archMap[os.arch()]
if (!arch) {
  arch = os.arch()
}
const base = "@sonderr/cli-" + platform + "-" + arch
const binary = platform === "windows" ? "sonderr.exe" : "sonderr"

function supportsAvx2() {
  if (arch !== "x64") return false

  if (platform === "linux") {
    try {
      return /(^|\s)avx2(\s|$)/i.test(fs.readFileSync("/proc/cpuinfo", "utf8"))
    } catch {
      return false
    }
  }

  if (platform === "darwin") {
    try {
      const result = childProcess.spawnSync("sysctl", ["-n", "hw.optional.avx2_0"], {
        encoding: "utf8",
        timeout: 1500,
      })
      if (result.status !== 0) return false
      return (result.stdout || "").trim() === "1"
    } catch {
      return false
    }
  }

  if (platform === "windows") {
    const cmd =
      '(Add-Type -MemberDefinition "[DllImport(""kernel32.dll"")] public static extern bool IsProcessorFeaturePresent(int ProcessorFeature);" -Name Kernel32 -Namespace Win32 -PassThru)::IsProcessorFeaturePresent(40)'

    for (const exe of ["powershell.exe", "pwsh.exe", "pwsh", "powershell"]) {
      try {
        const result = childProcess.spawnSync(exe, ["-NoProfile", "-NonInteractive", "-Command", cmd], {
          encoding: "utf8",
          timeout: 3000,
          windowsHide: true,
        })
        if (result.status !== 0) continue
        const out = (result.stdout || "").trim().toLowerCase()
        if (out === "true" || out === "1") return true
        if (out === "false" || out === "0") return false
      } catch {
        continue
      }
    }

    return false
  }

  return false
}

const names = (() => {
  const avx2 = supportsAvx2()
  const baseline = arch === "x64" && !avx2

  if (platform === "linux") {
    const musl = (() => {
      try {
        if (fs.existsSync("/etc/alpine-release")) return true
      } catch {
        // ignore
      }

      try {
        const result = childProcess.spawnSync("ldd", ["--version"], { encoding: "utf8" })
        const text = ((result.stdout || "") + (result.stderr || "")).toLowerCase()
        if (text.includes("musl")) return true
      } catch {
        // ignore
      }

      return false
    })()

    if (musl) {
      if (arch === "x64") {
        if (baseline) return [`${base}-baseline-musl`, `${base}-musl`, `${base}-baseline`, base]
        return [`${base}-musl`, `${base}-baseline-musl`, base, `${base}-baseline`]
      }
      return [`${base}-musl`, base]
    }

    if (arch === "x64") {
      if (baseline) return [`${base}-baseline`, base, `${base}-baseline-musl`, `${base}-musl`]
      return [base, `${base}-baseline`, `${base}-musl`, `${base}-baseline-musl`]
    }
    return [base, `${base}-musl`]
  }

  if (arch === "x64") {
    if (baseline) return [`${base}-baseline`, base]
    return [base, `${base}-baseline`]
  }
  return [base]
})()

function findBinary(startDir) {
  let current = startDir
  for (;;) {
    const modules = path.join(current, "node_modules")
    if (fs.existsSync(modules)) {
      for (const name of names) {
        const candidate = path.join(modules, name, "bin", binary)
        if (fs.existsSync(candidate)) return candidate
      }
    }
    const parent = path.dirname(current)
    if (parent === current) {
      return
    }
    current = parent
  }
}

const resolved = envPath || (fs.existsSync(cached) ? cached : findBinary(scriptDir))

if (resolved) {
  run(resolved, resolved === cached ? findBinary(scriptDir) : undefined) // sonderr_change - preserve cached binary fallback
} else {
  // sonderr_change start - full source bootstrap: bun, workspace deps, then run
  const source = findSource(scriptDir)
  if (!source) {
    console.error(
      "It seems that your package manager failed to install the right version of the Sonderr CLI for your platform. You can try manually installing " +
        names.map((n) => `\"${n}\"`).join(" or ") +
        " package",
    )
    process.exit(1)
  }

  const workspaceRoot = findWorkspaceRoot(path.dirname(source))

  // sonderr_change start - full one-shot launch: git pull, bun, deps, then the TUI
  updateSource(path.dirname(source))

  let bun = findBun()
  if (!bun && process.env.SONDERR_NO_BOOTSTRAP) {
    console.error("[sonderr] SONDERR_NO_BOOTSTRAP is set but Bun was not found. Install it from https://bun.sh")
    process.exit(1)
  }
  if (!bun) {
    bun = installBun()
  }
  if (!bun) {
    console.error("[sonderr] Bun is required to run Sonderr from source. Install it from https://bun.sh and re-run.")
    process.exit(1)
  }

  ensureDeps(bun, workspaceRoot)

  runSource(bun, source)
  // sonderr_change end
}
