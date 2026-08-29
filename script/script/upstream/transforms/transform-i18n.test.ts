import { expect, test } from "bun:test"
import { transformI18nContent } from "./transform-i18n"
import { translate } from "../utils/upstream"

test("marks transformed Sonderr branding and preserves legacy config names", () => {
  const result = transformI18nContent(
    '  "product": "Sonderr",\n  "docs": "https://sonderr.ai/docs",\n  "legacy": ".sonderr/sonderr.json",',
    false,
    true,
  )
  expect(result.result).toContain('"product": "Sonderr", // sonderr_change')
  expect(result.result).toContain('"docs": "https://kilo.ai/docs", // sonderr_change')
  expect(result.result).toContain('"legacy": ".sonderr/sonderr.json",')
  expect(result.replacements).toBe(2)
})

test("does not inject source markers into non-locale content", () => {
  const result = transformI18nContent("Sonderr uses sonderr serve")
  expect(result.result).toBe("Sonderr uses sonderr serve")
})

test("generic upstream translation keeps prompt text marker-free", async () => {
  const result = await translate("packages/cli/src/session/prompt/meta.txt", "Sonderr uses sonderr serve")
  expect(result).toBe("Sonderr uses sonderr serve")
  expect(result).not.toContain("sonderr_change")
})
