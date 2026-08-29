<div align="center">

<img src=".github/assets/sonderr-banner.svg" alt="SONDERR — AI coding agent" width="800"/>

**A BYOK AI coding agent — terminal-first, editor-integrated, desktop-wrapped.**

Bring your own key. Your providers, your models, your machine.

[![License: MIT](https://img.shields.io/badge/license-MIT-FF6A00?style=flat-square)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-typed-3178C6?style=flat-square)](https://www.typescriptlang.org)
[![Bun](https://img.shields.io/badge/runtime-Bun-F472B6?style=flat-square)](https://bun.sh)
[![Stars](https://img.shields.io/github/stars/dxn1-UBUNTU/sonderr?style=flat-square&color=FF6A00)](https://github.com/dxn1-UBUNTU/sonderr/stargazers)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-2EA043?style=flat-square)](https://github.com/dxn1-UBUNTU/sonderr/pulls)

[Install](#install) · [Providers](#providers) · [Monorepo](#monorepo-layout) · [Configuration](#configuration) · [Development](#development) · [License](#license)

</div>

---

## What is Sonderr

Sonderr is an agentic coding workspace that runs where you work: a terminal UI, a
desktop app, and extensions for VS Code and JetBrains. It plans, reads and edits
code, runs commands, and manages MCP servers — powered by API keys you own
(BYOK), with no hosted middleman and no subscription.

Sonderr is built on the MIT-licensed [Kilo Code](https://github.com/Kilo-Org/kilocode)
codebase, which itself derives from [opencode](https://github.com/sst/opencode).
Credit and thanks to both upstream projects.

## Highlights

- **BYOK providers** — OpenAI, Anthropic, Gemini, plus the Kilo Gateway free-model
  endpoint. Swap providers or models at runtime without restarting a session.
- **Terminal UI** — a full TUI with sessions, plan mode, and file/command tooling.
- **Desktop app** — Electron wrapper with an encrypted local config
  (`~/.config/sonderr/config.json`, AES-256-CBC, machine-derived key) and a
  built-in first-run setup screen.
- **Editor integrations** — VS Code extension, JetBrains plugin, Zed extension.
- **Enterprise MCP controls** — dashboard-managed MCP server policy that can
  override local `mcp.json` files per organization. See
  [the docs](packages/sonderr-docs/pages/contributing/features/enterprise-mcp-controls.md).
- **Monorepo** — Bun workspaces + Turborepo; typed end-to-end via generated
  protocol/schema packages.

## Install

### Global `sonderr` command (recommended)

```bash
git clone https://github.com/dxn1-UBUNTU/SONDERR.git
cd SONDERR
./scripts/install.sh
```

This links the global `sonderr` command to the source checkout. Every launch
self-updates (`git pull`), auto-installs Bun if missing, syncs workspace
dependencies, and opens the TUI in the directory you ran it from - always
fresh, no manual rebuilds.

### From source (CLI / TUI)

Requires [Bun](https://bun.sh) 1.3+.

```bash
git clone https://github.com/dxn1-UBUNTU/sonderr.git
cd sonderr
bun install
bun run dev          # runs the CLI in dev mode
```

Build the production binary:

```bash
bun run --cwd packages/cli build
```

## Providers

| Provider         | Notes                                          |
| ---------------- | ---------------------------------------------- |
| OpenAI           | GPT-4o, o-series, and newer                    |
| Anthropic        | Claude Sonnet 4.6, Opus 4.1, and newer         |
| Gemini           | Gemini 2.5 Pro / Flash and newer               |
| Kilo Gateway     | Free/shortlist models via the Kilo Gateway API |

Configure in-session with `/api_attach` or directly in `sonderr.json`.
Keys are stored locally, encrypted, and are only ever sent to the provider you
configured.

## Monorepo layout

| Package                    | Path                            | Description                          |
| -------------------------- | ------------------------------- | ------------------------------------ |
| `@sonderr/cli`             | `packages/cli`                  | Agent engine and CLI entry point     |
| `@sonderr/tui`             | `packages/tui`                  | Terminal UI                          |
| `@sonderr/core`            | `packages/core`                 | Session, tool, and provider core     |
| `@sonderr/server`          | `packages/server`               | Local HTTP server                    |
| `@sonderr/protocol`        | `packages/protocol`             | Client/server protocol definitions   |
| `@sonderr/sdk`             | `packages/sdk-js`               | JavaScript SDK                       |
| `@sonderr/gateway`         | `packages/sonderr-gateway`      | Kilo Gateway provider integration    |
| `@sonderr/sonderr-vscode`  | `packages/sonderr-vscode`       | VS Code extension                    |
| `@sonderr/sonderr-jetbrains` | `packages/sonderr-jetbrains`  | JetBrains plugin                     |
| `sonderr-desktop`          | `electron`                      | Desktop app wrapper                  |
| `@sonderr/sonderr-docs`    | `packages/sonderr-docs`         | Documentation site                   |

## Configuration

- CLI config lives under `~/.sonderr`.
- Desktop config lives at `~/.config/sonderr/config.json` (AES-256-CBC encrypted,
  mode `0600`, machine-derived key).
- MCP servers are configured per project (`mcp.json`) or globally, unless
  organization policy supplies a managed configuration.

## Development

```bash
bun install          # bootstrap all workspaces
bun run typecheck    # tsgo across packages
bun run lint         # oxlint
```

Unit tests live inside each package and run with `bun test` from that package's
directory.

## License

[MIT](LICENSE) — inherits and extends the licenses of Kilo Code and opencode.
Upstream copyright notices are retained where applicable.
