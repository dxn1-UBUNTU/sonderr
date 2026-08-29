---
title: "Settings"
description: "Configure Sonderr settings and preferences"
---

# Settings

The VS Code extension can be configured through the Settings window, opened by pressing the gear icon in Sonderr. Changes apply across extension surfaces, including the sidebar and Agent Manager. The CLI can also use the same JSONC config files when you use it directly.

## Configuring with the Agent

The fastest way to change your Sonderr configuration is to ask the agent to do it for you. The agent has a built-in skill that understands the full `sonderr.jsonc` schema and can read, create, and update your config files directly.

**Examples of things you can ask:**

- "Switch my default model to Claude Sonnet"
- "Disable the OpenAI and Groq providers"
- "Set up an MCP server for Figma"
- "Auto-approve all read and glob operations"
- "Create a custom agent for code review"

The agent will edit the appropriate config file (global or project-level) and explain what it changed. This works in both the CLI and VS Code extension.

{% callout type="tip" %}
This is especially useful for complex configuration like custom model definitions, MCP server setup, or permission patterns — the agent knows the correct syntax and will validate the config for you.
{% /callout %}

## Managing Settings

Sonderr reads JSONC config from a **global** location (`~/.config/sonderr/sonderr.jsonc`) and from your **project** (`sonderr.jsonc`, or `.sonderr/sonderr.jsonc`). All clients — CLI, VS Code, and JetBrains — read the same files.

If `sonderr.json` or the legacy `sonderr.json`, `sonderr.jsonc`, or `config.json` files exist in the same locations, Sonderr reads and deep-merges them as well. Clearing a setting in the Settings UI (for example, setting a model back to "Not set") removes it from every config file that contains it.

{% callout type="warning" %}
**Migrating from sonderr?** Sonderr no longer falls back to sonderr configuration stored in `.sonderr` directories (such as `~/.config/sonderr` or a project `./.sonderr/`). To keep using it, move your global config into `~/.config/sonderr/` and any project config into `./.sonderr/`.
{% /callout %}

{% tabs %}
{% tab label="VSCode" %}

The VS Code extension provides a **Settings webview UI** accessible from Sonderr by clicking the gear icon ({% codicon name="gear" /%}). The UI is organized into tabs including Providers, Auto-Approve, Models, and more.

This UI reads and writes to the same underlying JSONC config files used across extension surfaces. Changes apply to the sidebar, Agent Manager, and the CLI when used directly.

### Config File Locations

There are two primary config files:

- **Global config:** `~/.config/sonderr/sonderr.jsonc` — applies to all projects. On Windows, this is `C:\Users\<username>\.config\sonderr\sonderr.jsonc`.
- **Project config:** `sonderr.jsonc` in your project root, or `.sonderr/sonderr.jsonc` for a cleaner setup. The `.sonderr/` version takes priority if both exist.

Use **Local Config** or **Global Config** in the Settings header to open the matching config file from VS Code. If multiple config files are available, choose the exact file from the picker. If the recommended file does not exist yet, Sonderr creates it before opening it.

{% callout type="warning" %}
If you check config files into version control, make sure they do not contain API keys or other secrets (e.g., `provider.*.options.apiKey`). Use environment variables for credentials instead.
{% /callout %}

### Voice Transcription Model

When the Sonderr provider is enabled and you are signed in, choose the transcription model under **Models** > **Speech to Text Model**. This stores `experimental.speech_to_text_model` in your global Sonderr CLI config:

```json
{
  "experimental": {
    "speech_to_text_model": "openai/whisper-large-v3-turbo"
  }
}
```

### Prompt-Training Model Visibility

Enable **Hide Prompt-Training Models** under **Models** to remove Sonderr Gateway models whose providers may use your prompts for training from model lists. Models from other providers and models without explicit prompt-training metadata remain visible. The setting is disabled by default.

You can also enable it in `sonderr.jsonc`:

```json
{
  "hide_prompt_training_models": true
}
```

### Reasoning Blocks

Reasoning blocks stay expanded by default in the VS Code chat UI. Enable **Auto-Collapse Reasoning** in the Display tab, or set `auto_collapse_reasoning` in `sonderr.jsonc`, to collapse them after the agent finishes writing them:

```json
{
  "auto_collapse_reasoning": true
}
```

### Terminal Command Blocks

Terminal command blocks stay expanded by default in the VS Code chat UI. Choose **Collapsed** for **Terminal Command Blocks** in the Display tab, or set `terminal_command_display` in `sonderr.jsonc`, to start them collapsed:

```json
{
  "terminal_command_display": "collapsed"
}
```

Valid values are `expanded` and `collapsed`.

### Markdown Diff Rendering

Markdown files in Sonderr diff viewers can be shown as rendered Markdown instead of a raw text diff. Use the eye/code toggle in a Markdown file header, or set `sonderr-code.new.diff.renderMarkdown` to `true` to render Markdown files by default.

