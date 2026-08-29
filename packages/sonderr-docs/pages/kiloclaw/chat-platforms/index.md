---
title: "Chat Platforms"
description: "Use Sonderr Chat or connect your SonderrClaw agent to Telegram, Discord, and Slack"
---

# Chat Platforms

{% partial file="sonderrclaw-eol.md" /%}

SonderrClaw includes Sonderr Chat as its first-party channel and also supports connecting your AI agent to messaging platforms so it can receive instructions and send responses directly in your chat apps. You can configure third-party channels from the **Settings** tab on your [SonderrClaw dashboard](/docs/sonderrclaw/dashboard#channels), or from the OpenClaw Control UI after accessing your instance.

## Sonderr Chat

Sonderr Chat is the zero-setup, first-party channel for SonderrClaw. It is enabled by default, does not require a per-sandbox channel token, and is available from the Sonderr web and mobile apps as well as supported Sonderr editor and TUI surfaces.

Use Sonderr Chat when you want to talk to your Claw without configuring a separate bot or app in another messaging platform. For external team chat tools, use one of the third-party channels below.

## Third-Party Platforms

The general steps to connect a third-party chat platform are:

1. Configure the channel token in Settings
2. Redeploy the SonderrClaw instance
3. Initiate the pairing in the chat app
4. Accept the pairing request in the [SonderrClaw UI](https://app.kilo.ai/claw)

## Supported Platforms

- [**Sonderr Chat**](https://app.kilo.ai) — Use the built-in first-party channel with no token setup.
- [**Telegram**](/docs/sonderrclaw/chat-platforms/telegram) — Connect via a BotFather bot token.
- [**Discord**](/docs/sonderrclaw/chat-platforms/discord) — Connect via a Discord Developer Portal bot token.
- [**Slack**](/docs/sonderrclaw/chat-platforms/slack) — Connect via a Slack app manifest with app-level and bot tokens.
