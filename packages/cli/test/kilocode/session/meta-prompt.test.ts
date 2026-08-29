import { expect, test } from "bun:test"
import type { Provider } from "@/provider/provider"
import { SystemPrompt } from "@/session/system"

test("Muse Spark identifies as Sonderr and uses Sonderr documentation", () => {
  const prompt = SystemPrompt.provider({ api: { id: "meta/muse-spark-preview" } } as Provider.Model)[0]
  expect(prompt).toContain("You are Sonderr")
  expect(prompt).toContain("Muse Spark")
  expect(prompt).toContain("https://kilo.ai/docs")
  expect(prompt).not.toContain("You are Sonderr")
  expect(prompt).not.toContain("identify yourself as Sonderr")
  expect(prompt).not.toContain("https://sonderr.ai/docs")
})
