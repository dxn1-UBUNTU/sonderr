/** @jsxImportSource @opentui/solid */
// sonderr_change - new file

/**
 * SonderrClaw status sidebar
 *
 * Dynamic sidebar that switches between:
 * - Idle: shows context window, tokens, model info
 * - Working: shows AI thinking output (last 30 lines, auto-scrolling)
 */

import { createMemo, createSignal, For, onCleanup, onMount, Show } from "solid-js"
import { useTheme } from "@tui/context/theme"
import { Spinner } from "@tui/component/spinner"
import type { ChatMessage, ClawStatus, ConversationListItem, ConversationStatusRecord, TypingMember } from "./types"

function dot(status: string | null | undefined, theme: any): string {
  if (!status) return theme.textMuted
  if (status === "running") return theme.success
  if (status === "starting" || status === "restarting") return theme.warning
  if (status === "destroying") return theme.error
  return theme.textMuted
}

function uptime(started: string | null | undefined): string {
  if (!started) return "—"
  const ms = Date.now() - new Date(started).getTime()
  if (ms < 0) return "—"
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}d ${hours % 24}h`
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m`
  return `${seconds}s`
}

function formatTokens(n: number): string {
  if (n < 1000) return String(n)
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`
  return `${(n / 1_000_000).toFixed(1)}M`
}

const MAX_THINKING_LINES = 30

const BANNER_FRAMES = [
  "╔══════════════════════════════╗\n║          S O N D E R R       ║\n╚══════════════════════════════╝",
  "╔══════════════════════════════╗\n║          ◆ S O N D E R R     ║\n╚══════════════════════════════╝",
  "╔══════════════════════════════╗\n║        ◆ S O N D E R R ◆     ║\n╚══════════════════════════════╝",
  "╔══════════════════════════════╗\n║          S O N D E R R ◆     ║\n╚══════════════════════════════╝",
]

const BANNER_COLORS = ["#00ff88", "#00ddff", "#ff00ff", "#ffaa00", "#00ff88"]

function AnimatedBanner() {
  const { theme } = useTheme()
  const [frame, setFrame] = createSignal(0)

  onMount(() => {
    const timer = setInterval(() => {
      setFrame((f) => (f + 1) % BANNER_FRAMES.length)
    }, 800)
    onCleanup(() => clearInterval(timer))
  })

  return (
    <box
      flexShrink={0}
      paddingBottom={1}
      alignItems="center"
    >
      <text fg={BANNER_COLORS[frame() % BANNER_COLORS.length]}>
        <b>{BANNER_FRAMES[frame()]}</b>
      </text>
    </box>
  )
}

export function ClawSidebar(props: {
  status: ClawStatus | null
  loading: boolean
  error: string | null
  online: boolean
  connected: boolean
  chatLoading: boolean
  chatError: string | null
  conversations: ConversationListItem[]
  activeConversationId: string | null
  conversationStatus: ConversationStatusRecord | null
  typingMembers: TypingMember[]
  messages: ChatMessage[]
}) {
  const { theme } = useTheme()

  const conversationTitle = () => {
    const id = props.activeConversationId
    if (!id) return "New conversation"
    const conv = props.conversations.find((c) => c.conversationId === id)
    return conv?.title ?? "Untitled"
  }

  // Determine if the bot is currently thinking/working
  const isThinking = () => {
    return props.typingMembers.length > 0 || props.chatLoading
  }

  // Get the latest bot message content
  const latestBotMessage = createMemo(() => {
    const msgs = props.messages
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].bot) return msgs[i]
    }
    return null
  })

  // Get the last N lines of the thinking output
  const thinkingLines = createMemo(() => {
    const msg = latestBotMessage()
    if (!msg || !msg.text) return []
    const lines = msg.text.split("\n")
    return lines.slice(-MAX_THINKING_LINES)
  })

  return (
    <box
      backgroundColor={theme.backgroundPanel}
      width={42}
      height="100%"
      paddingTop={1}
      paddingBottom={1}
      paddingLeft={2}
      paddingRight={2}
    >
      <AnimatedBanner />
      <scrollbox flexGrow={1}>
        <box flexShrink={0} gap={1} paddingRight={1}>
          {/* Conversation title */}
          <Show when={props.connected}>
            <box paddingRight={1}>
              <text fg={theme.text} wrapMode="word">
                <b>{conversationTitle()}</b>
              </text>
            </box>
          </Show>

          {/* Dynamic content: thinking vs idle */}
          <Show
            when={isThinking()}
            fallback={
              /* Idle state: show stats */
              <box gap={1}>
                {/* Bot status */}
                <Show when={props.connected || props.chatLoading || props.chatError}>
                  <box>
                    <text fg={theme.text}>
                      <b>Status</b>
                    </text>
                    <Show when={props.chatError}>
                      <text fg={theme.error}>{props.chatError}</text>
                    </Show>
                    <Show when={!props.chatError && props.chatLoading}>
                      <text fg={theme.textMuted}>Connecting...</text>
                    </Show>
                    <Show when={!props.chatError && !props.chatLoading && props.connected}>
                      <box flexDirection="row" gap={1}>
                        <text flexShrink={0} style={{ fg: props.online ? theme.success : theme.textMuted }}>
                          •
                        </text>
                        <text fg={theme.text}>{props.online ? "Online" : "Offline"}</text>
                      </box>
                    </Show>
                    <Show when={!props.chatError && !props.chatLoading && !props.connected}>
                      <text fg={theme.textMuted}>Unavailable</text>
                    </Show>
                  </box>
                </Show>

                {/* Context window usage */}
                <Show when={props.connected && props.conversationStatus}>
                  {(s) => (
                    <box>
                      <text fg={theme.text}>
                        <b>Context</b>
                      </text>
                      <Show when={s().contextWindow > 0}>
                        <box flexDirection="row" justifyContent="space-between">
                          <text fg={theme.textMuted}>Used</text>
                          <text fg={theme.text}>
                            {Math.min(100, Math.round((s().contextTokens / s().contextWindow) * 100))}%
                          </text>
                        </box>
                      </Show>
                      <box flexDirection="row" justifyContent="space-between">
                        <text fg={theme.textMuted}>Tokens</text>
                        <text fg={theme.text}>
                          {formatTokens(s().contextTokens)} / {formatTokens(s().contextWindow)}
                        </text>
                      </box>
                      <Show when={s().model}>
                        <box flexDirection="row" justifyContent="space-between">
                          <text fg={theme.textMuted}>Model</text>
                          <text fg={theme.text} wrapMode="none">
                            {s().model}
                          </text>
                        </box>
                      </Show>
                      <Show when={s().provider}>
                        <box flexDirection="row" justifyContent="space-between">
                          <text fg={theme.textMuted}>Provider</text>
                          <text fg={theme.text} wrapMode="none">
                            {s().provider}
                          </text>
                        </box>
                      </Show>
                    </box>
                  )}
                </Show>

                {/* Instance details */}
                <Show when={!props.loading && !props.error && props.status}>
                  <box>
                    <text fg={theme.text}>
                      <b>Instance</b>
                    </text>
                    <box flexDirection="row" gap={1}>
                      <text flexShrink={0} style={{ fg: dot(props.status!.status, theme) }}>
                        •
                      </text>
                      <text fg={theme.text}>
                        {(props.status!.status ?? "unknown").replace(/^./, (c) => c.toUpperCase())}{" "}
                        <span style={{ fg: theme.textMuted }}>
                          {props.status!.status === "running" ? uptime(props.status!.lastStartedAt) : ""}
                        </span>
                      </text>
                    </box>
                  </box>
                  <box>
                    <text fg={theme.text}>
                      <b>Details</b>
                    </text>
                    <box flexDirection="row" justifyContent="space-between">
                      <text fg={theme.textMuted}>Region</text>
                      <text fg={theme.text}>{props.status!.flyRegion?.toUpperCase() ?? "—"}</text>
                    </box>
                    <box flexDirection="row" justifyContent="space-between">
                      <text fg={theme.textMuted}>Version</text>
                      <text fg={theme.text}>{props.status!.openclawVersion ?? "—"}</text>
                    </box>
                  </box>
                </Show>
              </box>
            }
          >
            {/* Thinking state: show AI output */}
            <box gap={1}>
              <box flexDirection="row" gap={1} alignItems="center">
                <Spinner color={theme.success} />
                <text fg={theme.text}>
                  <b>Thinking...</b>
                </text>
              </box>
              <box
                backgroundColor={theme.backgroundElement}
                paddingLeft={1}
                paddingRight={1}
                paddingTop={1}
                paddingBottom={1}
              >
                <For each={thinkingLines()}>
                  {(line, i) => (
                    <text fg={theme.textMuted} wrapMode="word">
                      {line || " "}
                    </text>
                  )}
                </For>
              </box>
              <text fg={theme.textMuted}>
                <span style={{ fg: theme.text }}>Last {MAX_THINKING_LINES} lines</span>
              </text>
            </box>
          </Show>

          <Show when={props.loading}>
            <text fg={theme.textMuted}>Loading...</text>
          </Show>

          <Show when={props.error}>
            <text fg={theme.error}>{props.error}</text>
          </Show>

          <Show when={!props.loading && !props.error && !props.status}>
            <box>
              <text fg={theme.textMuted}>No instance found.</text>
              <text fg={theme.textMuted}>Visit kilo.ai/claw</text>
              <text fg={theme.textMuted}>to set one up.</text>
            </box>
          </Show>
        </box>
      </scrollbox>

      <box flexShrink={0} paddingTop={1}>
        <text fg={theme.textMuted}>
          <span style={{ fg: theme.text }}>Esc</span> back
        </text>
      </box>
    </box>
  )
}
