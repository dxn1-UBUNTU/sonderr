# SONDERR-HIVE — Swarm Mode (0.0.63)

> One idea, 1-inf agents. Hive mode lets a coordinator spawn many concurrent
> subagents, spread API keys for throughput, and collude over a hidden
> peer-to-peer message bus the user never sees. Only the aggregated result
> surfaces.

## User-facing behavior

- `hive on` / `hive off` — toggles hive mode (off by default, gated behind
  `SONDERR_EXPERIMENTAL`).
- When a task is dispatched into hive mode the **orchestrator** (primary agent)
  decomposes the request, then spawns N child subagent sessions concurrently.
- N is either **auto** (the orchestrator decides per-step) or **manual**
  (`hive agents 8` — user pins the count) or **bounded** (`hive max 16`).
- Each subagent runs against a **key from the pool** — multiple keys per
  provider are round-robined so rate limits and per-key quotas stack across
  keys → more tokens/second.
- Subagents **talk to each other** via the hive bus: `hive_send` (post a memo
  to the swarm) / `hive_recall` (read recent memos). These calls are
  intercepted and never rendered in the user transcript; the orchestrator
  reads the bus and synthesizes the final answer.
- Cost is attributed back to the originating session (reuse the existing
  `SonderrCostPropagation` path).

## Architecture

```
                ┌──────────────────────────────────────────────┐
                │  SonderrHive.Service  (per-instance singleton) │
                │  - owns the live HiveBus + KeyPool            │
                │  - spawns child sessions via Session.Service  │
                │  - runs the orchestrator loop                 │
                └───────────────┬─────────────────────┬────────┘
                                │ create+run          │ bus pub/sub
              parent session    ▼                     ▼
          ┌──────────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
          │  orchestrator│  │ sub #1  │  │ sub #2  │  │  ... #N │
          │ (primary)   │  │ (task)  │  │ (task)  │  │ (task)  │
          └──────────────┘  └─────────┘  └─────────┘  └─────────┘
```

### Components (all new code under `packages/cli/src/sonderr/hive/`, no markers)

| File | Responsibility |
|---|---|
| `config.ts` | `HiveConfig` (mode, max agents, max concurrent, key pool spec). Resolved from flags + the `hive` config key. Off by default. |
| `key-pool.ts` | `SonderrKeyPool.Service` — wraps `Auth.Service`, holds multiple `Auth.Info` per provider, round-robins / least-recently-used picks a key. Honors `SONDERR_HIVE_KEY_POOL`. |
| `bus.ts` | `SonderrHiveBus` — in-process pub/sub scoped by `HiveID` (Map of channel → memos). Memos are Schema-validated. Never written to the user-visible session transcript. |
| `orchestrator.ts` | `SonderrOrchestrator.Service` — spawns child sessions concurrently, attaches them to a hive ID, drives the swarm turn loop, aggregates results. |
| `model.ts` | Schemas: `HiveID`, `HiveMemo` (role, from, channel, text, ts, ttl), `HiveConfig`. |
| `tool.ts` | `hive_send` / `hive_recall` tool definitions (orchestrator + subagents). |
| `index.ts` | `SonderrHive` namespace re-exports + Effect `Service` + `Layer`. |

### Reuse of existing primitives (do NOT reimplement)

- Session creation & run loop → `Session.Service.create`, `SonderrSessionPromptQueue`
- Subagent permissions → `SonderrTask` / `deriveSubagentSessionPermission`
- Background execution → `BackgroundJob.Service`
- Cost attribution → `SonderrCostPropagation`
- Provider/model resolution → `Provider.Service` + `SonderrTask.resolveModel`
- Runtime flags → `RuntimeFlags.Service` / `Flag` (add `SONDERR_HIVE`)
- Server → existing session HTTP API; hive is a client-layer concern

### Inter-agent bus detail

- A hive bus lives for the lifetime of the parent session's hive turn.
- `hive_send { channel, text }` → appends a `HiveMemo` to the channel. The
  call resolves but its text is NOT echoed to the parent session transcript.
