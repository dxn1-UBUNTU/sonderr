// sonderr_change - new file
// Built-in skills that ship inside the CLI binary.
// Content is inlined at compile time via Bun's static import of .md files.
// Registered before all discovery phases so user skills with the same name override.

import SONDERR_CONFIG from "./sonderr-config.md" with { type: "text" }
import DESIGN from "./design.md" with { type: "text" }
import VERIFICATION from "./verification.md" with { type: "text" }

export interface BuiltinSkill {
  name: string
  description: string
  content: string
}

export const BUILTIN_SKILLS: BuiltinSkill[] = [
  {
    name: "sonderr-config",
    description:
      "Guide for Sonderr configuration: config paths, sonderr.json fields, commands, agents, skills, permissions, MCPs, providers, TUI settings, plus Agent Manager worktree setup/run scripts, workflows, and state. Use for Sonderr config questions, locating loaded config, changing settings, or Agent Manager questions about run/setup scripts, worktree setup/workflows, apply/merge/PR/conflicts, missing sessions/worktrees, and agent-manager.json recovery.",
    content: SONDERR_CONFIG,
  },
  {
    name: "design",
    description:
      "Comprehensive UI/UX design guide for building polished, accessible, production-quality interfaces. Use when building frontend components, pages, forms, or any user-facing feature. Covers layout, spacing, typography, color, interaction states, accessibility, responsive design, and quality checklists.",
    content: DESIGN,
  },
  {
    name: "verification",
    description:
      "Comprehensive pre-completion verification checklist and quality gates. Use before reporting ANY task as done. Catches bugs, edge cases, style violations, and missing requirements before the user ever sees your work.",
    content: VERIFICATION,
  },
]