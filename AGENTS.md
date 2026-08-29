# AGENTS.md

Sonderr CLI is an open source AI coding agent that generates code from natural language, automates tasks, and supports 500+ AI models.

- ALWAYS USE PARALLEL TOOLS WHEN APPLICABLE.
- The default branch in this repo is `main`.
- Prefer automation: execute requested actions without confirmation unless blocked by missing info or safety/irreversibility.
- You may be running in a git worktree. All changes must be made in your current working directory — never modify files in the main repo checkout.

## Build and Dev

- **Dev**: `bun run dev` (runs from root) or `bun run --cwd packages/cli --conditions=browser src/index.ts`
- **Dev with params**: `bun dev -- help`
- **Extension**: `bun run extension` (build + launch VS Code with the extension in dev mode). Pass `--no-build` to skip the build. When asked to run an isolated VS Code/Sonderr environment, use the CLI scripts instead of interactive launch configs: `bun run extension:isolated` reuses `.sonderr-dev/`, and `bun run extension:isolated:clean` clears `.sonderr-dev/` first. Pass an optional workspace path after `--`, for example `bun run extension:isolated -- ../sample-project`.
- **Typecheck**: `bun turbo typecheck` (uses `tsgo`, not `tsc`). Includes the JetBrains plugin and requires Java 21; do not run `java -version` as a routine preflight. Only check Java when a Gradle/Java command fails with a Java-version or missing-Java error. If missing, install via SDKMAN: `sdk install java 21-tem && sdk use java 21-tem`. If SDKMAN is not installed, see https://sdkman.io/install.
- **Test**: `bun test` from `packages/cli/` (NOT from root -- root blocks tests)
- **Single test**: `bun test ./test/tool/tool-define.test.ts` from `packages/cli/`
- **CLI build artifact size check**: after `bun run script/build.ts --single --skip-install` in `packages/cli/`, use `du -h dist/*/*/bin/sonderr` (scoped package output lives under `dist/@sonderr/`)
- **SDK regen**: After changing server endpoints in `packages/cli/src/server/`, run `./script/generate.ts` from root to regenerate `packages/sdk/js/`
- **Knip** (unused exports): `bun run knip` from `packages/sonderr-vscode/`. CI runs this — all exported types/functions must be imported somewhere. Remove or unexport unused exports before pushing.
- **Source links**: After adding or changing URLs in `packages/sonderr-vscode/`, `packages/sonderr-vscode/webview-ui/`, or `packages/cli/src/`, run `bun run script/extract-source-links.ts` from the repo root and commit the updated `packages/sonderr-docs/source-links.md`. CI runs this check — the build fails if the file is stale.
- **sonderr_change check**: `bun run check-sonderr-change` from `packages/sonderr-vscode/`. CI runs this — `sonderr_change` is a marker for upstream merge conflicts and must not appear in `packages/sonderr-vscode/` or `packages/sonderr-ui/` (these are entirely Sonderr additions). Remove the markers before pushing.
- **sonderr annotation check**: `bun run script/check-sonderr-annotations.ts --worktree` from repo root when verifying local agent changes. CI runs `bun run script/check-sonderr-annotations.ts` on PRs touching `packages/cli/` — every Sonderr-specific change in shared sonderr files must be annotated with `sonderr_change` markers. Exempt paths (no markers needed): `packages/cli/src/sonderr/`, `packages/cli/test/sonderr/`, and any path containing `sonderr` in the name.
- **Effect facade ratchet**: Do not add runtime-backed Promise facades to shared `packages/cli/src` Effect services; use service dependencies, `AppRuntime`, or Sonderr-owned boundaries. Run `bun run script/check-sonderr-promise-facades.ts` when touching service adapters.
- **workflow allowlist**: `bun run script/check-workflows.ts` from repo root. CI runs this as part of the annotations workflow — any `.yml` / `.yaml` file added to or removed from `.github/workflows/` must be reflected in the hardcoded list in `script/check-workflows.ts`. Prevents upstream-merged workflows from silently starting to run in our CI.
- **Backend/SDK programmatic testing**: see [TESTING.md](./TESTING.md) for spawning the local main-branch backend (`bun dev serve`) and driving it via `curl` — use this instead of `sonderr serve` (prod binary) when testing backend fixes.

## Quality Checks

