---
title: "Troubleshooting IDE Extensions"
description: "How to capture console logs and report issues with Sonderr"
---

# Capturing Console Logs

Providing console logs helps us pinpoint exactly what's going wrong with your installation, network, or MCP setup. This guide walks you through capturing those logs in your IDE.

## Opening Developer Tools

1. **Open the Command Palette**: Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
2. **Search for Developer Tools**: Type `Developer: Open Webview Developer Tools` and select it

## Capturing the Error

Once you have the Developer Tools console open:

1. **Clear previous logs**: Click the "Clear Console" button (🚫 icon at the top of the Console panel) to remove old messages
2. **Reproduce the issue**: Perform the action that was causing problems
3. **Check for errors**: Look at the Console tab for error messages (usually shown in red). If you suspect connection issues, also check the **Network** tab
4. **Copy the logs**: Right-click in the console and select "Save as..." or copy the relevant error messages

## SQLite database is malformed

If every prompt fails with `SQLiteError: database disk image is malformed`, Sonderr's local SQLite database may be corrupted. This database stores local Sonderr state such as sessions and history.

### Find the database

When the sonderr CLI uses the same environment as the affected installation, run `sonderr db path` to print the selected database. See [Session History and Search](/docs/code-with-ai/agents/session-history) for normal database inspection and search workflows.

The default database location depends on where Sonderr is running:

| Environment | Database path |
|---|---|
| Windows | `%USERPROFILE%\.local\share\sonderr\sonderr.db` |
| macOS | `~/.local/share/sonderr/sonderr.db` |
| Linux | `~/.local/share/sonderr/sonderr.db` |
| VS Code Remote SSH | `~/.local/share/sonderr/sonderr.db` on the remote machine |

{% callout type="warning" %}
When using VS Code Remote SSH, check the remote Linux machine, not your local Windows or macOS computer.
{% /callout %}

### Reset the database

Close VS Code or stop the Sonderr backend first. On Linux or Remote SSH, run:

```bash
pkill -f "sonderr serve"
mkdir -p ~/.local/share/sonderr
mv ~/.local/share/sonderr/sonderr.db ~/.local/share/sonderr/sonderr.db.bak
mv ~/.local/share/sonderr/sonderr.db-wal ~/.local/share/sonderr/sonderr.db-wal.bak 2>/dev/null
mv ~/.local/share/sonderr/sonderr.db-shm ~/.local/share/sonderr/sonderr.db-shm.bak 2>/dev/null
```

Then reload VS Code or reconnect Remote SSH. Sonderr recreates the database the next time it starts.

On Windows or macOS, rename the database file and any `sonderr.db-wal` or `sonderr.db-shm` files in the same folder, then restart the IDE.

{% callout type="warning" %}
Renaming this database resets local Sonderr sessions and history for that machine. Keep the `.bak` files if you need to share them with support or attempt recovery later.
{% /callout %}

### Fully reset local Sonderr data

If resetting the database does not fix the issue, you can fully reset Sonderr's local data. This also removes local configuration and cache files, so use it only after trying the database reset above.

On Linux or VS Code Remote SSH, run this on the machine where Sonderr is running:

```bash
pkill -f "sonderr serve"
mv ~/.local/share/sonderr ~/.local/share/sonderr.bak 2>/dev/null
mv ~/.config/sonderr ~/.config/sonderr.bak 2>/dev/null
mv ~/.cache/sonderr ~/.cache/sonderr.bak 2>/dev/null
```

Then reload VS Code or reconnect Remote SSH. Sonderr recreates these directories the next time it starts.

{% callout type="warning" %}
This resets local sessions, history, settings, and cached data. Prefer renaming the directories instead of deleting them so you can recover files. Remove secrets such as API keys or tokens before sharing any backup with support.
{% /callout %}

## Contact Support

If you're unable to resolve the issue, please inspect the console logs, remove any secrets, and send the logs to **[hi@kilocode.ai](mailto:hi@kilocode.ai)** along with the following:

- The error messages from the console
- Steps to reproduce the issue
- Screenshots or screen recordings of the issue
- Your IDE and Sonderr version
