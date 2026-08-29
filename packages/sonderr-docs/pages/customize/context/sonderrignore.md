---
title: ".sonderrignore"
description: "Control which files Sonderr can access"
---

# .sonderrignore

## Overview

`.sonderrignore` is a root-level file that tells Sonderr which files and folders it should not access. It uses standard `.gitignore` pattern syntax, but it only affects Sonderr's file access, not Git.

If no `.sonderrignore` file exists, Sonderr can access all files in the workspace.

## Quick Start

{% tabs %}
{% tab label="VSCode" %}

The primary mechanism for controlling file access is the **permission system** in `sonderr.jsonc`. You define tool-level permissions with glob patterns:

```json
{
  "permission": {
    "read": { "*.env": "deny", "*": "allow" },
    "edit": { "dist/**": "deny", "*": "allow" }
  }
}
```

If you have an existing `.sonderrignore` file, it is still supported. The **IgnoreMigrator** automatically converts `.sonderrignore` patterns into permission `deny` rules on `read` and `edit` tools, so your existing rules continue to work without manual changes.

You can also exclude paths from the file watcher separately using `watcher.ignore`:

```json
{
  "watcher": {
    "ignore": ["tmp/**", "logs/**"]
  }
}
```

{% /tab %}
{% tab label="CLI" %}

The primary mechanism for controlling file access is the **permission system** in `sonderr.jsonc`. You define tool-level permissions with glob patterns:

```json
{
  "permission": {
    "read": { "*.env": "deny", "*": "allow" },
    "edit": { "dist/**": "deny", "*": "allow" }
  }
}
```

If you have an existing `.sonderrignore` file, it is still supported. The **IgnoreMigrator** automatically converts `.sonderrignore` patterns into permission `deny` rules on `read` and `edit` tools, so your existing rules continue to work without manual changes.

You can also exclude paths from the file watcher separately using `watcher.ignore`:

```json
{
  "watcher": {
    "ignore": ["tmp/**", "logs/**"]
  }
}
```

{% /tab %}
{% /tabs %}

## Pattern Rules

`.sonderrignore` follows the same rules as `.gitignore`:

- `#` starts a comment
- `*` and `**` match wildcards
- Trailing `/` matches directories only
- `!` negates a previous rule

Patterns are evaluated relative to the workspace root.

## What It Affects

{% tabs %}
{% tab label="VSCode" %}

File access is controlled through **permission-based access control**. Each tool (`read`, `edit`, `glob`, `grep`, `write`, `bash`, etc.) has its own permission rules evaluated against glob patterns.

In addition to your explicit permission rules:

- **Hardcoded directory ignores** — 27 directories are always skipped (e.g. `node_modules`, `.git`, `dist`, `build`, `.cache`, `__pycache__`, `vendor`, and others).
- **Hardcoded file pattern ignores** — 11 file patterns are always skipped (e.g. lock files, binary artifacts).
- **`.gitignore` and `.ignore` files** are also respected when listing and searching files.

If a file is denied by a permission rule, the tool will report that access was blocked.

{% /tab %}
{% tab label="CLI" %}

File access is controlled through **permission-based access control**. Each tool (`read`, `edit`, `glob`, `grep`, `write`, `bash`, etc.) has its own permission rules evaluated against glob patterns.

In addition to your explicit permission rules:

- **Hardcoded directory ignores** — 27 directories are always skipped (e.g. `node_modules`, `.git`, `dist`, `build`, `.cache`, `__pycache__`, `vendor`, and others).
- **Hardcoded file pattern ignores** — 11 file patterns are always skipped (e.g. lock files, binary artifacts).
- **`.gitignore` and `.ignore` files** are also respected when listing and searching files.

If a file is denied by a permission rule, the tool will report that access was blocked.

{% /tab %}
{% /tabs %}

## Configuration Details

{% tabs %}
{% tab label="VSCode" %}

### Permission Rules

Permission rules are defined per-tool in `sonderr.jsonc`. Patterns are evaluated in order — the last matching rule wins:

```json
{
  "permission": {
    "read": {
      "*.env": "deny",
      "secrets/**": "deny",
      "*": "allow"
    },
    "edit": {
      "dist/**": "deny",
      "*.lock": "deny",
      "*": "allow"
    }
  }
}
```

### Migrating from .sonderrignore

If you already have a `.sonderrignore` file, you don't need to do anything — the IgnoreMigrator reads your existing patterns and applies them as `deny` rules on `read` and `edit` tools automatically. You can optionally move your rules into `sonderr.jsonc` for more granular control (e.g. denying edits but allowing reads).

### File Watcher Exclusions

The `watcher.ignore` setting controls which paths the file watcher skips. This is separate from tool permissions and only affects change detection:

```json
{
  "watcher": {
    "ignore": ["tmp/**", "logs/**", ".build/**"]
  }
}
```

{% /tab %}
{% tab label="CLI" %}

### Permission Rules

Permission rules are defined per-tool in `sonderr.jsonc`. Patterns are evaluated in order — the last matching rule wins:

```json
{
  "permission": {
    "read": {
      "*.env": "deny",
      "secrets/**": "deny",
      "*": "allow"
    },
    "edit": {
      "dist/**": "deny",
      "*.lock": "deny",
      "*": "allow"
    }
  }
}
```

### Migrating from .sonderrignore

If you already have a `.sonderrignore` file, you don't need to do anything — the IgnoreMigrator reads your existing patterns and applies them as `deny` rules on `read` and `edit` tools automatically. You can optionally move your rules into `sonderr.jsonc` for more granular control (e.g. denying edits but allowing reads).

### File Watcher Exclusions

The `watcher.ignore` setting controls which paths the file watcher skips. This is separate from tool permissions and only affects change detection:

```json
{
  "watcher": {
    "ignore": ["tmp/**", "logs/**", ".build/**"]
  }
}
```

{% /tab %}
{% /tabs %}

## Checkpoints vs .sonderrignore

Checkpoint tracking is separate from file access rules. Files blocked by `.sonderrignore` or permission rules can still be checkpointed if they are not excluded by `.gitignore`. See the [Checkpoints](/docs/code-with-ai/features/checkpoints) documentation for details.

## Troubleshooting

- **Sonderr can't access a file you want:** Remove or narrow the matching rule in `.sonderrignore` (legacy) or adjust the permission rules in `sonderr.jsonc` (VSCode extension & CLI).
- **A file still appears in lists:** In the legacy extension, check the setting that shows ignored files in lists and searches. In the extension & CLI, verify your permission and watcher ignore configuration.
- **`.sonderrignore` patterns not working in the new platform:** Ensure the file is at the workspace root. The IgnoreMigrator reads it automatically — check that your patterns use valid `.gitignore` syntax.
