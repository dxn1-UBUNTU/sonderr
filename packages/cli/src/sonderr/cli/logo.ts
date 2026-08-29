// sonderr_change - new file
const yes = new Set(["1", "true", "yes", "on"])
const no = new Set(["0", "false", "no", "off"])

const modern = {
  tui: [
    `██  ██ ██🬺🬏   ██  ██   ██🬺🬏     ████ ██     ██🬺🬏   `,
    `████🬺🬏 ~~██   ██  ~~ ██~~██   ██~~~~ ██     ~~██   `,
    `██  ██ ██████ 🬁🬬████ 🬁🬬██~~   🬁🬬████ 🬁🬬████ ██████ `,
    `~~  ~~ ~~~~~~   ~~~~   ~~       ~~~~   ~~~~ ~~~~~~ `,
  ],
  plain: [
    `██  ██ ██🬺🬏   ██  ██   ██🬺🬏     ████ ██     ██🬺🬏   `,
    `████🬺🬏   ██   ██     ██  ██   ██     ██       ██   `,
    `██  ██ ██████ 🬁🬬████ 🬁🬬██     🬁🬬████ 🬁🬬████ ██████ `,
  ],
  exit: [
    `  ██  ██ ██🬺🬏   ██  ██   ██🬺🬏  `,
    `  ████🬺🬏   ██   ██     ██  ██  `,
    `  ██  ██ ██████ 🬁🬬████ 🬁🬬██    `,
  ],
}

const fallback = {
  tui: [
    `██  ██ ████   ██  ██   ██       ████ ██     ████   `,
    `████   ~~██   ██  ~~ ██~~██   ██~~~~ ██     ~~██   `,
    `██  ██ ██████ ██████   ██~~     ████   ████ ██████ `,
    `~~  ~~ ~~~~~~  ~~~~~   ~~       ~~~~   ~~~~ ~~~~~~ `,
  ],
  plain: [
    `██  ██ ████   ██  ██   ███      ████ ██     ████   `,
    `████     ██   ██     ██  ██   ██     ██       ██   `,
    `██  ██ ██████ ██████   ██       ████ ██████ ██████ `,
  ],
  exit: [
    `  ██  ██ ████   ██  ██   ██    `,
    `  ████     ██   ██     ██  ██  `,
    `  ██  ██ ██████ ██████   ██    `,
  ],
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

// sonderr_change start - the modern logo draws with Unicode 13 sextant/octant
// glyphs (U+1FB00 block: 🬺 🬏 🬁 🬬). Those render only in terminals that ship
// coverage for "Symbols for Legacy Computing"; in macOS Terminal.app,
// Alacritty, older VTE/gnome-terminal, and unknown SSH clients they render as
// tofu boxes. Detect capability with an allowlist of terminals confirmed to
// ship the block; everything else gets the fallback art, which uses only
// block elements (██) and literal tildes and looks right everywhere.
// SONDERR_UNICODE_LOGO=1 still forces the modern art for power users.
function octantCapable(env: NodeJS.ProcessEnv) {
  if (env.WT_SESSION) return true // Windows Terminal (Cascadia Mono 2111.01+)
  if (env.TERM_PROGRAM === "WezTerm" || env.WEZTERM_PANE) return true
  if (env.TERM_PROGRAM === "ghostty") return true
  if (env.TERM_PROGRAM === "iTerm.app") return true // iTerm2 3.5+
  if (env.KITTY_WINDOW_ID || env.TERM === "xterm-kitty") return true
  if (env.TERM_PROGRAM === "vscode") return true // xterm.js draws sextants itself
  return false
}

export function supports(env = process.env, platform = process.platform) {
  const override = flag(env.SONDERR_UNICODE_LOGO)
  if (override !== undefined) return override
  if (env.TERM === "dumb") return false
  // Old Windows Console Host cannot render the block glyphs used by the modern logo.
  if (platform === "win32") return windows(env)
  if (env.ConEmuPID) return false
  if (env.ANSICON) return false
  // sonderr_change - default to the fallback art unless the terminal is known
  // to cover the sextant block (was: return true).
  return octantCapable(env)
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
  return [``, `${logo[0]}${dim}${title}${normal}`, `${logo[1]}${dim}sonderr -s ${id}${normal}`, logo[2]].join("\n")
}
