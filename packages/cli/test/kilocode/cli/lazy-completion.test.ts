import { expect } from "bun:test"
import { Effect } from "effect"
import { cliIt } from "../../lib/cli-process"

cliIt.live(
  "nested lazy command completion includes subcommands",
  ({ sonderr }) =>
    Effect.gen(function* () {
      const result = yield* sonderr.spawn(["--get-yargs-completions", "auth", ""])
      sonderr.expectExit(result, 0, "auth completion")
      expect(result.stdout.split("\n")).toEqual(expect.arrayContaining(["list", "login", "logout"]))
    }),
  60_000,
)
