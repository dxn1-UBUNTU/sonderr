/** @jsxImportSource @opentui/solid */
import { createMemo, Match, Switch, type JSX } from "solid-js"
import { SplitBorder } from "@tui/ui/border"
import { useTheme } from "@tui/context/theme"
import { parseSonderrErrorCode, sonderrErrorTitle, sonderrErrorDescription } from "@/sonderr/sonderr-errors"
import type { AssistantMessage } from "@sonderr/sdk/v2"

interface SonderrErrorBlockProps {
  error: NonNullable<AssistantMessage["error"]>
  fallback: JSX.Element
}

export function SonderrErrorBlock(props: SonderrErrorBlockProps) {
  const { theme } = useTheme()

  const sonderrErrorCode = createMemo(() => {
    return parseSonderrErrorCode(props.error)
  })

  const title = createMemo(() => {
    const code = sonderrErrorCode()
    return code ? sonderrErrorTitle(code) : undefined
  })

  const description = createMemo(() => {
    const code = sonderrErrorCode()
    return code ? sonderrErrorDescription(code) : undefined
  })

  return (
    <Switch fallback={props.fallback}>
      <Match when={sonderrErrorCode()}>
        <box
          border={["left"]}
          paddingTop={1}
          paddingBottom={1}
          paddingLeft={2}
          marginTop={1}
          backgroundColor={theme.backgroundPanel}
          customBorderChars={SplitBorder.customBorderChars}
          borderColor={theme.primary}
        >
          <text fg={theme.text}>{title()}</text>
          <text fg={theme.textMuted}>{description()}</text>
          <text fg={theme.primary}>{"Run /connect or `sonderr auth login` to connect to Sonderr Gateway"}</text>
        </box>
      </Match>
    </Switch>
  )
}
