import { AppNodeBuilder } from "@sonderr/core/effect/app-node-builder"
import { describe, expect } from "bun:test"
import { Effect, Layer } from "effect"
import path from "path"
import { CrossSpawnSpawner } from "@sonderr/core/cross-spawn-spawner"
import { Command } from "../../src/command"
import { provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

const it = testEffect(Layer.mergeAll(AppNodeBuilder.build(Command.node), AppNodeBuilder.build(CrossSpawnSpawner.node)))

describe("command registry", () => {
  it.live("skills are not registered as slash commands", () =>
    provideTmpdirInstance(
      (dir) =>
        Effect.gen(function* () {
          yield* Effect.promise(() =>
            Bun.write(
              path.join(dir, ".sonderr", "skill", "review", "SKILL.md"),
              `---
name: review
description: Skill with command conflict.
---

# Review Skill

Skill content.
`,
            ),
          )

          const command = yield* Command.Service
          const list = yield* command.list()
          const matches = list.filter((item) => item.name === "review")

          expect(matches.some((item) => item.source === "skill")).toBe(false)

          const cmd = yield* command.get("review")
          expect(cmd?.source).toBe("command")

          const skill = yield* command.get("review:skill")
          expect(skill).toBeUndefined()
        }),
      {
        git: true,
        config: {
          command: {
            review: {
              template: "Command content.",
            },
          },
        },
      },
    ),
  )

  it.live("skills command lists available skills", () =>
    provideTmpdirInstance(
      (dir) =>
        Effect.gen(function* () {
          yield* Effect.promise(() =>
            Bun.write(
              path.join(dir, ".sonderr", "skill", "proj", "SKILL.md"),
              `---
name: proj
description: Project skill.
---

Run: !\`printf hi\`
`,
            ),
          )

          const command = yield* Command.Service
           const skills = yield* command.get("skills")

           expect(skills?.name).toBe("skills")
         }),
       { git: true },
     ),
   )

  it.live("hive is a TUI slash command, not a command registry entry", () =>
    provideTmpdirInstance(
      (dir) =>
        Effect.gen(function* () {
          const command = yield* Command.Service
          const hive = yield* command.get("hive")
          const sonDerrHive = yield* command.get("SONDERR-HIVE")

          expect(hive).toBeUndefined()
          expect(sonDerrHive).toBeUndefined()
        }),
      { git: true },
    ),
  )
})
