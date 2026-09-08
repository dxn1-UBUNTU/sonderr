import { Effect } from "effect"
import type { DatabaseMigration } from "../migration"

export default {
  id: "20260908233734_overrated_nebula",
  up(tx) {
    return Effect.gen(function* () {
      yield* tx.run(`ALTER TABLE \`todo\` ADD \`complexity\` text;`)
    })
  },
} satisfies DatabaseMigration.Migration
