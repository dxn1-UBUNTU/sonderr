export type {
  DesktopTheme,
  ThemeSeedColors,
  ThemeVariant,
  HexColor,
  OklchColor,
  ResolvedTheme,
  ColorValue,
  CssVarRef,
} from "@sonderr/ui/theme/types"

export {
  hexToRgb,
  rgbToHex,
  hexToOklch,
  oklchToHex,
  rgbToOklch,
  oklchToRgb,
  generateScale,
  generateNeutralScale,
  generateAlphaScale,
  mixColors,
  lighten,
  darken,
  withAlpha,
} from "@sonderr/ui/theme/color"

export { resolveThemeVariant, resolveTheme, themeToCss } from "@sonderr/ui/theme/resolve"
export { applyTheme, loadThemeFromUrl, getActiveTheme, removeTheme, setColorScheme } from "@sonderr/ui/theme/loader"

// Override: use our context with sonderr default
export { ThemeProvider, useTheme, type ColorScheme } from "./context"

// Override: use our default-themes which includes Sonderr themes
export {
  DEFAULT_THEMES,
  sonderrTheme,
  sonderrVscodeTheme,
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
} from "./default-themes"
