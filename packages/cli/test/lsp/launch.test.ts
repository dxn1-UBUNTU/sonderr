import { describe, expect, test } from "bun:test"
import fs from "fs/promises"
import path from "path"
import { spawn } from "../../src/lsp/launch"
import { tmpdir } from "../fixture/fixture"

describe("lsp.launch", () => {
  // sonderr_change start
  test("does not expose backend credentials or config", async () => {
    const keys = [
      "SONDERR_SERVER_PASSWORD",
      "SONDERR_SERVER_USERNAME",
      "SONDERR_CONFIG",
      "SONDERR_CONFIG_CONTENT",
      "SONDERR_CONFIG_DIR",
    ] as const
    const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]))
    for (const key of keys) process.env[key] = "secret"

    try {
      const proc = spawn(process.execPath, ["-e", `console.log(${JSON.stringify(keys)}.some((key) => process.env[key]))`])
      const output = await new Promise<string>((resolve, reject) => {
        const chunks: Buffer[] = []
        proc.stdout.on("data", (chunk) => chunks.push(Buffer.from(chunk)))
        proc.on("error", reject)
        proc.on("close", () => resolve(Buffer.concat(chunks).toString().trim()))
      })
      expect(output).toBe("false")
    } finally {
      for (const key of keys) {
        const value = saved[key]
        if (value === undefined) delete process.env[key]
        else process.env[key] = value
      }
    }
  })
  // sonderr_change end

  test("spawns cmd scripts with spaces on Windows", async () => {
    if (process.platform !== "win32") return

    await using tmp = await tmpdir()
    const dir = path.join(tmp.path, "with space")
    const file = path.join(dir, "echo cmd.cmd")

    await fs.mkdir(dir, { recursive: true })
    await Bun.write(file, "@echo off\r\nif %~1==--stdio exit /b 0\r\nexit /b 7\r\n")

    const proc = spawn(file, ["--stdio"])

    expect(await proc.exited).toBe(0)
  })
})
