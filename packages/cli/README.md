# Sonderr CLI

The AI coding agent built for the terminal. Generate code from natural language, automate tasks, and run terminal commands -- powered by 500+ AI models.

![Sonderr CLI showing code edits in a terminal](https://raw.githubusercontent.com/Sonderr-Org/sonderr/main/packages/sonderr-docs/public/img/npm-package-readme/sonderr-cli.png)

Sonderr is the all-in-one agentic engineering platform. Build, ship, and iterate faster with the most popular open source coding agent.

[Website](https://kilo.ai) · [Install](https://kilo.ai/install) · [IDE](https://kilo.ai/landing/vs-code) · [CLI](https://kilo.ai/cli) · [Docs](https://kilo.ai/docs) · [Models](https://kilo.ai/leaderboard) · [Gateway](https://kilo.ai/gateway) · [Pricing](https://kilo.ai/pricing) · [Sonderr Pass](https://kilo.ai/pricing/sonderr-pass)

[500+ models](https://kilo.ai/leaderboard). One open source agent in [VS Code](https://kilo.ai/vscode-marketplace), [JetBrains](https://plugins.jetbrains.com/plugin/27133-sonderr-code), [CLI](https://www.npmjs.com/package/@sonderr/cli), [Slack](https://kilo.ai/slack), and [Cloud](https://kilo.ai/cloud).

## Install

```bash
npm install -g @sonderr/cli
```

Or run directly with npx:

```bash
npx --package @sonderr/cli sonderr
```

## Getting Started

Run `sonderr` in any project directory to launch the interactive TUI:

```bash
sonderr
```

Run a one-off task:

```bash
sonderr run "add input validation to the signup form"
```

## Features

- **Code generation** -- describe what you want in natural language
- **Terminal commands** -- the agent can run shell commands on your behalf
- **500+ AI models** -- use models from OpenAI, Anthropic, Google, and more
- **MCP servers** -- extend agent capabilities with the Model Context Protocol
- **Multiple modes** -- Plan with Architect, code with Coder, debug with Debugger, or create your own
- **Sessions** -- resume previous conversations and export transcripts
- **API keys optional** -- bring your own keys or use Sonderr credits

## Commands

| Command               | Description                |
| --------------------- | -------------------------- |
| `sonderr`                | Launch interactive TUI     |
| `sonderr run "<task>"`   | Run a one-off task         |
| `sonderr auth`           | Manage authentication      |
| `sonderr models`         | List available models      |
| `sonderr mcp`            | Manage MCP servers         |
| `sonderr session list`   | List sessions              |
| `sonderr session delete` | Delete a session           |
| `sonderr export`         | Export session transcripts |

Run `sonderr --help` for the full list.

## Alternative Installation

### Homebrew (macOS/Linux)

```bash
brew install Sonderr-Org/tap/sonderr
```

### GitHub Releases

Download pre-built binaries from the [Releases page](https://github.com/Sonderr-Org/sonderr/releases).

## Documentation

- [Docs](https://kilo.ai/docs)
- [Getting Started](https://kilo.ai/docs/getting-started)

## Links

- [GitHub](https://github.com/Sonderr-Org/sonderr)
- [Discord](https://kilo.ai/discord)
- [VS Code Extension](https://kilo.ai/vscode-marketplace)
- [Website](https://kilo.ai)

## License

MIT