- `hive_recall { channel?, since?, limit? }` → returns recent memos from the
  shared channel (a default swarm channel per hive). Returns structured data
  the orchestrator can reason over.
- Channels: default `swarm` (broadcast-ish, ordered) + arbitrary named
  channels for specialization.
- TTL/eviction: memos expire after the hive turn ends; nothing persists.

### Multiple keys (throughput)

- Auth today: `Record<providerID, Auth.Info>` (one key per provider) in
  `auth.json`.
- Hive adds a **separate, opt-in** key pool stored at
  `~/.local/share/sonderr/storage/hive-keys.json` as
  `Record<providerID, Auth.Info[]>`. The default `Auth.Service` is untouched.
- `SonderrKeyPool.next(providerID)` returns the next key (round-robin /
  least-recently-used). When the pool is empty for a provider, falls back to
  the single primary key.
- CLI: `hive keys add openai <key>` / `hive keys list` / `hive keys remove`.
- Resolved keys are injected into the child session's provider resolution at
  spawn time (via a transient auth override service, not by mutating the global
  `auth.json`).

## Phased roadmap

### Phase 0 — Scaffolding (this change)
- Add `SONDERR_HIVE` flag (`packages/core/src/flag/flag.ts`) + `experimentalHive`
  (`packages/cli/src/effect/runtime-flags.ts`), both `sonderr_change`-marked,
  off-by-default, gated on `SONDERR_EXPERIMENTAL`.
- Create `packages/cli/src/sonderr/hive/` with `config.ts`, `key-pool.ts`,
  `bus.ts`, `model.ts`, `orchestrator.ts`, `tool.ts`, `index.ts` — interfaces
  + Schemas + stubbed Effects (no live wiring yet), all typecheck-clean.
- Changeset (minor, `@sonderr/cli`).

### Phase 1 — Key pool + CLI commands
- `SonderrKeyPool.Service` fully wired over `Auth.Service`; `hive keys {add,list,rm}`
  commands persisting to `hive-keys.json`.
- `hive keys` surfaced in the auth/settings panel of each client.

### Phase 2 — Hive bus + inter-agent tools
- `SonderrHiveBus` with channels + TTL; `hive_send` / `hive_recall` tool wireup
  injected into spawned hive subagent sessions only.
- Bus events published on the BEE (existing event system) so the TUI/webview can
  show live agent status.

### Phase 3 — Orchestrator + spawn loop
- `SonderrOrchestrator.Service`: concurrent child spawning from the task tool
  path (`SonderrTask`-style permission derivation), bus attachment, result
  aggregation, cost propagation, interrupt/cancel fan-out.
- `/hive` command + `experimental.hive` config shorthand.
- TUI: hive mode toggle + live swarm status (count, key in use, bus depth).

### Phase 4 — Auto vs manual, bounds, budget
- `hive agents <n>` / `hive max <n>` / `hive mode auto|manual`.
- Token + cost budget gates (hard stop when budget exceeded).
- Rate-limit awareness per key (throttle spawn of children whose key is
  throttled).

### Phase 5 — Desktop + VS Code + SDK
- Surface hive settings in the extension settings (`Sonderr Experimental`);
  Agent Manager worktree sessions can opt in.
- Server routes for hive status streaming + SDK regen
  (`bun run script/generate.ts`).

## Constraints respected

- All new runtime code lives in `packages/cli/src/sonderr/hive/` (no
  `sonderr_change` markers needed there).
- Shared-file edits (`flag.ts`, `runtime-flags.ts`) carry `sonderr_change`
  markers; diff kept to 1–2 lines each.
- Config schema: hive config is read from flags + a sonderr-owned `hive` block
  parsed client-side — **not** added to `ConfigV1.Info`, so no cloud-schema
  mirror is required (that mirror is in the separate `Sonderr-Org/cloud` repo
  and only triggers for `Config.Info` fields).
- Naming: single-word locals where possible; Effect layers + `Instance.state`.
- Tests: `packages/cli/test/sonderr/hive/*.test.ts` — real implementation, no
  mocks (in-memory bus, fake auth layer for key pool).
