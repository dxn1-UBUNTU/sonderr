---
title: "Code Actions"
description: "Quick code actions and refactoring with Sonderr"
---

# Code Actions

Code Actions are a powerful feature of VS Code that provide quick fixes, refactorings, and other code-related suggestions directly within the editor. Sonderr integrates with this system to offer AI-powered assistance for common coding tasks.

{% callout type="info" %}
Code Actions are a **VS Code extension feature** and are not available in the CLI/TUI.
{% /callout %}

## Available Code Actions

The extension provides code actions via the editor context menu and lightbulb:

- **Add to Context:** Adds selected code (with file path and line numbers) to the active chat session. Keyboard shortcut: `Cmd+K Cmd+A` (Mac) or `Ctrl+K Ctrl+A` (Windows/Linux).
- **Explain Code:** Asks Sonderr to explain the selected code.
- **Fix Code:** Asks Sonderr to fix problems in the selected code.
- **Improve Code:** Asks Sonderr to suggest improvements to the selected code.

### Agent Manager Integration

If the **Agent Manager** is active, code actions route to the current Agent Manager session rather than the sidebar chat. This allows code actions to work seamlessly within multi-session workflows.

### Terminal Context Menu

The extension also adds code actions to the **terminal context menu**:

- **Add Terminal Content:** Adds selected terminal output to the chat context.
- **Fix Command:** Asks Sonderr to fix a failed terminal command.
- **Explain Command:** Asks Sonderr to explain a terminal command or its output.

By using Sonderr's Code Actions, you can quickly get AI-powered assistance directly within your coding workflow. This can save you time and help you write better code.
