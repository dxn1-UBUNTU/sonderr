// sonderr_change - new file
// Built-in skills that ship inside the CLI binary.
// Content is inlined at compile time via Bun's static import of .md files.
// Registered before all discovery phases so user skills with the same name override.

import SONDERR_CONFIG from "./sonderr-config.md" with { type: "text" }
import DESIGN from "./design.md" with { type: "text" }
import VERIFICATION from "./verification.md" with { type: "text" }
import PLANNING from "./planning.md" with { type: "text" }
import TESTING from "./testing.md" with { type: "text" }
import DEBUGGING from "./debugging.md" with { type: "text" }
import CODE_REVIEW from "./code-review.md" with { type: "text" }
import SECURITY from "./security.md" with { type: "text" }

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
  {
    name: "planning",
    description:
      "Strategic planning and task decomposition for complex work. Use when facing multi-step tasks, architectural decisions, or any work rated M2+ complexity. Teaches how to break down work, estimate complexity, and execute efficiently.",
    content: PLANNING,
  },
  {
    name: "testing",
    description:
      "Comprehensive testing guide for writing high-quality tests. Use when adding tests, fixing test failures, or verifying code correctness. Covers TDD, test patterns, mocking, edge cases, and test quality standards.",
    content: TESTING,
  },
  {
    name: "debugging",
    description:
      "Systematic debugging methodology for finding and fixing root causes. Use when investigating bugs, test failures, or unexpected behavior. Covers root cause analysis, binary search debugging, and common debugging patterns.",
    content: DEBUGGING,
  },
  {
    name: "code-review",
    description:
      "Self-review and code review methodology. Use before reporting any task as done, or when reviewing code. Catches bugs, style issues, missing edge cases, and improvement opportunities before the user sees your work.",
    content: CODE_REVIEW,
  },
  {
    name: "security",
    description:
      "Secure coding practices and common vulnerability prevention. Use when handling user input, authentication, data access, or any security-sensitive code. Covers OWASP top 10, injection prevention, and secure patterns.",
    content: SECURITY,
  },
]