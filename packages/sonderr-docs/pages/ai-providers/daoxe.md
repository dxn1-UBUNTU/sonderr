---
title: "Using DaoXE with Sonderr"
description: "Connect Sonderr to DaoXE's multi-model API gateway with an API key and an account-available model ID."
sidebar_label: DaoXE
---

# Using DaoXE With Sonderr

[DaoXE](https://daoxe.com) is an AI gateway with native Claude protocol, verifiable routing, and one-key access to Claude, GPT, Gemini, and more. Sonderr uses the `daoxe` provider ID and reads your API key from `DAOXE_API_KEY`.

{% callout type="warning" %}
DaoXE is not available in mainland China. Requests from mainland China may be blocked or rejected.
{% /callout %}

## Before you begin

1. Create an account at [daoxe.com](https://daoxe.com).
2. Create an API key in your DaoXE dashboard.
3. Choose an exact model ID available to your account. Model availability and pricing can change, so check the live catalog instead of copying an old model list.

## Configure Sonderr

{% tabs %}
{% tab label="VSCode" %}

1. Open **Settings** in the Sonderr extension.
2. Go to the **Providers** tab and add **DaoXE**. If it is not visible, click **Show more providers**.
3. Enter your DaoXE API key.
4. Select a model that is available to your DaoXE account.

The provider credentials are stored in Sonderr's `auth.json` store.

{% /tab %}
{% tab label="CLI" %}

**Recommended:** connect interactively so the API key is stored in Sonderr's `auth.json` store (same credential store as VS Code).

1. In the TUI, run `/connect` and choose **DaoXE**, then paste your API key.
2. Or from the shell:

```bash
sonderr auth login --provider daoxe
```

Then pick a model from the model picker, or set a default model using the `provider-id/model-id` format:

```jsonc
{
  "model": "daoxe/your-account-model-id",
}
```

Replace `your-account-model-id` with an exact model ID available to your account.

**Manual configuration (optional):** set the key in the environment and declare the provider in `~/.config/sonderr/sonderr.json` or `./sonderr.json` without writing the secret into the project file:

```bash
export DAOXE_API_KEY="your-api-key"
```

```jsonc
{
  "provider": {
    "daoxe": {
      "env": ["DAOXE_API_KEY"],
    },
  },
  "model": "daoxe/your-account-model-id",
}
```

{% /tab %}
{% /tabs %}

## API compatibility

Sonderr connects to DaoXE through the OpenAI-compatible API at `https://daoxe.com/v1`. DaoXE also exposes OpenAI Responses, Anthropic Messages, and image-generation-compatible endpoints, but the provider configuration on this page uses Sonderr's OpenAI-compatible chat path.

For standalone cURL, Node.js, Python, Postman, and Claude Code examples, see the [DaoXE-AI examples repository](https://github.com/seven7763/DaoXE-AI).

## Troubleshooting

- **Invalid API key:** Create a new key in your DaoXE dashboard, then reconnect with `/connect` / `sonderr auth login --provider daoxe`, or update `DAOXE_API_KEY` if you use manual configuration.
- **Model not found:** Copy an exact model ID available to your account. Do not rely on a static model list.
- **Provider not visible:** Refresh Sonderr's provider catalog, then check **Show more providers**.
- **Connection rejected:** Confirm that you are using the service from an available region.

{% callout type="note" %}
This documentation was contributed by a DaoXE affiliate.
{% /callout %}
