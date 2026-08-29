// sonderr_change - new file
import { useTheme } from "../context/theme"
import { RGBA } from "@opentui/core"
import { tui } from "@/sonderr/cli/logo"

const SHADOW_MARKER = /[_^~]/ // ~ = shadow top only (▀ with fg=shadow)

export function SonderrLogo() {
  const { theme } = useTheme()
  const orange = RGBA.fromHex("#FF6B35")
  const logo = tui()

  const renderLine = (line: string): JSX.Element[] => {
    const shadow = tint(theme.background, orange, 0.25)
    const elements: JSX.Element[] = []
    let i = 0

    while (i < line.length) {
      const rest = line.slice(i)
      const markerIndex = rest.search(SHADOW_MARKER)

      if (markerIndex === -1) {
        elements.push(
          <text fg={orange} selectable={false}>
            {rest}
          </text>,
        )
        break
      }

      if (markerIndex > 0) {
        elements.push(
          <text fg={orange} selectable={false}>
            {rest.slice(0, markerIndex)}
          </text>,
        )
        i += markerIndex
      }

      const marker = rest[markerIndex]
      if (marker === "_") {
        elements.push(
          <text fg={orange} selectable={false} bg={shadow}>
            {" "}
          </text>,
        )
        i += 1
        continue
      }

      if (marker === "^" || marker === "~") {
        const fg = marker === "~" ? shadow : orange
        elements.push(
          <text fg={fg} selectable={false} bg={shadow}>
            {"▀"}
          </text>,
        )
        i += 1
        continue
      }

      elements.push(
        <text fg={orange} selectable={false}>
          {marker}
        </text>,
      )
      i += 1
    }

    return elements
  }

  return (
    <box flexDirection="column" gap={-1}>
      {logo.map((line) => (
        <box flexDirection="row" gap={-1}>
          {renderLine(line)}
        </box>
      ))}
    </box>
  )
}

function tint(bg: string, fg: RGBA, strength: number): RGBA {
  const bgRGBA = RGBA.fromHex(bg)
  return RGBA.from(
    Math.round(bgRGBA.r * (1 - strength) + fg.r * strength),
    Math.round(bgRGBA.g * (1 - strength) + fg.g * strength),
    Math.round(bgRGBA.b * (1 - strength) + fg.b * strength),
    Math.round(bgRGBA.a * (1 - strength) + fg.a * strength),
  )
}
