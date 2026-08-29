import { describe, expect, test } from "bun:test"
import {
  ensureIndexingPlugin,
  indexingEnabled,
  INDEXING_PLUGIN,
} from "../../src/sonderr/indexing-feature"

describe("indexing plugin helpers", () => {
  test("detects plugin-enabled configs", () => {
    expect(indexingEnabled({ plugin: ["global-plugin"] })).toBe(false)
    expect(indexingEnabled({ plugin: [INDEXING_PLUGIN] })).toBe(true)
    expect(indexingEnabled({ plugin: ["@sonderr/sonderr-indexing@1.0.0"] })).toBe(true)
  })

  test("adds indexing plugin when present but missing from config", () => {
    const list = ensureIndexingPlugin(["global-plugin"], INDEXING_PLUGIN)
    expect(list).toContain("global-plugin")
    expect(list).toContain(INDEXING_PLUGIN)
  })

  test("does not add duplicate indexing plugin", () => {
    const list = ensureIndexingPlugin(["@sonderr/sonderr-indexing@1.0.0"], INDEXING_PLUGIN)
    expect(list).toEqual(["@sonderr/sonderr-indexing@1.0.0"])
  })

  test("skips hard-enable when plugin package is unavailable", () => {
    const list = ensureIndexingPlugin(["global-plugin"], undefined)
    expect(list).toEqual(["global-plugin"])
  })
})
