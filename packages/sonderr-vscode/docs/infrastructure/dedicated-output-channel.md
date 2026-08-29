# Dedicated Output Channel

**Priority:** P2

Agent Manager has its own output channel. No general "Sonderr" output channel exists.

## Remaining Work

- Create `vscode.window.createOutputChannel("Sonderr")` during activation
- Centralized logging utility with log levels (debug, info, warn, error)
- Route all `[Sonderr New]` log messages to this channel
- Dispose on deactivation
- Migrate existing `console.log("[Sonderr New] ...")` calls to the logger