Before saying an implementation is ready, run the smallest relevant checks that can catch lint, typecheck, and test failures for the touched package. Do not rely on manual extension launch to discover build problems. Fix failures you introduced before the final response, or state exactly which check is still failing or could not be run.

| Area | Checks |
|---|---|
| Root / cross-package | `bun run lint`, `bun run typecheck` |
| CLI | From `packages/cli/`: `bun run typecheck`, `bun test` or targeted `bun test ./path/to/file.test.ts` |
| VS Code extension | From `packages/sonderr-vscode/`: `bun run typecheck`, `bun run lint`, `bun run test:unit` or `bun run test` |
| Extension build/package | From `packages/sonderr-vscode/`: `bun run compile` or `bun run package` when touching build, packaging, SDK, or webview integration paths |
| JetBrains plugin | From `packages/sonderr-jetbrains/`: `./gradlew typecheck`, `./gradlew test`. Requires Java 21; do not run `java -version` as a routine preflight. Check Java only after a Java-version or missing-Java failure. |
| CI/local guards | Run affected guards documented above, such as `bun run knip`, `bun run check-sonderr-change`, `bun run script/check-sonderr-annotations.ts --worktree`, or source link extraction |

Never run root `bun test`; the root script prints `do not run tests from root` and exits with code 1. Use package-level tests instead.

## Products

All products are clients of the **CLI** (`packages/cli/`), which contains the AI agent runtime, HTTP server, and session management. Each client spawns or connects to a `sonderr serve` process and communicates via HTTP + SSE using `@sonderr/sdk`.

| Product | Package | Description |
|---|---|---|
| Sonderr CLI | `packages/cli/` | Core engine. TUI, `sonderr run`, `sonderr serve`. Fork of upstream Sonderr. |
| Sonderr VS Code Extension | `packages/sonderr-vscode/` | VS Code extension. Bundles the CLI binary, spawns `sonderr serve` as a child process. Includes the **Agent Manager** — a multi-session orchestration panel with git worktree isolation. |

**Agent Manager** refers to a feature inside `packages/sonderr-vscode/` (extension code in `src/agent-manager/`, webview in `webview-ui/agent-manager/`). It is not a standalone product. See the extension's `AGENTS.md` for details.

In each VS Code extension host, one `SonderrConnectionService` is created for the sidebar, every Sonderr editor tab, and Agent Manager; it lazily starts and reuses one current `sonderr serve` backend at a time. Agent Manager worktree sessions pass a directory context to this shared backend rather than starting one per worktree. State captured by the active service layer, such as Snapshot `trackState`, is shared across those requests; only directory-keyed `InstanceState` data is isolated.

Extension-specific settings should live in the Sonderr extension settings, not default VS Code settings, unless they are intentionally VS Code-wide. Experimental flags should follow existing flag patterns, not VS Code settings; they usually belong in the Sonderr Experimental settings section.

## Package Instructions

- When a task primarily touches `packages/sonderr-jetbrains/`, read `packages/sonderr-jetbrains/AGENTS.md` before planning or editing. It covers split-mode architecture, IntelliJ source lookup, threading fundamentals, UI guidelines, and session component architecture.

## Monorepo Structure

Turborepo + Bun workspaces. The packages you'll work with most:

| Package | Name | Purpose |
|---|---|---|
| `packages/cli/` | `@sonderr/cli` | Core CLI -- agents, tools, sessions, server, TUI. This is where most work happens. |
| `packages/sdk/js/` | `@sonderr/sdk` | Auto-generated TypeScript SDK (client for the server API). Do not edit `src/gen/` by hand. |
| `packages/sonderr-vscode/` | `sonderr-code` | VS Code extension with sidebar chat + Agent Manager. See its own `AGENTS.md` for details. |
| `packages/sonderr-gateway/` | `@sonderr/sonderr-gateway` | Sonderr auth, provider routing, API integration |
| `packages/sonderr-telemetry/` | `@sonderr/sonderr-telemetry` | PostHog analytics + OpenTelemetry |
| `packages/sonderr-i18n/` | `@sonderr/sonderr-i18n` | Internationalization / translations |
| `packages/sonderr-ui/` | `@sonderr/sonderr-ui` | SolidJS component library shared by the extension webview and docs screenshot stories |
| `packages/util/` | `@sonderr/util` | Shared utilities (error, path, retry, slug, etc.) |
| `packages/plugin/` | `@sonderr/plugin` | Plugin/tool interface definitions |

