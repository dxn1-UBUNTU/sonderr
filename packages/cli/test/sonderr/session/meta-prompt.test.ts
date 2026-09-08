import { expect, test } from "bun:test"
import type { Provider } from "@/provider/provider"
import { SystemPrompt } from "@/session/system"

test("Muse Spark uses the unified Sonderr fable prompt like every other model", () => {
  const prompt = SystemPrompt.provider({ api: { id: "meta/muse-spark-preview" } } as Provider.Model)[0]
  expect(prompt).toContain("You are Sonderr 1.1 Ultra Engine")
  expect(prompt).toContain("Official site: https://sonderr-ai.vercel.app")
  expect(prompt).toContain("https://dxn1-docs.vercel.app")
})
