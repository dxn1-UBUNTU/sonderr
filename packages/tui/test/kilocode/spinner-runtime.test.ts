import { expect, test } from "bun:test"
import { Renderable } from "@opentui/core"
import { getComponentCatalogue } from "@opentui/solid/components"
import { registerSonderrSpinner } from "../../src/component/register-spinner"

test("spinner uses the active OpenTUI runtime", () => {
  registerSonderrSpinner()
  const spinner = getComponentCatalogue().spinner
  expect(spinner).toBeDefined()
  expect(spinner?.prototype).toBeInstanceOf(Renderable)
})
