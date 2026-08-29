---
title: "Marketplace"
description: "Install agents, skills, and MCP servers from the Sonderr Marketplace"
---

# Marketplace

The Sonderr Marketplace provides reusable extensions for Sonderr. Open **Marketplace** from the Sonderr sidebar to browse, install, and remove items.

Marketplace items are configuration and instruction files, not VS Code extensions. Installing an item adds files to either the current project or your user configuration. Sonderr then discovers those files through its normal configuration system.

## What you can install

| Type | What it adds | What happens after installation |
|---|---|---|
| **Agent** | A reusable role with its own prompt, behavior, and permissions. | The agent becomes available in Sonderr's agent selector. |
| **Skill** | Task-specific instructions and resources that Sonderr can load when relevant. | Sonderr can discover and load the skill during a session. |
| **MCP server** | Tools supplied by an external service or a program running on your machine. | Sonderr starts or connects to the configured server when it loads the MCP configuration. |

MCP stands for **Model Context Protocol**, a standard that lets AI applications use external tools. For example, an MCP server might let Sonderr query a database, work with GitHub, or interact with a browser. See [What is MCP?](/docs/automate/mcp/what-is-mcp) for a fuller explanation.

## Project or global

Every installation has a scope:

| Scope | Availability | Use it when |
|---|---|---|
| **Project** | Only the current project. Files are stored under the project's `.sonderr/` directory. | The whole team should use the item, or it is specific to this repository. |
| **Global** | Every project you open on this machine. Files are stored in your user configuration. | The item is part of your personal workflow across repositories. |

Project files can be committed to version control and shared with teammates. Global files remain on your machine and do not travel with a repository.

When the same configuration exists at both scopes, project configuration takes precedence over global configuration. Learn more about [Sonderr's configuration files and precedence](/docs/getting-started/settings#config-file-precedence).

## Files changed by installation

The install dialog shows the destination before it changes anything.

| Type | Project destination | Global destination |
|---|---|---|
| Agent | `.sonderr/agents/<name>.md` | `~/.config/sonderr/agents/<name>.md` |
| Skill | `.sonderr/skills/<name>/` | `~/.sonderr/skills/<name>/` |
| MCP server | `.sonderr/sonderr.json` | `~/.config/sonderr/sonderr.json` |

Installing an MCP server adds an entry under the `mcp` key without replacing your other Sonderr settings. Installing an agent or skill creates its own file or directory. Removing an item deletes its marketplace-managed entry from the selected scope.

{% callout type="warning" title="Keep credentials out of version control" %}
Some MCP servers require API keys, access tokens, or connection strings. Project configuration may be committed to your repository. Prefer environment-variable references for secrets, and review `.sonderr/sonderr.json` before committing it.
{% /callout %}

## MCP security and permissions

An MCP server can expose tools that read data, modify external systems, or run local operations:

- A **local** MCP server runs a command as a child process on your machine.
- A **remote** MCP server sends requests to an external service.
- Installing the server makes its tools available; it does not automatically approve every tool call.
- MCP tools follow Sonderr's `allow`, `ask`, and `deny` permission rules. The default experience may prompt you before a tool runs, depending on your configuration.

Review the item's author, source link, prerequisites, requested parameters, and available tools before installing it. See [Using MCP in Sonderr](/docs/automate/mcp/using-in-sonderr-code) for configuration, transport, authentication, and permission details.

## Removing an item

An item can be installed at both project and global scope. Its Marketplace card shows it as installed and offers a separate remove action for each installed scope. Removing the project copy does not remove the global copy, and vice versa.

After an install or removal, Sonderr reloads the affected configuration. Running sessions may be interrupted so they do not continue with an outdated set of agents, skills, or tools.

## Contributing

Marketplace entries are maintained in the [Sonderr Marketplace repository](https://github.com/Sonderr-Org/sonderr-marketplace). Contributions should document prerequisites, parameters, available tools, and any platform-specific requirements.
