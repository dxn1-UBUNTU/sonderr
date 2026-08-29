import { describe, expect } from "bun:test"
import { Effect } from "effect"
import path from "path"
import { mkdir } from "node:fs/promises" // sonderr_change
import { cliIt } from "../lib/cli-process"

describe("sonderr mcp add (non-interactive subprocess)", () => {
  cliIt.concurrent(
    "adds a remote server with HTTP headers",
    ({ home, sonderr }) =>
      Effect.gen(function* () {
        const result = yield* sonderr.spawn([
          "mcp",
          "add",
          "github",
          "--url",
          "https://example.com/mcp",
          "--header",
          "Authorization=Bearer {env:GITHUB_TOKEN}",
          "--header",
          "X-Option=one=two",
        ])
        sonderr.expectExit(result, 0)

        const config = yield* Effect.promise(() =>
          Bun.file(path.join(home, ".config", "sonderr", "sonderr.json")).json(), // sonderr_change
        )
        expect(config.mcp.github).toEqual({
          type: "remote",
          url: "https://example.com/mcp",
          headers: {
            Authorization: "Bearer {env:GITHUB_TOKEN}",
            "X-Option": "one=two",
          },
        })
      }),
    60_000,
  )

  cliIt.concurrent(
    "adds a local server while preserving argv and environment values",
    ({ home, sonderr }) =>
      Effect.gen(function* () {
        const result = yield* sonderr.spawn([
          "mcp",
          "add",
          "local",
          "--env",
          "API_KEY=secret",
          "--env",
          "VALUE=one=two",
          "--",
          "npx",
          "-y",
          "@example/server",
          "--label",
          "two words",
        ])
        sonderr.expectExit(result, 0)

        const config = yield* Effect.promise(() =>
          Bun.file(path.join(home, ".config", "sonderr", "sonderr.json")).json(), // sonderr_change
        )
        expect(config.mcp.local).toEqual({
          type: "local",
          command: ["npx", "-y", "@example/server", "--label", "two words"],
          environment: {
            API_KEY: "secret",
            VALUE: "one=two",
          },
        })
      }),
    60_000,
  )

  // sonderr_change start
  cliIt.concurrent(
    "writes to SONDERR_CONFIG_DIR without touching the default profile",
    ({ home, sonderr }) =>
      Effect.gen(function* () {
        const profile = path.join(home, "profile")
        yield* Effect.promise(() => mkdir(profile, { recursive: true }))
        const result = yield* sonderr.spawn(
          ["mcp", "add", "profile", "--url", "https://example.com/profile"],
          { env: { SONDERR_CONFIG_DIR: profile } },
        )
        sonderr.expectExit(result, 0)

        const config = yield* Effect.promise(() => Bun.file(path.join(profile, "sonderr.json")).json())
        expect(config.mcp.profile).toEqual({ type: "remote", url: "https://example.com/profile" })
        expect(yield* Effect.promise(() => Bun.file(path.join(home, ".config", "sonderr", "sonderr.json")).exists())).toBe(
          false,
        )
      }),
    60_000,
  )
        // sonderr_change end
})
