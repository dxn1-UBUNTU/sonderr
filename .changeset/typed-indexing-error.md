---
"@sonderr/cli": patch
---

Index model errors and agent removal failures are now typed `Schema.TaggedErrorClass` errors, catchable by tag in Effect pipelines. A pre-completion verification gate injects acceptance criteria from pending todos into the user message at turn-end, and the system prompt conditionally includes guidance instructing the agent to run typecheck and tests and verify each criterion before reporting completion. Behavior and user-facing messages are unchanged.
