# Extension View Doesn't Refresh on Restart/Update

**Priority:** P1
**Issue:** [#6086](https://github.com/Sonderr-Org/sonderr/issues/6086)

## Remaining Work

- Subscribe to `vscode.extensions.onDidChange` to detect extension updates
- When Sonderr is updated, force-reload the webview panel (dispose and recreate, or post reload message)
- Ensure panel is properly disposed and recreated on extension host restart
