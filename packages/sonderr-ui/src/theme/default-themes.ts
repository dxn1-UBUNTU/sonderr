import type { DesktopTheme } from "@sonderr/ui/theme/types"
import { DEFAULT_THEMES as UPSTREAM_THEMES } from "@sonderr/ui/theme/default-themes"
import sonderrJson from "./themes/sonderr.json"
import sonderrVscodeJson from "./themes/sonderr-vscode.json"

// Re-export all upstream theme constants
export {
  oc2Theme,
  tokyonightTheme,
  draculaTheme,
  monokaiTheme,
  solarizedTheme,
  nordTheme,
  catppuccinTheme,
  ayuTheme,
  oneDarkProTheme,
  shadesOfPurpleTheme,
  nightowlTheme,
  vesperTheme,
  carbonfoxTheme,
  gruvboxTheme,
  auraTheme,
} from "@sonderr/ui/theme/default-themes"

export const sonderrTheme = sonderrJson as DesktopTheme
export const sonderrVscodeTheme = sonderrVscodeJson as DesktopTheme

export const SONDERR_THEMES: Record<string, DesktopTheme> = {
  sonderr: sonderrTheme,
  "sonderr-vscode": sonderrVscodeTheme,
}

// Override DEFAULT_THEMES: Sonderr themes first, then upstream
export const DEFAULT_THEMES: Record<string, DesktopTheme> = {
  ...SONDERR_THEMES,
  ...UPSTREAM_THEMES,
}
