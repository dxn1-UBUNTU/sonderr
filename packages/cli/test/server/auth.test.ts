import { afterEach, describe, expect, test } from "bun:test"
import { Option, Redacted } from "effect"
import { Flag } from "@sonderr/core/flag/flag"
import { ServerAuth } from "../../src/server/auth"

const original = {
  SONDERR_SERVER_PASSWORD: Flag.SONDERR_SERVER_PASSWORD,
  SONDERR_SERVER_USERNAME: Flag.SONDERR_SERVER_USERNAME,
}

afterEach(() => {
  Flag.SONDERR_SERVER_PASSWORD = original.SONDERR_SERVER_PASSWORD
  Flag.SONDERR_SERVER_USERNAME = original.SONDERR_SERVER_USERNAME
})

describe("ServerAuth", () => {
  test("does not emit auth headers without a password", () => {
    Flag.SONDERR_SERVER_PASSWORD = undefined
    Flag.SONDERR_SERVER_USERNAME = "alice"

    expect(ServerAuth.header()).toBeUndefined()
    expect(ServerAuth.headers()).toBeUndefined()
  })

  test("defaults to the sonderr username", () => {
    // sonderr_change
    Flag.SONDERR_SERVER_PASSWORD = "secret"
    Flag.SONDERR_SERVER_USERNAME = undefined

    expect(ServerAuth.headers()).toEqual({
      Authorization: `Basic ${Buffer.from("sonderr:secret").toString("base64")}`, // sonderr_change
    })
  })

  test("uses the configured username", () => {
    Flag.SONDERR_SERVER_PASSWORD = "secret"
    Flag.SONDERR_SERVER_USERNAME = "alice"

    expect(ServerAuth.headers()).toEqual({
      Authorization: `Basic ${Buffer.from("alice:secret").toString("base64")}`,
    })
  })

  test("prefers explicit credentials", () => {
    Flag.SONDERR_SERVER_PASSWORD = "secret"
    Flag.SONDERR_SERVER_USERNAME = "alice"

    expect(ServerAuth.headers({ password: "cli-secret", username: "bob" })).toEqual({
      Authorization: `Basic ${Buffer.from("bob:cli-secret").toString("base64")}`,
    })
  })

  test("validates decoded credentials against effect config", () => {
    const config = { password: Option.some("secret"), username: "alice" }

    expect(ServerAuth.required(config)).toBe(true)
    expect(ServerAuth.authorized({ username: "alice", password: Redacted.make("secret") }, config)).toBe(true)
    expect(ServerAuth.authorized({ username: "sonderr", password: Redacted.make("secret") }, config)).toBe(false) // sonderr_change
  })
})