## Commits and PR Titles

Use conventional commit-style messages and PR titles: `type(scope): summary`.

Valid types are `feat`, `fix`, `docs`, `chore`, `refactor`, and `test`. Scopes are optional; use the affected package or area when helpful, e.g. `core`, `sonderr`, `tui`, `app`, `desktop`, `sdk`, or `plugin`.

Examples: `fix(tui): simplify thinking toggle styling`, `docs: update contributing guide`, `chore(sdk): regenerate types`.

## Style Guide

- Keep things in one function unless composable or reusable
- Avoid unnecessary destructuring. Instead of `const { a, b } = obj`, use `obj.a` and `obj.b` to preserve context
- Avoid possibly out-of-bounds array access. Instead of `array[index] ?? {}`, use `array.at(index) ?? {}`. Instead of `array[array.length - 1]`, use `array.at(-1)`
- Avoid `try`/`catch` where possible
- Avoid using the `any` type
- Prefer single word variable names where possible
- Use Bun APIs when possible, like `Bun.file()`
- Rely on type inference when possible; avoid explicit type annotations or interfaces unless necessary for exports or clarity
- Prefer `Promise.withResolvers<T>()` for deferreds when runtime/types support it; allow callback/event executors, not async executors or redundant Promise wrapping.

### Avoid let statements

Prefer `const`. Replace `let` + if/else assignment with a ternary or an IIFE. Reassignment is the only legitimate reason to reach for `let`.

### Naming Enforcement (Read This)

THIS RULE IS MANDATORY FOR AGENT WRITTEN CODE.

- Use single word names by default for new locals, params, and helper functions.
- Multi-word names are allowed only when a single word would be unclear or ambiguous.
- Do not introduce new camelCase compounds when a short single-word alternative is clear.
- Before finishing edits, review touched lines and shorten newly introduced identifiers where possible.
- Good short names to prefer: `pid`, `cfg`, `err`, `opts`, `dir`, `root`, `child`, `state`, `timeout`.
- Examples to avoid unless truly required: `inputPID`, `existingClient`, `connectTimeout`, `workerPath`.

### Avoid else statements

Prefer early returns (or an IIFE) over `else`. After an `if` that returns/throws, the `else` is redundant.

### No empty catch blocks

Never leave a `catch` block empty. An empty `catch` silently swallows errors and hides bugs. If you're tempted to write one, ask yourself:

1. Is the `try`/`catch` even needed? (prefer removing it)
2. Should the error be handled explicitly? (recover, retry, rethrow)
3. At minimum, log it via `log.error("...", { err })` so failures are visible — never `catch {}` or `catch (e) {}` with no body.

### Prefer single word naming

Default to a single-word name for variables, parameters, and helper functions. Reach for a multi-word name only when a single word would be genuinely ambiguous in context — not just because the longer name "reads nicer". The rule is about meaning, not character count: don't introduce camelCase compounds like `inputPID`, `existingClient`, `connectTimeout`, or `workerPath` when `pid`, `client`, `timeout`, or `path` is already clear from the surrounding code. See the "Naming Enforcement" section above for the preferred vocabulary.

## Testing

You MUST avoid using `mocks` as much as possible.
Tests MUST test actual implementation, do not duplicate logic into a test.

## Markdown Tables

Do not pad markdown table cells for column alignment. Use the compact form with single-space-padded content cells and a minimal separator row:

```
| Command | What it runs |
|---|---|
| `sonderr serve` | The prod CLI on `$PATH`. |
```

Do **not** right-pad cells to line up columns:

```
| Command                       | What it runs             |
| ----------------------------- | ------------------------ |
| `sonderr serve`                  | The prod CLI on `$PATH`. |
```

Padding makes every content change rewrite the entire table, which blows up diffs on untouched rows. Markdown files are excluded from prettier (see `.prettierignore`) so running the formatter won't re-pad them, and `script/check-md-table-padding.ts` enforces the rule in CI. Run `bun run script/check-md-table-padding.ts --fix` to auto-rewrite padded tables.

## Commit Conventions

