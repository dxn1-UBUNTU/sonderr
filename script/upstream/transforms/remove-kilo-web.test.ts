import { expect, test } from "bun:test"
import { removeSonderrWeb } from "./remove-sonderr-web"

const INDEX = "packages/cli/src/index.ts"

test("replaces the known Sonderr web command import and registration with Sonderr omissions", () => {
  const source = [
    'import { WebCommand } from "./cli/cmd/web"',
    'import { ServeCommand } from "./cli/cmd/serve"',
    "cli",
    "  .command(ServeCommand)",
    "  .command(WebCommand)",
    "  .command(ModelsCommand)",
    "",
  ].join("\n")

  expect(removeSonderrWeb(INDEX, source)).toEqual({
    result: [
      "// sonderr_change - upstream web command intentionally omitted; Sonderr does not ship an embedded web UI",
      'import { ServeCommand } from "./cli/cmd/serve"',
      "cli",
      "  .command(ServeCommand)",
      "  // sonderr_change - upstream web command intentionally omitted",
      "  .command(ModelsCommand)",
      "",
    ].join("\n"),
    removals: 1,
    review: false,
  })
})

test("flags an unfamiliar web command shape without changing it", () => {
  const source = 'import { WebCommand as Web } from "./cli/cmd/web"\ncli.command(Web)\n'

  expect(removeSonderrWeb(INDEX, source)).toEqual({ result: source, removals: 0, review: true })
})

test("does not transform other files", () => {
  const source = 'import { WebCommand } from "./cli/cmd/web"\n'
  expect(removeSonderrWeb("packages/cli/src/other.ts", source)).toEqual({
    result: source,
    removals: 0,
    review: false,
  })
})
