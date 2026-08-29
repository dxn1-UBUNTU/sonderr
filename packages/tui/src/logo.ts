// sonderr_change start - SONDERR wordmark (was the kilocode KILO/GO art)
// The background pulse painter (component/bg-pulse-render.ts) renders `go`
// behind the retry/upsell dialog, cell-by-cell: `_` = background, `^` = top
// half block, `~` = shadow top half block, `█` = solid block, anything else =
// literal character. The SONDERR font from the CLI logo uses exactly those
// conventions plus its legacy shadow glyphs, so reuse it as the single source
// of truth instead of keeping a second (kilocode) copy of the art here.
import { tui } from "@/sonderr/cli/logo"

const rows = tui()
const blank = rows.map(() => "")

export const logo = {
  left: rows,
  right: blank,
}

export const go = {
  left: rows,
  right: blank,
}

export const marks = "_^~,"
// sonderr_change end
