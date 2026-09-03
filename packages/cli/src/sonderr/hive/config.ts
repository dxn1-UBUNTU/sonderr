import type { Info as RuntimeFlagsInfo } from "@/effect/runtime-flags"
import type { HiveConfig } from "./model"

export namespace SonderrHiveConfig {
  export const DEFAULT_MAX_AGENTS = 8
  export const DEFAULT_MAX_CONCURRENT = 4

  export function resolve(flags: RuntimeFlagsInfo): HiveConfig {
    if (!flags.experimentalHive) return disabled()
    const raw = process.env["SONDERR_HIVE_MODE"] ?? "auto"
    const mode = raw === "off" || raw === "auto" || raw === "manual" ? raw : "auto"
    const max = readInt(process.env["SONDERR_HIVE_MAX_AGENTS"], DEFAULT_MAX_AGENTS)
    const concurrent = readInt(process.env["SONDERR_HIVE_MAX_CONCURRENT"], DEFAULT_MAX_CONCURRENT)
    return {
      enabled: mode !== "off",
      mode,
      maxAgents: Math.max(1, max),
      maxConcurrent: Math.max(1, concurrent),
    }
  }

  export function disabled(): HiveConfig {
    return { enabled: false, mode: "off", maxAgents: 0, maxConcurrent: 0 }
  }

  function readInt(value: string | undefined, fallback: number): number {
    const parsed = Number(value)
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
  }
}
