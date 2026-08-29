# Sonderr

Agentic AI coding workspace for your terminal. BYOK, 32 tools, privacy-first.

## Install

```bash
git clone https://github.com/dxn1-UBUNTU/sonderr.git
cd sonderr
./scripts/install.sh
```

## Usage

- **First launch**: Run `sonderr`, complete the setup wizard, pick a provider, paste your API key.
- **Runtime**: Use `/api_attach` in Sonderr to swap keys/models without restarting.
- **CLI**: `sonderr-attach <provider> <api_key> [model]`

## Providers

- **OpenAI** — GPT-4o, o1, o3, etc.
- **Anthropic** — Claude Opus 4, Claude Sonnet 4, Claude 3.7 Sonnet
- **Gemini** — Gemini 2.5 Pro, Flash, etc.

## Config

Encrypted config stored at `~/.config/sonderr/config.json`. Your key never leaves your machine except when calling the provider API.

## License

MIT. Based on Sonderr (Sonderr-Org/sonderr).
