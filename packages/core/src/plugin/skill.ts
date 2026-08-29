/// <reference path="../markdown.d.ts" />

export * as SkillPlugin from "./skill"

import { define } from "./internal"
import { Effect } from "effect"
import { AbsolutePath } from "../schema"
import { SkillV2 } from "../skill"
import customizeSonderrContent from "./skill/customize-sonderr.md" with { type: "text" }

export const CustomizeSonderrContent = customizeSonderrContent

export const Plugin = define({
  id: "skill",
  effect: Effect.fn(function* (ctx) {
    yield* ctx.skill.transform((draft) => {
      draft.source(
        SkillV2.EmbeddedSource.make({
          type: "embedded",
          skill: SkillV2.Info.make({
            name: "customize-sonderr",
            description:
              "Use ONLY when the user is editing or creating sonderr's own configuration: sonderr.json, sonderr.jsonc, files under .sonderr/, or files under ~/.config/sonderr/. Also use when creating or fixing sonderr agents, subagents, commands, skills, plugins, MCP servers, or permission rules. Do not use for the user's own application code, or for any project that is not configuring sonderr itself.",
            location: AbsolutePath.make("/builtin/customize-sonderr.md"),
            content: CustomizeSonderrContent,
          }),
        }),
      )
    })
  }),
})
