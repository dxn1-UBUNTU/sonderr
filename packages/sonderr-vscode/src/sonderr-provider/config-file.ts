import { existsSync } from "fs"
import * as os from "os"
import * as path from "path"

export type Scope = "global" | "local"

// sonderr_change - the rebrand transform collapsed distinct kilo/opencode/kilocode
// entries into duplicated "sonderr" members; the union below is the de-duplicated
// post-rebrand set (legacy kilo/opencode config migration lives in the CLI).
export type Source =
  | "sourceXdg"
  | "sourceHomeSonderr"
  | "sourceEnvFile"
  | "sourceEnvDir"
  | "sourceEnvContent"
  | "sourceProjectSonderr"
  | "sourceProjectRoot"

export interface Entry {
  file?: string
  name: string
  source: Source
  exists: boolean
  loaded: boolean
  legacy?: boolean
  recommended?: boolean
  virtual?: boolean
}

const SCHEMA = "https://app.kilo.ai/config.json"

const MODERN = ["sonderr.jsonc", "sonderr.json"]
const LEGACY = ["config.json"]
const FILES = [...MODERN, ...LEGACY]
const GLOBAL = [...MODERN, ...LEGACY]
const HOME = [".sonderr"]
const SOURCES: Record<string, Source> = {
  ".sonderr": "sourceHomeSonderr",
}

function row(file: string, source: Source, loaded = true, recommended = false): Entry {
  const name = path.basename(file)
  return {
    file,
    name,
    source,
    exists: existsSync(file),
    loaded: loaded && existsSync(file),
    legacy: name.startsWith("sonderr") || name === "config.json" || file.includes(`${path.sep}.sonderr${path.sep}`),
    recommended,
  }
}

function ensure(list: Entry[], file: string, source: Source) {
  if (list.some((item) => item.file === file)) return list
  return [...list, row(file, source, true, true)]
}

export function globalFiles() {
  const root = path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config"), "sonderr")
  const base = GLOBAL.map((file) => row(path.join(root, file), "sourceXdg")).filter((item) => item.exists)
  const dirs = HOME.flatMap((dir) => {
    const base = path.join(os.homedir(), dir)
    if (!existsSync(base)) return []
    return FILES.map((file) => row(path.join(base, file), SOURCES[dir])).filter((item) => item.exists)
  })
  const env = process.env.SONDERR_CONFIG ? [row(process.env.SONDERR_CONFIG, "sourceEnvFile")] : []
  const extra = process.env.SONDERR_CONFIG_DIR
  const dir = extra
    ? ensure(
        FILES.map((file) => row(path.join(extra, file), "sourceEnvDir")).filter((item) => item.exists),
        path.join(extra, "sonderr.jsonc"),
        "sourceEnvDir",
      )
    : []
  const virtual: Entry[] = process.env.SONDERR_CONFIG_CONTENT
    ? [
        {
          name: "SONDERR_CONFIG_CONTENT",
          source: "sourceEnvContent",
          exists: true,
          loaded: true,
          virtual: true,
        },
      ]
    : []

  return ensure([...base, ...dirs, ...env, ...dir, ...virtual], path.join(root, "sonderr.jsonc"), "sourceXdg")
}

export function localFiles(root: string) {
  const enabled = !process.env.SONDERR_DISABLE_PROJECT_CONFIG
  const dirs = [root, path.join(root, ".sonderr")]
  const list = dirs.flatMap((dir) => FILES.map((file) => row(path.join(dir, file), localSource(root, dir), enabled)))
  return ensure(
    list.filter((item) => item.exists),
    path.join(root, ".sonderr", "sonderr.jsonc"),
    "sourceProjectSonderr",
  ).map((item) => (enabled ? item : { ...item, loaded: false }))
}

function localSource(root: string, dir: string) {
  if (dir === root) return "sourceProjectRoot"
  return "sourceProjectSonderr"
}

export function content() {
  return `{
  "$schema": "${SCHEMA}"
}
`
}
