import { describe, expect, test } from "bun:test"
import { SonderrHiveConfig } from "../../../src/sonderr/hive/config"

describe("SonderrHiveConfig", () => {
  const baseFlags = { experimentalHive: true } as any

  test("disabled when experimentalHive is false", () => {
    const cfg = SonderrHiveConfig.resolve({ experimentalHive: false } as any)
    expect(cfg.enabled).toBe(false)
    expect(cfg.mode).toBe("off")
  })

  test("defaults to auto mode", () => {
    const cfg = SonderrHiveConfig.resolve(baseFlags)
    expect(cfg.enabled).toBe(true)
    expect(cfg.mode).toBe("auto")
  })

  test("parses env mode", () => {
    process.env["SONDERR_HIVE_MODE"] = "manual"
    const cfg = SonderrHiveConfig.resolve(baseFlags)
    expect(cfg.mode).toBe("manual")
    delete process.env["SONDERR_HIVE_MODE"]
  })

  test("falls back to auto on invalid mode", () => {
    process.env["SONDERR_HIVE_MODE"] = "invalid"
    const cfg = SonderrHiveConfig.resolve(baseFlags)
    expect(cfg.mode).toBe("auto")
    delete process.env["SONDERR_HIVE_MODE"]
  })

  test("reads max agents from env", () => {
    process.env["SONDERR_HIVE_MAX_AGENTS"] = "16"
    const cfg = SonderrHiveConfig.resolve(baseFlags)
    expect(cfg.maxAgents).toBe(16)
    delete process.env["SONDERR_HIVE_MAX_AGENTS"]
  })

  test("reads max concurrent from env", () => {
    process.env["SONDERR_HIVE_MAX_CONCURRENT"] = "2"
    const cfg = SonderrHiveConfig.resolve(baseFlags)
    expect(cfg.maxConcurrent).toBe(2)
    delete process.env["SONDERR_HIVE_MAX_CONCURRENT"]
  })

  test("clamps max agents to minimum 1", () => {
    process.env["SONDERR_HIVE_MAX_AGENTS"] = "0"
    const cfg = SonderrHiveConfig.resolve(baseFlags)
    expect(cfg.maxAgents).toBe(8)
    delete process.env["SONDERR_HIVE_MAX_AGENTS"]
  })
})
