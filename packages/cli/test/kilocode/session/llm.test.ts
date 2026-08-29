import { describe, expect, test } from "bun:test"
import { Effect, Stream } from "effect"
import { LLMEvent } from "@sonderr/llm"
import { SonderrLLM } from "@/sonderr/session/llm"

describe("sonderr.session.llm.timeout", () => {
  test("uses prepared options before the provider fallback", () => {
    const result = SonderrLLM.timeout({
      options: { chunkTimeout: 15_000 },
      fallback: { chunkTimeout: 30_000 },
    })

    expect(result).toEqual({ timeout: { chunkMs: 15_000 } })
  })

  test("uses the provider fallback when prepared options omit the timeout", () => {
    const result = SonderrLLM.timeout({
      options: {},
      fallback: { chunkTimeout: 30_000 },
    })

    expect(result).toEqual({ timeout: { chunkMs: 30_000 } })
  })

  test("uses the provider fallback when the prepared value is not a number", () => {
    const result = SonderrLLM.timeout({
      options: { chunkTimeout: "15_000" },
      fallback: { chunkTimeout: 30_000 },
    })

    expect(result).toEqual({ timeout: { chunkMs: 30_000 } })
  })

  test("omits the timeout when it is not configured", () => {
    expect(SonderrLLM.timeout({ options: {} })).toEqual({})
  })
})

describe("sonderr.session.llm.text", () => {
  test("joins text delta events", async () => {
    const out = await Effect.runPromise(
      SonderrLLM.text(
        Stream.make(
          LLMEvent.textDelta({ id: "text", text: "hello " }),
          LLMEvent.textDelta({ id: "text", text: "world" }),
        ),
      ),
    )

    expect(out).toBe("hello world")
  })

  test("fails on stream errors after partial text", async () => {
    const err = new Error("provider unavailable")
    const text = SonderrLLM.text(
      Stream.concat(Stream.make(LLMEvent.textDelta({ id: "text", text: "partial" })), Stream.fail(err)),
    )

    await expect(Effect.runPromise(text)).rejects.toThrow("provider unavailable")
  })

  test("fails on stream interruption", async () => {
    const text = SonderrLLM.text(Stream.fail(new DOMException("Aborted", "AbortError")))

    await expect(Effect.runPromise(text)).rejects.toMatchObject({ name: "AbortError" })
  })
})
