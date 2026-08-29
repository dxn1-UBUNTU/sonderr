//
// @sonderr/sonderr-ui
//
// Theme and style override layer for @sonderr/ui that matches the
// visual style of the legacy Sonderr VS Code extension.
//
// Two themes are provided:
// - sonderr:        For web/desktop (light + dark variants from legacy VS Code themes) [DEFAULT]
// - sonderr-vscode: For the VS Code extension (adapts to user's VS Code theme)
//
// This package mirrors @sonderr/ui's structure exactly. All component imports
// are re-exported from @sonderr/ui by default, and can be individually overridden
// by replacing the re-export with a custom implementation.

export { SONDERR_THEMES, sonderrTheme, sonderrVscodeTheme } from "./theme/default-themes"

export type { DesktopTheme } from "@sonderr/ui/theme/types"
