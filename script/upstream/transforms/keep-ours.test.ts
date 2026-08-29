import { expect, test } from "bun:test"
import { shouldKeepOurs } from "./keep-ours"

test("keeps files in Sonderr-specific directories", () => {
  expect(shouldKeepOurs("packages/sonderr-vscode/.prettierignore", [])).toBe(true)
  expect(shouldKeepOurs("packages/sonderr-vscode/webview-ui/tsconfig.json", [])).toBe(true)
  expect(shouldKeepOurs("packages/sonderr-i18n/tsconfig.json", [])).toBe(true)
  expect(shouldKeepOurs("script/upstream/tsconfig.json", [])).toBe(true)
})

test("keeps explicitly configured files", () => {
  expect(shouldKeepOurs("README.md", ["README.md"])).toBe(true)
})

test("does not keep unrelated files", () => {
  expect(shouldKeepOurs("packages/cli/src/index.ts", [])).toBe(false)
})
