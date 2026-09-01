---
name: planning
description: Strategic planning and task decomposition for complex work. Use when facing multi-step tasks, architectural decisions, or any work rated M2+ complexity. Teaches how to break down work, estimate complexity, and execute efficiently.
---

# Planning Skill — From Chaos to Execution

Great work starts with great planning. This skill ensures you never dive into complex work without a clear map, and you never over-plan simple tasks.

## The Planning Mindset

Planning is not bureaucracy — it is how you avoid wasted effort. The right amount of planning scales with complexity:

| Complexity | Planning effort |
|---|---|
| S1-S4 | Mental plan, maybe a quick todo list |
| M1-M2 | Todo list with dependencies |
| M3-M4 | Detailed plan with sub-tasks, consider plan mode |
| H1-H4 | Full plan mode, research first, parallel subagents |
| U1-U10 | Extensive planning, break into many phases, use subagents |

## The Planning Process

### 1. Understand the Goal

Before anything else, answer:
- What does "done" look like? Be specific.
- What are the constraints (time, scope, tech stack)?
- What does the user actually need vs. what they asked for?
- Are there hidden requirements (security, performance, accessibility)?

### 2. Assess Complexity

Rate the overall task using the complexity scale. Be honest — underestimating leads to missed edge cases and broken promises.

**Quick complexity heuristics:**
- Touches 1 file, obvious change? → S1-S2
- Touches 2-5 files, some decisions? → M1-M2
- Touches 5+ files, architectural choices? → M3-M4
- New system, many unknowns? → H1-H2
- Rewrite, platform-level, or research? → H3-H4
- Massive scope, days of work? → U1-U10

### 3. Decompose

Break the work into discrete, verifiable tasks. Each task should:
- Have a clear "done" state
- Be independently verifiable
- Take less than ~30 minutes (if it takes longer, split it further)

**Decomposition patterns:**

*Feature implementation:*
1. Research existing patterns
2. Define interfaces/types
3. Implement core logic
4. Add UI/components
5. Write tests
6. Verify end-to-end

*Bug fix:*
1. Reproduce the bug
2. Find root cause
3. Implement fix
4. Add regression test
5. Verify no collateral

*Refactor:*
1. Map current behavior
2. Write characterization tests
3. Implement new structure
4. Migrate callers one by one
5. Verify behavior preserved
6. Clean up dead code

### 4. Identify Dependencies

Between tasks, identify what must happen first:
- **Sequential**: Task B needs Task A's output → A → B
- **Parallel**: Tasks A and B are independent → run together
- **Converging**: Task C needs both A and B → A + B → C

Use the `dependencies` field in todos to express this.

### 5. Estimate

Assign `estimated_minutes` to each task. Be realistic — pad for unknowns:
- S1: 1-2 min
- S2: 2-5 min
- S3: 5-10 min
- S4: 10-20 min
- M1: 15-30 min
- M2: 30-60 min
- M3: 1-2 hours
- M4: 2-4 hours
- H+: Break into sub-tasks

### 6. Execute and Adapt

Plans change. As you execute:
- Update todos in real time
- If you discover new work, add it as a todo
- If a task is harder than expected, upgrade its complexity
- If blocked, follow the escalation ladder

## Plan Mode vs Direct Execution

**Use plan mode when:**
- Complexity is M3+ or the work is ambiguous
- The user asked "how should we..." or "plan this out"
- You are unsure of the best approach
- The work touches many files or systems

**Skip plan mode when:**
- The task is simple (S1-S4) or well-defined
- The user gave clear, specific instructions
- You are fixing a bug with an obvious cause
- The work is a small, isolated change

## Subagent Strategy

For complex work (M3+), use `task` subagents to parallelize:

**When to parallelize:**
- Independent research tasks (explore + explore)
- Independent implementation tasks (build + build)
- Research while you implement (one subagent researches, you build)

**When NOT to parallelize:**
- Tasks that depend on each other
- Tasks that would conflict (editing the same files)
- Simple work that's faster to do yourself

**Subagent brief template:**
```
Task: [specific description]
Context: [what they need to know]
Files: [relevant file paths]
Expected output: [what to report back]
Complexity: [S/M/H/U rating]
```

## Common Planning Mistakes

1. **Underestimating complexity**: Rating an H3 task as M2. Fix: be honest about unknowns.
2. **Over-planning simple work**: Writing a 20-item todo list for an S1 fix. Fix: just do it.
3. **Under-planning complex work**: Diving into an H4 task without research. Fix: plan mode first.
4. **Missing dependencies**: Starting Task B before Task A is done. Fix: map dependencies first.
5. **No verification**: Marking a task done without verifying. Fix: always verify before completing.

## The Golden Rule

The time spent planning should be proportional to the complexity of the work. A 5-minute task needs 10 seconds of thought. A 5-hour task needs 30 minutes of planning. Match the effort to the stakes.