import { describe, expect, test } from "bun:test"
import { mkdtemp } from "node:fs/promises"
import { tmpdir } from "node:os"
import { fileURLToPath } from "node:url"
import { hasIndexingPlugin, isIndexingPlugin, normalizePluginName } from "../../../src/detect"

describe("indexing plugin detection", () => {
  test("bundles detect module for browser targets", async () => {
    const dir = await mkdtemp(`${tmpdir()}/sonderr-indexing-detect-`)
    const result = await Bun.build({
      entrypoints: [fileURLToPath(new URL("../../../src/detect.ts", import.meta.url))],
      minify: true,
      outdir: dir,
      target: "browser",
    })

    expect(result.success).toBe(true)
  })

  test("normalizes supported plugin forms", () => {
    expect(normalizePluginName("sonderr-indexing")).toBe("sonderr-indexing")
    expect(normalizePluginName("sonderr-indexing@1.2.3")).toBe("sonderr-indexing")
    expect(normalizePluginName("@sonderr/sonderr-indexing")).toBe("@sonderr/sonderr-indexing")
    expect(normalizePluginName("@sonderr/sonderr-indexing@1.2.3")).toBe("@sonderr/sonderr-indexing")
    expect(normalizePluginName("../../packages/sonderr-indexing")).toBe("@sonderr/sonderr-indexing")
    expect(normalizePluginName("file:///tmp/.sonderr/plugin/sonderr-indexing.js")).toBe("sonderr-indexing")
    expect(normalizePluginName("file:///tmp/node_modules/@sonderr/sonderr-indexing/index.js")).toBe(
      "@sonderr/sonderr-indexing",
    )
    expect(normalizePluginName("file:///tmp/repo/packages/sonderr-indexing/src/index.ts")).toBe("@sonderr/sonderr-indexing")
  })

  test("detects supported indexing plugin specifiers", () => {
    const values = [
      "sonderr-indexing",
      "sonderr-indexing@1.2.3",
      "@sonderr/sonderr-indexing",
      "@sonderr/sonderr-indexing@1.2.3",
      "../../packages/sonderr-indexing",
      "file:///tmp/.sonderr/plugin/sonderr-indexing.js",
      "file:///tmp/node_modules/@sonderr/sonderr-indexing/index.js",
      "file:///tmp/repo/packages/sonderr-indexing/src/index.ts",
    ]

    for (const value of values) {
      expect(isIndexingPlugin(value)).toBe(true)
    }
  })

  test("ignores unrelated plugin specifiers", () => {
    expect(isIndexingPlugin("@sonderr/sonderr-gateway")).toBe(false)
    expect(isIndexingPlugin("file:///tmp/.sonderr/plugin/index.js")).toBe(false)
    expect(hasIndexingPlugin(["@sonderr/sonderr-gateway", "foo@1.0.0"])).toBe(false)
  })

  test("detects indexing plugin in merged plugin lists", () => {
    expect(
      hasIndexingPlugin(["@sonderr/sonderr-gateway", "file:///tmp/node_modules/@sonderr/sonderr-indexing/index.js"]),
    ).toBe(true)
  })
})
