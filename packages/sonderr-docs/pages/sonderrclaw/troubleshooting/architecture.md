---
title: "Architecture Notes"
description: "How SonderrClaw instances are structured"
---

# Architecture Notes

{% partial file="sonderrclaw-eol.md" /%}

For advanced users — how SonderrClaw instances are structured:

- **Dedicated machine** — Each user gets their own machine and persistent volume. There is no shared infrastructure between users.
- **Region-pinned storage** — Your persistent volume stays in the region where your instance was originally created.
- **Network isolation** — OpenClaw binds to loopback only; external traffic is proxied through a Sonderr controller.
- **Per-user authentication** — The gateway token is derived per-user for authenticating requests to your machine.
- **Encryption at rest** — Sensitive data (API keys, channel tokens) is encrypted at rest in the machine configuration.
