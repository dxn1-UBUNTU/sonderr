---
title: "FAQ"
description: "Frequently asked questions about SonderrClaw"
---

# FAQ

{% partial file="sonderrclaw-eol.md" /%}

## How can I change my model?

You can change the model in two ways:

- **From chat** — Type `/model` in the Chat window within the OpenClaw Control UI to switch models directly.
- **From the dashboard** — Go to [https://app.kilo.ai/claw](https://app.kilo.ai/claw), select the model you want, and click **Save**. No redeploy is needed.

## Can I access the filesystem?

You can access instance files in `/root/.openclaw/` directly from the [SonderrClaw Dashboard](https://app.kilo.ai/claw). This is useful for examining or restoring config files. You can also interact with files through your OpenClaw agent using its built-in file tools.

## Can I access my SonderrClaw via SSH?

For security reasons, SSH access is currently disabled for all SonderrClaw instances. Our primary goal is to provide a secure environment for all users, and restricting direct SSH access is one of the many measures we take to ensure the platform remains safe and protected for everyone.

## How can I update my OpenClaw?

Do **not** click **Update Now** inside the OpenClaw Control UI — this is not supported for SonderrClaw instances and may break your setup.

Updates are managed by the SonderrClaw platform team to ensure stability. When a new version is available, it will be announced in the **Changelog** on your dashboard. To apply the update, click **Upgrade & Redeploy** from the [SonderrClaw Dashboard](/docs/sonderrclaw/dashboard#redeploy).
