# Sonderr Desktop

AI coding agent for Linux desktop. Fork of Kilo Code (MIT), rebranded and wrapped for native desktop use.

## Install

```bash
git clone <your-repo-url>
cd sonderr-desktop-app
./scripts/install.sh
```

Or run the wizard directly:
```bash
sonderr-desktop
```

## Usage

- **First boot**: The setup wizard opens automatically. Pick a provider (OpenAI, Anthropic, Gemini), paste your API key, and choose a model.
- **Runtime**: Use `/api_attach` in Kilo to swap keys/models without restarting.
- **CLI**: `sonderr-attach <provider> <api_key> [model]`

## Providers

- **OpenAI** — GPT-4o, o1, o3, etc.
- **Anthropic** — Claude Opus 4, Claude Sonnet 4, Claude 3.7 Sonnet
- **Gemini** — Gemini 2.5 Pro, Flash, etc.

## Config

Encrypted config stored at `~/.config/sonderr-desktop/config.json`. Your key never leaves your machine except when calling the provider API.

## License

MIT. Based on Kilo Code (Kilo-Org/kilocode).
