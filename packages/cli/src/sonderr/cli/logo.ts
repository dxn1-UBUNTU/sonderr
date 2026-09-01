// sonderr_change - new file
const yes = new Set(["1", "true", "yes", "on"])
const no = new Set(["0", "false", "no", "off"])

// SONDERR wordmark - 7 letters at 5-wide each + 2-space gaps between letters.
// Hand-designed 5-row pixel font. Top, mid1, mid2, mid3, bottom:
//   S: top arc, top-left bar, middle arc, bottom-right bar, bottom arc
//   O: top arc, full vertical sides, full vertical sides, full vertical sides, bottom arc
//   N: vertical sides, diagonal via mid1 pixels, diagonal via mid2 pixels,
//      diagonal via mid3 pixels, vertical sides
//   D: top bar, side verticals x3, bottom bar
//   E: top bar, left bar, full middle, left bar, bottom bar
//   R: top bar, side vertical, full middle, side + mid leg, side + bottom leg
// `plain` is the compact 3-row version (top + center + bottom) for use in
// places that need a single-line wordmark without the shading detail.
const SONDERR_TUI = [
  "███    ███   █   █  ████   █████  ████   ████ ",
  "█      █   █  ██  █  █   █  █      █   █  █   █",
  " ███   █   █  █ █ █  █   █  ████   ████   ████ ",
  "    █  █   █  █  ██  █   █  █      █  █   █  █ ",
  "████    ███   █   █  ████   █████  █   █  █   █",
]

const SONDERR_PLAIN = [
  "███    ███   █   █  ████   █████  ████   ████ ",
  " ███   █   █  █ █ █  █   █  ████   ████   ████ ",
  "████    ███   █   █  ████   █████  █   █  █   █",
]

// SONDE prefix (first 5 letters) for the child-session banner. Indented 2
// spaces so the title text that follows aligns cleanly to the right of the
// wordmark (see packages/tui/src/util/presentation.ts which assembles it).
const SONDE_EXIT = [
  "  ███    ███   █   █  ████   ████",
  "  █      █   █  ██  █  █   █  █  ",
  "   ███   █   █  █ █ █  █   █  ███",
  "      █  █   █  █  ██  █   █  █  ",
  "  ████    ███   █   █  ████   ███",
]

// sonderr_change - the SONDERR wordmark uses only ASCII chars (█, space) so it
// renders identically on every terminal - dumb terminals, Windows Console Host,
// SSH sessions, anything. The fallback is kept structurally identical to the
// modern slot for now; the terminal-capability gate is preserved so a richer
// Unicode art (sextants, half-blocks) can be reintroduced later without
// touching any caller. SONDERR_UNICODE_LOGO still overrides.
const modern = {
  tui: SONDERR_TUI,
  plain: SONDERR_PLAIN,
  exit: SONDE_EXIT,
}

const fallback = {
  tui: SONDERR_TUI,
  plain: SONDERR_PLAIN,
  exit: SONDE_EXIT,
}

function flag(value: string | undefined) {
  const key = value?.toLowerCase()
  if (!key) return
  if (yes.has(key)) return true
  if (no.has(key)) return false
}

function windows(env: NodeJS.ProcessEnv) {
  if (env.WT_SESSION) return true
  if (env.TERM_PROGRAM === "vscode") return true
  if (env.WEZTERM_PANE) return true
  if (env.TERM_PROGRAM === "WezTerm") return true
  return false
}

// sonderr_change start - the SONDERR wordmark now uses only ASCII block
// elements, so the terminal-capability gate is dormant. Kept so that richer
// glyph art (Unicode 13 sextants, etc.) can be reintroduced later without
// touching callers. SONDERR_UNICODE_LOGO=1 forces the "modern" slot.
export function supports(env = process.env, platform = process.platform) {
  const override = flag(env.SONDERR_UNICODE_LOGO)
  if (override !== undefined) return override
  if (env.TERM === "dumb") return false
  if (platform === "win32") return windows(env)
  if (env.ConEmuPID) return false
  if (env.ANSICON) return false
  return true
}

export function tui(env = process.env, platform = process.platform) {
  return supports(env, platform) ? modern.tui : fallback.tui
}

export function plain(env = process.env, platform = process.platform) {
  return supports(env, platform) ? modern.plain : fallback.plain
}

export function session(
  title: string,
  id: string | undefined,
  dim: string,
  normal: string,
  env = process.env,
  platform = process.platform,
) {
  const logo = supports(env, platform) ? modern.exit : fallback.exit
  return [
    ``,
    `${logo[0]}${dim}${title}${normal}`,
    `${logo[1]}${dim}sonderr -s ${id}${normal}`,
    `${logo[2]}${dim}${normal}`,
    logo[3],
    logo[4],
  ].join("\n")
}
// sonderr_change end