[Conventional Commits](https://www.conventionalcommits.org/) with scopes matching packages: `vscode`, `cli`, `agent-manager`, `sdk`, `ui`, `i18n`, `sonderr-docs`, `gateway`, `telemetry`, `desktop`. Omit scope when spanning multiple packages.

## Changesets

User-facing changes (features, fixes, breaking changes) require a changeset file for release notes. Prefer one concise changeset per PR, grouping related changes when possible. Run `bunx changeset add` or manually create `.changeset/<slug>.md`. Use `patch` for bug fixes, `minor` for new features, `major` for breaking changes. See `.changeset/README.md` for details.

Changeset descriptions appear directly in release notes and are read by end users. Keep them concise and feature-oriented — describe **what changed from the user's perspective**, not implementation details. Write in imperative mood (e.g. "Support exporting conversations as markdown" not "Add a new export handler that serializes session messages to .md files").

## Pull Requests

PR descriptions should explain **what** changed, **why** the change is needed, and the intent or constraints a reviewer cannot infer from the diff alone. Keep simple PRs brief, but give non-trivial changes enough context to stand on their own. Skip file-by-file inventories, test result summaries, and anything obvious from the code itself.

## GitHub Issues

When creating or managing GitHub issues for the VS Code extension or JetBrains plugin via `gh`, load `.sonderr/skills/gh-issues/SKILL.md`. It covers templates, project boards (`VS Code Extension`, `Jetbrains Plugin`), title conventions, and the `gh auth refresh -s project` recovery path.

## Fork Merge Process

Sonderr CLI is a fork of [sonderr](https://github.com/anomalyco/sonderr).

**Very important**: when planning or coding, update shared files with Sonderr as last resort! Everything is shared code from Sonderr, except folders that contain `sonderr` in the name or have a parent directory that contains `sonderr` in the name. Example of sonderr specific folders: `packages/cli/src/sonderr/` and `packages/sonderr-docs/`. Always look for ways to implement your feature or fix in a way that minimizes changes to shared code.

### Minimizing Merge Conflicts

We regularly merge upstream changes from sonderr. To minimize merge conflicts and keep the sync process smooth:

1. **Prefer `sonderr` directories** - Place Sonderr-specific code in dedicated directories whenever possible:
   - `packages/cli/src/sonderr/` - Sonderr-specific source code
   - `packages/cli/test/sonderr/` - Sonderr-specific tests
   - `packages/sonderr-gateway/` - The Sonderr Gateway package

2. **Minimize changes to shared files** - When you must modify files that exist in upstream sonderr, keep changes as small and isolated as possible.

3. **Use `sonderr_change` markers** - When modifying shared code, mark your changes with `sonderr_change` comments so they can be easily identified during merges.
   Do not use these markers in files within directories with sonderr in the name

4. **Avoid restructuring upstream code** - Don't refactor or reorganize code that comes from sonderr unless absolutely necessary.

5. **Mirror new config keys to the cloud schema** - When adding a `sonderr_change` key to `Config.Info` in `packages/cli/src/config/config.ts`, also add the matching JSON Schema entry in `apps/web/src/app/config.json/extras.ts` in the [cloud repo](https://github.com/Sonderr-Org/cloud). See [CLI Config Schema](packages/sonderr-docs/pages/contributing/architecture/config-schema.md) for the step-by-step.

The goal is to keep our diff from upstream as small as possible, making regular merges straightforward and reducing the risk of conflicts.

### Git conflict style

`bun install` sets `merge.conflictStyle=zdiff3` repo-locally via `script/setup-git.ts` (wired into `postinstall`). Conflicts include the common ancestor between `|||||||` and `=======`, which is what `script/upstream/` and `mergiraf` rely on for structural resolution and what makes manual resolution on shared sonderr files tractable. If you've overridden it in your user config, the repo-local setting takes precedence — don't override it back.

### Sonderr Change Markers

When editing shared upstream files, mark Sonderr-specific lines with `sonderr_change` comments so future merges can find them. The basic forms are:

- Single line: `const value = 42 // sonderr_change`
- Multi-line block: wrap with `// sonderr_change start` / `// sonderr_change end`
- New file in a shared path: `// sonderr_change - new file` at the top
- JSX/TSX: use `{/* sonderr_change */}` (and `{/* sonderr_change start */}` / `end`)

Markers are NOT needed in paths that contain `sonderr` in the name (e.g. `packages/cli/src/sonderr/`, `packages/cli/test/sonderr/`) — these are entirely Sonderr additions and won't conflict with upstream.

For decision rules on when to keep changes inline vs. extract Sonderr logic, marker placement guidance, and verification commands, load `.sonderr/skills/sonderr-merge-minimizer/SKILL.md`.
