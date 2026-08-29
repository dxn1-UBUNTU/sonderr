import { afterEach, describe, expect, test } from "bun:test"
import path from "path"
import fs from "fs/promises"
import { Flag } from "@sonderr/core/flag/flag"
import * as Log from "@sonderr/core/util/log"
import { Server } from "../../../src/server/server"
import { resetDatabase } from "../../fixture/db"
import { disposeAllInstances, tmpdir } from "../../fixture/fixture"

void Log.init({ print: false })

type Source = {
  order: number
  kind: string
  scope: string
  label: string
  source: string
  path?: string
  exists: boolean
  editable: boolean
  reason?: string
}

type Body = {
  sources: Source[]
}

const env = {
  SONDERR_CONFIG: process.env.SONDERR_CONFIG,
  SONDERR_CONFIG_CONTENT: process.env.SONDERR_CONFIG_CONTENT,
  SONDERR_CONFIG_DIR: process.env.SONDERR_CONFIG_DIR,
  SONDERR_DISABLE_PROJECT_CONFIG: process.env.SONDERR_DISABLE_PROJECT_CONFIG,
  SONDERR_TEST_MANAGED_CONFIG_DIR: process.env.SONDERR_TEST_MANAGED_CONFIG_DIR,
  flagConfig: Flag.SONDERR_CONFIG,
}

afterEach(async () => {
  restore()
  await disposeAllInstances()
  await resetDatabase()
})

function restore() {
  set("SONDERR_CONFIG", env.SONDERR_CONFIG)
  set("SONDERR_CONFIG_CONTENT", env.SONDERR_CONFIG_CONTENT)
  set("SONDERR_CONFIG_DIR", env.SONDERR_CONFIG_DIR)
  set("SONDERR_DISABLE_PROJECT_CONFIG", env.SONDERR_DISABLE_PROJECT_CONFIG)
  set("SONDERR_TEST_MANAGED_CONFIG_DIR", env.SONDERR_TEST_MANAGED_CONFIG_DIR)
  Flag.SONDERR_CONFIG = env.flagConfig
}

function set(key: keyof typeof process.env, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key]
    return
  }
  process.env[key] = value
}

async function sources(dir: string) {
  const response = await Server.Default().app.request("/config/sources", {
    headers: { "x-sonderr-directory": dir },
  })
  expect(response.status).toBe(200)
  return (await response.json()) as Body
}

function order(body: Body, file: string) {
  const hit = body.sources.find((source) => source.path === file)
  expect(hit).toBeDefined()
  return hit!.order
}

describe("config source routes", () => {
  test("lists source metadata in load order without config contents", async () => {
    await using tmp = await tmpdir({
      init: async (dir) => {
        await Bun.write(path.join(dir, "env.json"), "{}")
        await Bun.write(path.join(dir, "sonderr.json"), "{}")

        for (const root of [".opencode", ".kilo", ".kilocode", ".sonderr"]) {
          const local = path.join(dir, root)
          await fs.mkdir(local, { recursive: true })
          await Bun.write(path.join(local, "sonderr.jsonc"), "{}")
        }

        const extra = path.join(dir, "extra")
        await fs.mkdir(extra, { recursive: true })
        await Bun.write(path.join(extra, "sonderr.json"), "{}")

        const managed = path.join(dir, "managed")
        await fs.mkdir(managed, { recursive: true })
        await Bun.write(path.join(managed, "sonderr.json"), "{}")
      },
    })

    const envFile = path.join(tmp.path, "env.json")
    const projectFile = path.join(tmp.path, "sonderr.json")
    const opencodeFile = path.join(tmp.path, ".opencode", "sonderr.jsonc")
    const sonderrFile = path.join(tmp.path, ".sonderr", "sonderr.jsonc")
    const kiloFile = path.join(tmp.path, ".kilo", "sonderr.jsonc")
    const configFile = path.join(tmp.path, ".kilocode", "sonderr.jsonc")
    const extraFile = path.join(tmp.path, "extra", "sonderr.json")
    const managedFile = path.join(tmp.path, "managed", "sonderr.json")

    process.env.SONDERR_CONFIG = envFile
    Flag.SONDERR_CONFIG = envFile
    process.env.SONDERR_CONFIG_CONTENT = '{"username":"secret-inline-value"}'
    process.env.SONDERR_CONFIG_DIR = path.join(tmp.path, "extra")
    process.env.SONDERR_TEST_MANAGED_CONFIG_DIR = path.join(tmp.path, "managed")

    const body = await sources(tmp.path)
    const inline = body.sources.find((source) => source.source === "SONDERR_CONFIG_CONTENT")

    expect(order(body, envFile)).toBeLessThan(order(body, projectFile))
    expect(order(body, projectFile)).toBeLessThan(order(body, sonderrFile))
    expect(order(body, sonderrFile)).toBeLessThan(order(body, kiloFile))
    expect(order(body, kiloFile)).toBeLessThan(order(body, configFile))
    expect(body.sources.some((source) => source.path === opencodeFile)).toBe(false)
    expect(order(body, configFile)).toBeLessThan(order(body, extraFile))
    expect(inline?.order).toBeGreaterThan(order(body, extraFile))
    expect(inline?.order).toBeLessThan(order(body, managedFile))

    expect(body.sources.find((source) => source.path === configFile)).toMatchObject({
      kind: "config-dir-file",
      scope: "project",
      exists: true,
      editable: true,
    })
    expect(body.sources.find((source) => source.path === managedFile)).toMatchObject({
      kind: "managed-file",
      scope: "managed",
      exists: true,
      editable: false,
    })
    expect(JSON.stringify(body)).not.toContain("secret-inline-value")
  })

  test("shows project config disabled by environment", async () => {
    await using tmp = await tmpdir({
      init: async (dir) => {
        await Bun.write(path.join(dir, "sonderr.json"), "{}")
        await fs.mkdir(path.join(dir, ".sonderr"), { recursive: true })
        await Bun.write(path.join(dir, ".sonderr", "sonderr.json"), "{}")
      },
    })

    process.env.SONDERR_DISABLE_PROJECT_CONFIG = "1"

    const body = await sources(tmp.path)

    expect(body.sources.some((source) => source.path === path.join(tmp.path, "sonderr.json"))).toBe(false)
    expect(body.sources.some((source) => source.path === path.join(tmp.path, ".sonderr", "sonderr.json"))).toBe(false)
    expect(body.sources.find((source) => source.source === "SONDERR_DISABLE_PROJECT_CONFIG")).toMatchObject({
      kind: "runtime-env",
      scope: "env",
      exists: true,
      editable: false,
    })
  })
})
