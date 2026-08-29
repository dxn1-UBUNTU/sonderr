# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Start Here

Paths below are relative to this package. Start with the relevant implementation and nearby tests; the sections below retain the architecture and safety details.

| Area | Entry points |
|---|---|
| CLI connection and process lifecycle | [connection-service.ts](src/services/cli-backend/connection-service.ts), [server-manager.ts](src/services/cli-backend/server-manager.ts) |
| Host/webview messages | [host handlers](src/sonderr-provider/), [message contracts](webview-ui/src/types/messages/) |
| Agent Manager and project routing | [host](src/agent-manager/), [project routing/settings](src/agent-manager/project/), [webview](webview-ui/agent-manager/) |
| Webview composition and styles | [provider-shell.tsx](webview-ui/src/context/provider-shell.tsx), [styles](webview-ui/src/styles/) |
| Tests | [unit tests](tests/unit/), [visual regression](tests/visual-regression.spec.ts) |

## Product Context

Sonderr is an open source AI coding agent platform. It ships as a CLI and editor clients that all build on the same backend. This package (`packages/sonderr-vscode/`) is the **VS Code extension**.

### Products and How They Relate

All products are thin clients over the **CLI** (`packages/cli/`, published as `@sonderr/cli`). The CLI is a fork of upstream [Sonderr](https://github.com/anomalyco/sonderr) with Sonderr-specific additions (gateway auth, telemetry, migration, code review, branding). It contains the full AI agent runtime, tool execution, session management, provider integrations (500+ models), and an HTTP API server.

The VS Code extension spawns or connects to a `sonderr serve` process and communicates via HTTP REST + SSE using the auto-generated `@sonderr/sdk`. CLI clients can also use in-process transports, as shown below.

```
                        @sonderr/cli  (packages/cli/)
                     ┌────────────────────────────────┐
                     │  AI agents, tools, sessions,    │
                     │  providers, config, MCP, LSP    │
                     │  HTTP API server + SSE          │
                     └──┬──────────┬──────────────────┘
                        │          │
                ┌───────┴──┐ ┌────┴────┐
                │ TUI      │ │ VS Code │
                │ (builtin)│ │Extension│
                └──────────┘ └─────────┘
```

| Product | Package | What it is | How it uses the CLI |
|---|---|---|---|
| Sonderr CLI (TUI) | `packages/cli/` | Interactive terminal UI (SolidJS + OpenTUI) | In-process — TUI and server run together |
| Sonderr CLI (`sonderr run`) | `packages/cli/` | Non-interactive headless mode for scripting | In-process — no network socket |
| **Sonderr VS Code Extension** | **`packages/sonderr-vscode/`** | VS Code extension with sidebar chat + Agent Manager | Bundles CLI binary, spawns `sonderr serve --port 0` as child process |

### Sonderr-Domain Packages

| Package | Name | Role |
|---|---|---|
| `packages/sonderr-vscode/` | `sonderr-code` | **This package.** VS Code extension. |
| `packages/sonderr-gateway/` | `@sonderr/sonderr-gateway` | Auth (device flow), AI provider routing (OpenRouter), Sonderr API integration (profile, balance, teams) |
| `packages/sonderr-ui/` | `@sonderr/sonderr-ui` | SolidJS component library (40+ components, built on `@kobalte/core`). Shared by this extension's webview and docs screenshot stories |
| `packages/sonderr-telemetry/` | `@sonderr/sonderr-telemetry` | PostHog analytics + OpenTelemetry tracing for the CLI |
| `packages/sonderr-i18n/` | `@sonderr/sonderr-i18n` | Translation strings (16 languages) |
| `packages/sonderr-docs/` | `@sonderr/sonderr-docs` | Documentation site (Next.js + Markdoc) |

### Upstream Sonderr Packages (not Sonderr-specific)

| Package | Name | Role |
|---|---|---|
| `packages/cli/` | `@sonderr/cli` | Core CLI — forked from upstream Sonderr. AI agents, tools, sessions, server. |
| `packages/sdk/js/` | `@sonderr/sdk` | Auto-generated TypeScript SDK client for the server API. Do not edit `src/gen/` or `src/v2/gen/` by hand. |
| `packages/ui/` | `@sonderr/ui` | Shared UI primitives |
| `packages/core/` | `@sonderr/core` | Shared runtime and utilities (`src/util/`) |
| `packages/plugin/` | `@sonderr/plugin` | Plugin/tool interface definitions |

## Commands

```bash
bun run extension                  # Build + launch VS Code with the extension in dev mode
bun run extension:isolated         # Build + launch with persistent isolated IDE + Sonderr state
bun run extension:isolated:clean   # Clear isolated state, then build + launch
bun run compile                    # Type-check + lint + build
bun run watch                      # Watch mode (esbuild + tsc)
bun run test                       # Run tests (requires pretest compilation)
bun run lint                       # ESLint on src/
bun run format                     # Run formatter (do this before committing to avoid styling-only changes in commits)
```

The `extension` commands also work from the repo root. When a user asks to run an isolated VS Code/Sonderr environment, prefer the CLI scripts: `bun run extension:isolated` reuses `.sonderr-dev/`, while `bun run extension:isolated:clean` clears `.sonderr-dev/` before launching. Pass an optional workspace path after `--`, for example `bun run extension:isolated -- ../sample-project`. Pass `--insiders` to prefer VS Code Insiders, `--workspace PATH` to open a different folder, `--clean` to wipe cached state, or `--wait` to block until VS Code closes. VS Code is auto-detected on macOS, Linux, and Windows; override with `--app-path` or `VSCODE_EXEC_PATH`.

From this package: `bun run typecheck` checks host and webview types; `bun run test:unit` runs Bun unit tests. For a focused Agent Manager example, use `bun test tests/unit/agent-manager-arch.test.ts`.

Single VS Code integration test: `bun run test -- --grep "test name"`

## CLI Binary

The extension bundles its own CLI binary at `bin/sonderr` — it does NOT use a system-installed CLI. To build it:

```bash
bun script/local-bin.ts
```

Or use `--force` to rebuild:

```bash
bun script/local-bin.ts --force
```

The script checks for a prebuilt binary in `packages/cli/dist/`, builds the CLI if needed, and copies it to `bin/sonderr`.

## Architecture

### Extension ↔ CLI Backend

The extension is a client of the CLI. Activation creates one shared `SonderrConnectionService`; on its first connection, which autocomplete may prewarm, `ServerManager` spawns `bin/sonderr serve --port 0`, captures the dynamically assigned port from stdout, and communicates over HTTP + SSE. The current child process is reused unless it exits. A random password is generated and passed via `SONDERR_SERVER_PASSWORD` env var for basic auth.

```
Extension (Node.js)                          CLI Backend (child process)
┌──────────────────────────┐                ┌──────────────────────┐
│ SonderrConnectionService    │── HTTP/SSE ──> │ sonderr serve --port 0  │
│   ├── ServerManager      │                │   HTTP REST API      │
│   ├── HttpClient         │                │   SSE event stream   │
│   └── SSEClient          │                │   Session management │
│                          │                │   AI agent runtime   │
│ SonderrProvider (sidebar)   │                └──────────────────────┘
│ SonderrProvider (agent mgr) │
│ SonderrProvider (open tabs) │
└──────────────────────────┘
```

- **`SonderrConnectionService`** (`src/services/cli-backend/connection-service.ts`) is created once during extension activation and shared across the sidebar, Sonderr editor tabs, and Agent Manager. It owns the current server process, HTTP client, and SSE connection.
- **`ServerManager`** (`src/services/cli-backend/server-manager.ts`) lazily spawns the CLI binary, reuses its current process, and can start a replacement if that process exits.
- The sidebar, every **Open in Tab** Sonderr panel, and the Agent Manager chat provider reuse this connection. Multiple **`SonderrProvider`** instances subscribe to it, with SSE events filtered per-webview via a `trackedSessionIds` Set. Agent Manager terminals may use additional PTY/WebSocket channels to the same backend, not separate `sonderr serve` processes.
- Backend state follows where it is allocated, not the worktree shown in a panel. Snapshot repository state uses directory-keyed `InstanceState`, while `trackState` is created once in the active Snapshot service closure. For these shared VS Code session paths, its slow-track `asked` guard spans worktree requests; choosing **Continue with snapshots** resets `asked` only when continued tracking returns a snapshot hash.

### Builds

Two separate esbuild builds in [`esbuild.js`](esbuild.js):

- **Extension** (Node/CJS): `src/extension.ts` → `dist/extension.js`
- **Webview** (browser/IIFE): `webview-ui/src/index.tsx` → `dist/webview.js` AND `webview-ui/agent-manager/index.tsx` → `dist/agent-manager.js`

### Non-Obvious Details

- Webview uses **Solid.js** (not React) — JSX compiles via `esbuild-plugin-solid`
- Extension code in `src/`, webview code in `webview-ui/src/` with separate tsconfig
- Tests compile to `out/` via `compile-tests`, not `dist/`
- CSP requires nonce for scripts and `font-src` for bundled fonts — see [`SonderrProvider.ts`](src/SonderrProvider.ts)
- HTML root has `data-theme="sonderr-vscode"` to activate sonderr-ui's VS Code theme bridge
- Extension and webview have no shared state — communicate via `vscode.Webview.postMessage()`
- For editor panels, use [`AgentManagerProvider`](src/agent-manager/AgentManagerProvider.ts) pattern with `retainContextWhenHidden: true`
- esbuild webview build includes [`cssPackageResolvePlugin`](esbuild.js) for CSS `@import` resolution and font loaders (`.woff`, `.woff2`, `.ttf`)
- Avoid `setTimeout` for sequencing VS Code operations — use deterministic event-based waits (e.g. `waitForWebviewPanelToBeActive()`)

## Extension ↔ Webview Feature Pattern

When adding a new feature that requires data from the CLI backend to be displayed in the webview:

1. **Types** (`src/services/cli-backend/types.ts`): Add response types for the backend data
2. **SDK Client** (`src/services/cli-backend/connection-service.ts`): Use the existing SDK client to retrieve the data
3. **Host Handler** (`src/sonderr-provider/` or the existing handler in `src/SonderrProvider.ts`): Handle the corresponding webview request using the existing cached message pattern
4. **Message Types** (`webview-ui/src/types/messages/`): Add `*LoadedMessage` (extension→webview) and `Request*Message` (webview→extension) types to the `ExtensionMessage` / `WebviewMessage` unions
5. **Context** (`webview-ui/src/context/`): Subscribe to the loaded message **outside** `onMount` (to catch early pushes before mount), add retry logic for the request message, expose state via context
6. **Component** (`webview-ui/src/components/`): Consume context, render UI

Key patterns:

- **Cached messages** (e.g. `cachedProvidersMessage`, `cachedAgentsMessage` in SonderrProvider): Ensures webview refreshes get data immediately without waiting for a new HTTP round-trip
- **Retry timers** (e.g. `agentRetryTimer` in session context): Handles race conditions where the extension's HTTP client isn't ready when the webview first requests data

## Agent Manager

The Agent Manager is a feature within this extension (not a separate product). It opens as an **editor tab** (`Cmd+Shift+M`) and provides multi-session orchestration — running multiple independent AI sessions in parallel, each optionally isolated in its own git worktree.

### How It Differs From the Sidebar

| Aspect | Sidebar | Agent Manager |
|---|---|---|
| Location | Activity bar sidebar panel | Editor tab (full panel) |
| Sessions | Single session at a time | Multiple parallel sessions with tabbed UI |
| Git isolation | Uses workspace root | Each session can get its own worktree branch |
| State | No dedicated state file | `.sonderr/agent-manager.json` |
| Terminals | None | Dedicated VS Code terminal per session |
| Setup scripts | None | Configurable `.sonderr/setup-script` runs per worktree |
| Multi-version | Not supported | Up to 4 parallel worktrees with the same prompt |

### Architecture

Agent Manager local worktree sessions use the current shared `sonderr serve` process owned by `SonderrConnectionService`; no session starts its own backend. Their CLI requests pass the worktree path as `directory`, which resolves directory-scoped backend state. Setup scripts, terminal PTYs, git subprocesses, and a separately opened VS Code window are separate process or extension-host boundaries, not per-worktree `sonderr serve` instances.

Extension-side code lives in `src/agent-manager/`, webview code in `webview-ui/agent-manager/`. The webview reuses the sidebar's provider chain and `ChatView` component, adding a `WorktreeModeProvider` and a split layout.

### Multi-project migration

Multi-project Agent Manager is an incremental migration behind the application-scoped `sonderr-code.new.experimental.multiProject` flag (default `false`); flag-off behavior must remain unchanged. The project registry/contexts, per-project state and session routing, project sidebar, sections and drag-and-drop, progress/persistence, and project-targeted worktree creation are implemented.

Current implementations are in [project/](src/agent-manager/project/) and [indexing-consent.ts](src/indexing-consent.ts). Check the code and tests before treating migration items as unfinished work. Review areas remain explicit project/worktree/session routing, immutable project-bound Settings, machine-local indexing consent, canonical Git identity, multi-window route ownership, shared sidebar convergence, and full two-project E2E/legacy-parity coverage.

## Webview UI (sonderr-ui)

New webview features must use **`@sonderr/sonderr-ui`** components instead of raw HTML elements with inline styles. This is a Solid.js component library built on `@kobalte/core`.

- Import via deep subpaths: `import { Button } from "@sonderr/sonderr-ui/button"`
- Available components include `Button`, `IconButton`, `Dialog`, `Spinner`, `Card`, `Tabs`, `Tooltip`, `Toast`, `Code`, `Markdown`, and more
- Provider composition is defined by `ProviderShell.Root`, `.Session`, and `.Chat` in [provider-shell.tsx](webview-ui/src/context/provider-shell.tsx); follow that implementation rather than a copied provider order.
- Global styles imported via `import "@sonderr/sonderr-ui/styles"` in [`index.tsx`](webview-ui/src/index.tsx)
- [`chat.css`](webview-ui/src/styles/chat.css) imports the focused stylesheets in [styles/](webview-ui/src/styles/). When replacing a component with sonderr-ui, remove obsolete rules from the owning stylesheet.
- Extension-specific CSS stays with its feature: chat styles under `webview-ui/src/styles/`, Agent Manager styles under `webview-ui/agent-manager/`. Reusable component styles belong in `packages/sonderr-ui/`.
- **Check existing webview usages first**: `webview-ui/src/` and `packages/sonderr-ui/src/stories/` show how sonderr-ui components are composed. Do not rely only on the component API in isolation.
- **`data-component` and `data-slot` attributes carry CSS styling** — sonderr-ui uses `[data-component]` and `[data-slot]` attribute selectors, not class names. Reuse existing component slots where available so shared styles apply consistently.
- **Prefer sonderr-ui styles**: Reuse existing sonderr-ui CSS variables, tokens, and component styles. Add missing reusable styles there; keep extension-specific rules in their owning feature stylesheet rather than inlining or duplicating styles.
- **Icons**: Sonderr-only icons are in [sonderr-ui's registry](../sonderr-ui/src/components/icon.tsx), which falls back to [the upstream registry](../ui/src/components/icon.tsx). To list upstream icon names: `node -e "const c=require('fs').readFileSync('../../packages/ui/src/components/icon.tsx','utf8');[...c.matchAll(/^\\s{2}[\"']?([\\w-]+)[\"']?:\\s*\x60/gm)].map(m=>m[1]).sort().forEach(n=>console.log(n))"`. Icon names use both hyphenated (`arrow-left`) and bare-word (`brain`, `console`, `providers`) keys.

### Diff Rendering Performance

- Preserve hunk-bounded unified `patch` data through Changes/review detail flows and pass patch-derived `FileDiffMetadata` to Pierre when available. Do not eagerly render Pierre from complete `before`/`after` contents based only on changed-line counts: a tiny patch in a large source file can otherwise parse and render the entire file while the user sees a placeholder.
- Pierre workers can offload highlighted updates, but they do not make an expensive synchronous initial render safe. Keep initial rendering hunk-bounded, and keep patch parsing behind deferred visibility/activation where session-switch responsiveness depends on it.
- When changing diff scheduling, verify both rapid session switching and fast scrolling through a review. Improving one by shifting work into the other is a regression, not an optimization.

## Docs Screenshot Stories

When adding or updating Storybook stories for screenshots used by docs, make the story content match the docs page closely before replacing the docs image. Do not replace screenshots from VSCode Legacy docs tabs or sections.

Generated screenshot baselines live under `packages/sonderr-docs/public/img/screenshot-tests/` and are referenced from docs as `/docs/img/screenshot-tests/...`. If a generated VS Code visual-regression screenshot is used in docs, add the docs usage to the `DOCS` map in `tests/visual-regression.spec.ts` and keep `tests/visual-regression.spec.mts` in sync while that file exists.

## Debugging

- Extension logs: "Extension Host" output channel (not Debug Console)
- Webview logs: Command Palette → "Developer: Open Webview Developer Tools"
- In Chrome/VS Code performance traces, associate CPU `ProfileChunk` events to their `Profile.id` target before attributing work to a thread. `v8:ProfEvntProc` is a profile delivery thread, not evidence that application work ran off the webview main thread.
- All debug output must be prepended with `[Sonderr New]` for easy filtering

## Naming Conventions

- All VSCode commands must use `sonderr-code.new.` prefix (not `sonderr-code.`)
- All view IDs must use `sonderr-code.new.` prefix, **except** the sidebar view which uses `sonderr-code.SidebarProvider` to preserve user sidebar position when upgrading from the legacy extension

## Sonderr Change Markers

This package is entirely Sonderr-specific — `sonderr_change` markers are NOT needed in any files under `packages/sonderr-vscode/`. The markers are only necessary when modifying shared upstream sonderr files.

## Process Spawning (Windows)

On Windows, any `spawn`/`execFile`/`exec` call that does not set `windowsHide: true` will flash a cmd.exe console window at the user. To prevent this, **never import `spawn`, `execFile`, or `exec` from `child_process` directly**. Use the wrappers in `src/util/process.ts` instead — they enforce `windowsHide: true` automatically:

```ts
import { spawn, exec } from "../util/process"
```

The `spawn` wrapper covers long-lived processes (e.g. `sonderr serve`). The `exec` wrapper covers short commands (e.g. `git`, `tar`). If you need the raw callback form of `execFile` for some reason, pass `windowsHide: true` explicitly in the options object.

Agent Manager uses read-only `gh` commands for PR status and PR import. Call `execGhRead` from `src/agent-manager/gh.ts` for those commands; on Windows it supplies `TZ=UTC` when no timezone is configured, preventing older `gh` releases from launching `tzutil.exe` in a visible console.

## Style

Follow monorepo root AGENTS.md style guide:

- Prefer `const` over `let`, early returns over `else`
- Single-word variable names when possible
- Avoid `try`/`catch`, avoid `any` type
- ESLint rules live in [eslint.config.mjs](eslint.config.mjs); formatting follows the repository's Prettier configuration.

## File Size Caps (maxLines)

Large files in `src/agent-manager/` have `maxLines` caps enforced by `tests/unit/agent-manager-arch.test.ts`. **Do not raise these caps.** If adding a feature would exceed a cap, extract logic into a vscode-free helper module and call it from the provider. See `fork-session.ts` and `format-keybinding.ts` for examples of this pattern.

## Markdown Tables

Do not pad markdown table cells for column alignment. Use `| content |` with single spaces, not `| content       |` with extra padding. Padding creates spurious diffs. Markdown files are excluded from prettier (via `.prettierignore`) to prevent auto-reformatting of tables.

## Committing

- Before committing, always run `bun run format` so commits don't accidentally include formatting/styling-only diffs.
