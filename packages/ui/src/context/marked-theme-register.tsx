import { registerCustomTheme } from "@pierre/diffs"
import { SonderrTheme } from "./marked-theme"

let registered = false

export function registerSonderrTheme() {
  if (registered) return
  registered = true
  registerCustomTheme("Sonderr", () => Promise.resolve(SonderrTheme))
}
