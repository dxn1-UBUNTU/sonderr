import { describe, expect, test } from "bun:test"
import { hasGateway, visible } from "./privacy"

describe("model privacy filter", () => {
  test("detects when Sonderr Gateway models are present", () => {
    expect(hasGateway([{ id: "sonderr" }, { id: "openai" }])).toBe(true)
    expect(hasGateway([{ id: "openai" }])).toBe(false)
  })

  test("shows every model when disabled", () => {
    expect(visible({ id: "sonderr" }, { mayTrainOnYourPrompts: true }, false)).toBe(true)
  })

  test("hides only Sonderr Gateway models explicitly marked for prompt training", () => {
    expect(visible({ id: "sonderr" }, { mayTrainOnYourPrompts: true }, true)).toBe(false)
    expect(visible({ id: "sonderr" }, { mayTrainOnYourPrompts: false }, true)).toBe(true)
    expect(visible({ id: "sonderr" }, {}, true)).toBe(true)
    expect(visible({ id: "openai" }, { mayTrainOnYourPrompts: true }, true)).toBe(true)
  })
})
