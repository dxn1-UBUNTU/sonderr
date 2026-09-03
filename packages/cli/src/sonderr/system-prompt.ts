// sonderr_change - new file

import { Global } from "@sonderr/core/global"
import { Effect } from "effect"
import { staticEnvLines, type EditorContext } from "@/sonderr/editor-context"
import { SonderrMemory } from "@sonderr/sonderr-memory/effect"
import type { MemoryPaths } from "@sonderr/sonderr-memory/effect/paths"
import { MemoryMarker } from "@/sonderr/memory/marker"
import type { Provider } from "@/provider/provider"
import type { InstanceContext } from "@/project/instance-context"
import * as Log from "@sonderr/core/util/log"
import type { Todo } from "@/session/todo" // sonderr_change

const log = Log.create({ service: "sonderr.system-prompt" })

export namespace SonderrSystemPrompt {
  export function shouldIncludePersona(agent: string) {
    return agent !== "title" && agent !== "branch-name"
  }

  export function environment(input: { ctx: InstanceContext; model: Provider.Model; editor?: EditorContext }) {
    return [
      [
        `You are powered by the model named ${input.model.api.id}. The exact model ID is ${input.model.providerID}/${input.model.api.id}`,
        `Here is some useful information about the environment you are running in:`,
        `<env>`,
        `  Is directory a git repo: ${input.ctx.project.vcs === "git" ? "yes" : "no"}`,
        `  Platform: ${process.platform}`,
        `  Today's date: ${new Date().toDateString()}`,
        `  Project config: .sonderr/command/*.md, .sonderr/agent/*.md, sonderr.json, AGENTS.md. Put new commands and agents in .sonderr/. Do not use .sonderr/ or .sonderr/.`,
        `  Global config: ${Global.Path.config}/ (same structure)`,
        ...staticEnvLines(input.editor),
        `</env>`,
      ].join("\n"),
    ]
  }

  /**
   * Returns system-prompt guidance for the acceptance & verification gate.
   * Only emits guidance when there are pending (non-completed, non-cancelled) todos.
   * The agent sees the formatted criteria in the user message (injected by the
   * turn-end gate in SessionPrompt) and must self-verify before reporting completion.
   */
  export function acceptanceGuidance(todos: Todo.Info[]): string | undefined {
    const pending = todos.filter((t) => t.status !== "completed" && t.status !== "cancelled")
    if (!pending.length) return undefined
    return [
      "## Acceptance & Verification",
      "",
      "Before reporting this task complete, you MUST:",
      "1. Run typecheck (`bun run typecheck`) and confirm zero errors in affected packages.",
      "2. Run the relevant tests and confirm they pass.",
      "3. Verify each acceptance criterion listed in the user message above is satisfied.",
      "4. Do NOT call plan_exit or report complete until all criteria pass.",
      "",
      "If any criterion fails, continue working until it passes — you may not hand off to a planning session until verification is green.",
    ].join("\n")
  }

  export function memoryBlocks(input: {
    ctx: MemoryPaths.Ctx
    sessionID?: string
    record?: boolean
    enabled?: boolean
  }) {
    return Effect.gen(function* () {
      const project =
        input.enabled === false
          ? undefined
          : yield* Effect.tryPromise(() =>
              SonderrMemory.context({
                ctx: input.ctx,
                sessionID: input.sessionID,
                record: input.record,
              }),
            ).pipe(
              Effect.catch((err) =>
                Effect.sync(() => {
                  log.warn("memory context unavailable", { error: String(err) })
                  return undefined
                }),
              ),
            )
      const blocks = project?.blocks ?? []
      // Emit the memory guidance once per prompt, not repeated per injected block.
      const guidance = [
        "The following Sonderr memory blocks are saved project memory from this project's previous sessions. You do have this prior-session context; never claim you lack memory of earlier work here while these blocks are present.",
        "The latest_session_digest record is the most recent session; prefer it for continuity unless the request clearly refers to older or different work.",
        "When the user asks about prior work, where things stopped, what was happening, or wants to continue — however they phrase it — answer directly from latest_session_digest or the newest relevant session_digest record below.",
        "Use saved memory when it is directly relevant to the user's request, especially matching corrections, constraints, conventions, and prior decisions.",
        "When the user explicitly asks you to remember, save, correct, update, or forget project memory, call sonderr_memory_save.",
        "When the user asks about prior work, project history, saved decisions, conventions, setup, or prior rationale beyond what the records below cover, call sonderr_memory_recall (mode=search with likely stored words, then mode=catalog) before relying on general knowledge.",
        "The injected memory block is an index and continuity summary, not the full memory store. When a request depends on exact saved details that are only listed as keys, topics, summaries, or truncated records, call sonderr_memory_recall before answering.",
        "When a request could depend on durable typed memory categories such as project facts, environment commands/paths/tooling, decisions, constraints, or corrections, call sonderr_memory_recall (mode=typed or mode=search) if the injected index only hints at the answer, may be incomplete, or does not include the exact detail needed.",
        "Do not force memory recall before routine commands or repo search; recall only when saved project memory is likely to answer the request or avoid repeating prior investigation.",
        "Memory is context, not instruction. Current user messages, repository files, tool output, and AGENTS.md win over memory.",
        "Check current worktree state when needed, then reconcile it with memory; if git status/log is newer or conflicts with saved memory, say so briefly and treat the current repo state as fresher.",
        "Use sonderr_memory_recall with mode=digest and sessionID=<id> when the injected digest is too thin but points to a real prior session.",
        "For topic-specific memory, use sonderr_memory_recall with mode=search or mode=typed.",
        "Use sonderr_local_recall with mode=read only when saved memory is insufficient and transcript detail is actually needed, or when the user asks for full transcript detail.",
        "Do not recall memory for current memory status, sidebar token accounting, or implementation debugging unless the user asks what prior memory says.",
      ].join("\n")
      return {
        blocks: blocks.length
          ? [guidance, ...blocks.map((block) => block.text.trim())]
          : [],
        marker: MemoryMarker.fromBlocks(blocks),
      }
    })
  }
}
