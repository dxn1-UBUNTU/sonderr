# Sonderr Rules Migration

This document explains how Sonderr rules are automatically migrated to Sonderr's `instructions` config array.

## Overview

Sonderr stores rules in various file locations. When Sonderr starts, it reads these files and injects their paths into the `instructions` config array, which Sonderr then loads as part of the system prompt.

## Key Guarantees

### 1. Read-Only Migration

The migration **never modifies project files**. We only:

- Read existing rule files from disk
- Inject file paths into the config's `instructions` array
- Never write to the project or modify any files

### 2. Combines with Existing Config (Never Overwrites)

If you have existing sonderr config with `instructions`, the Sonderr rules are **combined**, not replaced:

```typescript
// Example: User has sonderr.json with:
{ "instructions": ["AGENTS.md", "custom-rules.md"] }

// Sonderr rules add:
{ "instructions": [".sonderrrules", ".sonderr/rules/coding.md"] }

// Result (combined, deduplicated):
{ "instructions": ["AGENTS.md", "custom-rules.md", ".sonderrrules", ".sonderr/rules/coding.md"] }
```

### 3. Restart to Pick Up Changes

If you change your Sonderr configuration (e.g., edit `.sonderrrules`), simply restart sonderr-cli to pick up the new config. No manual migration or conversion needed.

## Source Locations

The migrator reads rules from these locations:

### Project Rules

| Location | Description |
|---|---|
| `.sonderrrules` | Legacy single-file rules in project root |
| `.sonderr/rules/*.md` | Directory-based rules (multiple markdown files) |
| `.sonderrrules-{mode}` | Mode-specific legacy rules (e.g., `.sonderrrules-code`) |
| `.sonderr/rules-{mode}/*.md` | Mode-specific rule directories |

### Global Rules

| Location | Description |
|---|---|
| `~/.sonderr/rules/*.md` | Global rules directory |

## File Mapping

| Sonderr Location | Sonderr Equivalent |
|---|---|
| `.sonderrrules` | `instructions: [".sonderrrules"]` |
| `.sonderrrules-{mode}` | `instructions: [".sonderrrules-{mode}"]` |
| `.sonderr/rules/*.md` | `instructions: [".sonderr/rules/file.md", ...]` |
| `.sonderr/rules-{mode}/*.md` | `instructions: [".sonderr/rules-{mode}/file.md", ...]` |
| `~/.sonderr/rules/*.md` | `instructions: ["~/.sonderr/rules/file.md", ...]` |

## AGENTS.md Compatibility

`AGENTS.md` is loaded **natively** by Sonderr - no migration needed. Sonderr automatically loads:

- `AGENTS.md` in project root
- `CLAUDE.md` in project root
- `~/.config/sonderr/AGENTS.md` (global)

## Not Migrated

The following are **not** migrated:

- `.roorules` - Roo-specific rules
- `.clinerules` - Cline-specific rules

Only Sonderr-specific files (`.sonderrrules`, `.sonderr/rules/`) are migrated.

## Mode-Specific Rules

Mode-specific rules (e.g., `.sonderrrules-code`, `.sonderr/rules-architect/`) are included by default. All mode-specific rules are loaded regardless of the current mode.

## Warnings

The migrator generates warnings for:

- **Legacy files**: When `.sonderrrules` is found, a warning suggests migrating to `.sonderr/rules/` directory structure

## Example

### Before (Sonderr)

```
project/
├── .sonderrrules           # Legacy rules
├── .sonderrrules-code      # Code-mode specific
└── .sonderr/
    └── rules/
        ├── coding.md        # Coding standards
        └── testing.md       # Testing guidelines
```

### After (Sonderr Config)

```json
{
  "instructions": [
    "/path/to/project/.sonderr/rules/coding.md",
    "/path/to/project/.sonderr/rules/testing.md",
    "/path/to/project/.sonderrrules",
    "/path/to/project/.sonderrrules-code"
  ]
}
```

## Troubleshooting

### Rules not appearing

1. Check the file exists at the expected location
2. Ensure markdown files have `.md` extension
3. Restart sonderr-cli to pick up changes

### Duplicate rules

The `mergeConfigConcatArrays` function automatically deduplicates the `instructions` array using `Array.from(new Set([...]))`.

## Related Files

- [`rules-migrator.ts`](../rules-migrator.ts) - Core migration logic
- [`config-injector.ts`](../config-injector.ts) - Config building and injection
- [`modes-migration.md`](./modes-migration.md) - Modes migration documentation
