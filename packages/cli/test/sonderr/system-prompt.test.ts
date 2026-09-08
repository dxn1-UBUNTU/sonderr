import { describe, expect, test } from "bun:test"
import { SystemPrompt } from "../../src/session/system"
import { SonderrSystemPrompt } from "../../src/sonderr/system-prompt" // sonderr_change
import { environmentDetails } from "../../src/sonderr/editor-context"
import { ProviderTest } from "../fake/provider"

import PROMPT_FABLE from "../../src/session/prompt/sonderr-system-prompt.md"

describe("SystemPrompt.provider", () => {
  describe("model.prompt override", () => {
    test("anthropic prompt override returns the unified Sonderr fable prompt", () => {
      const model = ProviderTest.model({ prompt: "anthropic" })
      const result = SystemPrompt.provider(model)
      expect(result).toEqual([PROMPT_FABLE])
    })

    test("anthropic_without_todo prompt override returns the unified Sonderr fable prompt", () => {
      const model = ProviderTest.model({ prompt: "anthropic_without_todo" })
      const result = SystemPrompt.provider(model)
      expect(result).toEqual([PROMPT_FABLE])
    })

    test("beast prompt override returns the unified Sonderr fable prompt", () => {
      const model = ProviderTest.model({ prompt: "beast" })
      const result = SystemPrompt.provider(model)
      expect(result).toEqual([PROMPT_FABLE])
    })

    test("codex prompt override returns the unified Sonderr fable prompt", () => {
      const model = ProviderTest.model({ prompt: "codex" })
      const result = SystemPrompt.provider(model)
      expect(result).toEqual([PROMPT_FABLE])
    })

    test("GPT-5.5 prompt metadata returns the unified Sonderr fable prompt", () => {
      const model = ProviderTest.model({
        prompt: "gpt55",
        api: { id: "provider-specific-model", url: "https://example.com", npm: "@ai-sdk/openai" },
      })
      const result = SystemPrompt.provider(model)
      expect(result).toEqual([PROMPT_FABLE])
    })

    test("gemini prompt override returns the unified Sonderr fable prompt", () => {
      const model = ProviderTest.model({ prompt: "gemini" })
      const result = SystemPrompt.provider(model)
      expect(result).toEqual([PROMPT_FABLE])
    })

    test("trinity prompt override returns the unified Sonderr fable prompt", () => {
      const model = ProviderTest.model({ prompt: "trinity" })
      const result = SystemPrompt.provider(model)
      expect(result).toEqual([PROMPT_FABLE])
    })

    test("every model.prompt override returns the unified Sonderr fable prompt", () => {
      const model = ProviderTest.model({
        prompt: "beast",
        api: { id: "anthropic/claude-4-opus", url: "https://example.com", npm: "@ai-sdk/anthropic" },
      })
      const result = SystemPrompt.provider(model)
      expect(result).toEqual([PROMPT_FABLE])
    })

    test("model.api.id heuristic always returns the unified Sonderr fable prompt", () => {
      const model = ProviderTest.model({
        prompt: undefined,
        api: { id: "anthropic/claude-4-opus", url: "https://example.com", npm: "@ai-sdk/anthropic" },
      })
      const result = SystemPrompt.provider(model)
      expect(result).toEqual([PROMPT_FABLE])
    })

    test("all model ids return the unified Sonderr fable prompt", () => {
      const model = ProviderTest.model({
        prompt: undefined,
        api: { id: "gpt-5-ling", url: "https://example.com", npm: "@ai-sdk/openai" },
      })
      const result = SystemPrompt.provider(model)
      expect(result).toEqual([PROMPT_FABLE])
    })

    test("all model ids return the unified Sonderr fable prompt", () => {
      const model = ProviderTest.model({
        prompt: undefined,
        api: { id: "ling-2", url: "https://example.com", npm: "@ai-sdk/openai" },
      })
      const result = SystemPrompt.provider(model)
      expect(result).toEqual([PROMPT_FABLE])
    })

    test("all model ids return the unified Sonderr fable prompt", () => {
      const model = ProviderTest.model({
        prompt: undefined,
        api: { id: "gpt-5.5", url: "https://example.com", npm: "@ai-sdk/openai" },
      })
      const result = SystemPrompt.provider(model)
      expect(result).toEqual([PROMPT_FABLE])
    })

    test("prompt metadata still returns the unified Sonderr fable prompt", () => {
      const model = ProviderTest.model({
        prompt: "codex",
        api: { id: "gpt-5.5", url: "https://example.com", npm: "@ai-sdk/openai" },
      })
      const result = SystemPrompt.provider(model)
      expect(result).toEqual([PROMPT_FABLE])
    })

    test("older Codex model ids return the unified Sonderr fable prompt", () => {
      const model = ProviderTest.model({
        prompt: undefined,
        api: { id: "gpt-5.1-codex", url: "https://example.com", npm: "@ai-sdk/openai" },
      })
      const result = SystemPrompt.provider(model)
      expect(result).toEqual([PROMPT_FABLE])
    })
  })
})

describe("environmentDetails", () => {
  test("includes cwd and worktree in dynamic context", () => {
    const result = environmentDetails({
      directory: "/repo/.sonderr/worktrees/feature",
      worktree: "/repo/.sonderr/worktrees/feature",
      activeFile: "src/app.ts",
    })

    expect(result).toContain("Working directory: /repo/.sonderr/worktrees/feature")
    expect(result).toContain("Workspace root folder: /repo/.sonderr/worktrees/feature")
    expect(result).toContain("Active file: src/app.ts")
  })

  test("formats the supplied message time", () => {
    const result = environmentDetails({}, new Date("2026-08-24T12:34:56.123Z"))

    expect(result).toContain("Message time: 2026-08-24T12:34:56Z")
  })
})

describe("SonderrSystemPrompt.acceptanceGuidance", () => {
  test("returns undefined when all todos are completed", () => {
    const result = SonderrSystemPrompt.acceptanceGuidance([
      { content: "Done", status: "completed", priority: "high" },
    ])
    expect(result).toBeUndefined()
  })

  test("returns undefined when all todos are cancelled", () => {
    const result = SonderrSystemPrompt.acceptanceGuidance([
      { content: "Skipped", status: "cancelled", priority: "low" },
    ])
    expect(result).toBeUndefined()
  })

  test("returns guidance when there are pending todos", () => {
    const result = SonderrSystemPrompt.acceptanceGuidance([
      { content: "Add auth", status: "pending", priority: "high", complexity: "M1" },
      { content: "Wire up tests", status: "in_progress", priority: "medium" },
    ])
    expect(result).toContain("Acceptance & Verification")
    expect(result).toContain("Before reporting this task complete")
    expect(result).toContain("typecheck")
    expect(result).toContain("tests")
  })
})