### Web Search

See [Web Search Availability](/docs/automate/tools#web-search-availability) for how to enable the `websearch` tool for models from all providers.

### Export and Import

You can export and import settings from the **About Sonderr** tab in the Settings UI:

- **Export**: Saves your global config as a `sonderr-settings.json` file. Review it before sharing, because config values are exported as-is.
- **Import**: Loads a previously exported JSON file into the settings draft. Changes are not applied immediately — you can review them and click Save or Discard, just like any manual edit.

Config files are also plain-text and portable — you can copy `~/.config/sonderr/sonderr.jsonc` between machines directly.

{% /tab %}
{% tab label="CLI" %}

In the CLI, settings are managed via **JSONC config files** directly. Config files are plain-text and portable -- you can copy them between machines.

{% callout type="warning" %}
If you check `sonderr.jsonc` into version control, make sure it does not contain API keys or other secrets (e.g., `provider.*.options.apiKey`). Use environment variables for credentials instead.
{% /callout %}

### Config File Locations

There are two primary config files:

- **Global config:** `~/.config/sonderr/sonderr.jsonc` -- applies to all projects. On Windows, this is `C:\Users\<username>\.config\sonderr\sonderr.jsonc`.
- **Project config:** `sonderr.jsonc` in the root of your project -- overrides global settings for that project.

Both files use the [JSONC](https://code.visualstudio.com/docs/languages/json#_json-with-comments) format (JSON with comments).

### Config File Precedence

Settings are resolved through an 8-level precedence system (lowest to highest priority):

1. **Legacy Sonderr** -- migrated settings from the VSCode extension
2. **Remote well-known** -- remotely fetched defaults
3. **Global** -- `~/.config/sonderr/sonderr.jsonc`
4. **Custom** -- additional custom config paths
5. **Project** -- `sonderr.jsonc` in the project root
6. **`.sonderr` directory** -- config from a `.sonderr/` directory in the project
7. **Inline environment** -- environment variable overrides
8. **Managed / Enterprise** -- enterprise-managed configuration (highest priority)

Higher-priority levels override lower ones. This allows organizations to enforce settings at the enterprise level while still letting individual developers customize their local environment.

### Schema Auto-Injection

When you create or open a `sonderr.jsonc` file, the CLI automatically injects a `$schema` property pointing to the config JSON schema. This gives you **autocompletion and validation** in any editor that supports JSON Schema (VS Code, JetBrains, etc.).

### Export and Import

There is no traditional export/import of settings -- the JSONC config files themselves are portable. Copy `~/.config/sonderr/sonderr.jsonc` or `sonderr.jsonc` to another machine and you're done.

For **session** export and import, use the CLI commands:

- `sonderr export` -- export session data
- `sonderr import` -- import session data

{% /tab %}
{% /tabs %}

## Sandbox

On macOS and Linux, the VS Code extension includes a dedicated **Sandboxing** settings tab. The sandbox is disabled by default. When enabled, it limits agent filesystem writes and can block outbound network access from model-originated tools. Windows users do not see these settings because Windows sandboxing is not supported.

See [Sandboxing](/docs/getting-started/settings/sandboxing) for setup instructions, the exact filesystem and network boundaries, and platform limitations.

## Experimental Features

{% tabs %}
{% tab label="VSCode" %}

The new extension exposes experimental features via the **Experimental** tab in Settings (click the gear icon {% codicon name="gear" /%} → Experimental).

Available experimental settings include:

- **Share mode** - `manual`, `auto`, or `disabled` session sharing
- **LSP integration** - expose language server diagnostics to the agent
- **Paste summary** - summarize large clipboard pastes before including them
- **Batch tool** - allow the agent to batch multiple tool calls in one step
- **OpenTelemetry** - enable Sonderr telemetry and optional OTLP export when configured

Advanced options not exposed in the UI can be configured via the `experimental` key in `sonderr.jsonc`:

```json
{
  "experimental": {
    "batch_tool": false,
    "openTelemetry": true,
    "disable_paste_summary": false,
    "mcp_timeout": 30000
  }
}
```

Refer to the auto-generated `$schema` in your `sonderr.jsonc` for the full list of available options.

{% /tab %}
{% tab label="CLI" %}

The CLI does not expose these options through an IDE settings panel. Configure model behavior, permissions, telemetry, and other advanced options directly in JSONC config files. Refer to the auto-generated `$schema` in your `sonderr.jsonc` for the full list of available options.

Telemetry is enabled by default. Set `experimental.openTelemetry` to `false` in `sonderr.jsonc` to opt out. If `OTEL_EXPORTER_OTLP_ENDPOINT` is set in the environment, the CLI also exports OpenTelemetry traces and logs to that OTLP HTTP endpoint.

{% /tab %}
{% /tabs %}
