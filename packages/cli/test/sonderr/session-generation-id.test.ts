import { describe, expect, test } from "bun:test"
import { SonderrSessionProcessor } from "../../src/sonderr/session/processor"

describe("session generation id", () => {
  test("extracts a bounded Gateway generation id", () => {
    expect(
      SonderrSessionProcessor.generationID({
        gateway: {
          generationId: " gen_test-123 ",
          routing: { finalProvider: "novita" },
          marketCost: "0.1",
        },
      }),
    ).toBe("gen_test-123")
  })

  test("rejects arbitrary or oversized metadata values", () => {
    expect(SonderrSessionProcessor.generationID({ gateway: { generationId: "request-secret" } })).toBeUndefined()
    expect(SonderrSessionProcessor.generationID({ gateway: { generationId: `gen_${"a".repeat(201)}` } })).toBeUndefined()
    expect(SonderrSessionProcessor.generationID({ gateway: { generationId: 42 } })).toBeUndefined()
    expect(SonderrSessionProcessor.generationID({ openai: { responseId: "gen_response" } })).toBeUndefined()
  })
})
