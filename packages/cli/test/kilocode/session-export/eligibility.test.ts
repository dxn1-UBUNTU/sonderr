import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { isEligible, setKillSwitch, resetEligibility, type OrgState } from "@/sonderr/session-export/eligibility"

const base = {
  model: {
    api: { npm: "@sonderr/sonderr-gateway" },
    isFree: true,
  },
  org: { type: "personal" } as OrgState,
}

describe("isEligible", () => {
  beforeEach(() => resetEligibility())
  afterEach(() => resetEligibility())

  test("free Sonderr Gateway personal context is eligible", () => {
    expect(isEligible(base)).toBe(true)
  })

  test("paid Sonderr Gateway is ineligible", () => {
    expect(isEligible({ ...base, model: { ...base.model, isFree: false } })).toBe(false)
  })

  test("isFree=undefined is ineligible", () => {
    expect(isEligible({ ...base, model: { ...base.model, isFree: undefined } })).toBe(false)
  })

  test("non-Sonderr provider with isFree=true is ineligible", () => {
    expect(isEligible({ ...base, model: { ...base.model, api: { npm: "@ai-sdk/openai" } } })).toBe(false)
  })

  test("org context is ineligible regardless of model", () => {
    expect(isEligible({ ...base, org: { type: "org", id: "org_xyz" } })).toBe(false)
  })

  test("unknown org state is ineligible", () => {
    expect(isEligible({ ...base, org: { type: "unknown" } })).toBe(false)
  })

  test("killSwitch blocks everything", () => {
    setKillSwitch(true, "test")
    expect(isEligible(base)).toBe(false)
  })
})
