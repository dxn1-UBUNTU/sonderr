/** @jsxImportSource @opentui/solid */
// sonderr_change - new file

/**
 * SonderrClaw status sidebar
 *
 * Dynamic sidebar that switches between:
 * - Idle: shows context window, tokens, model info
 * - Working: shows live AI output with animated progress, elapsed time, streaming text
 */

import { createEffect, createMemo, createSignal, For, onCleanup, onMount, Show } from "solid-js"
import { useTheme } from "@tui/context/theme"
import { useRenderer } from "@opentui/solid"
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

function formatElapsed(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

const MAX_THINKING_LINES = 20

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

const PROGRESS_CHARS = ["/", "-", "\\", "|", "/", "-", "\\", "|"]

function AnimatedProgress() {
  const [tick, setTick] = createSignal(0)

  onMount(() => {
    const timer = setInterval(() => {
      setTick((t) => (t + 1) % PROGRESS_CHARS.length)
    }, 80)
    onCleanup(() => clearInterval(timer))
  })

  return (
    <text fg="#00ff88">
      {PROGRESS_CHARS[tick()]}
    </text>
  )
}

const PULSE_CHARS = [".", "o", "O", "O", "o", "."]

function AnimatedPulse() {
  const [tick, setTick] = createSignal(0)

  onMount(() => {
    const timer = setInterval(() => {
      setTick((t) => (t + 1) % PULSE_CHARS.length)
    }, 150)
    onCleanup(() => clearInterval(timer))
  })

  return (
    <text fg="#00ddff">
      {PULSE_CHARS[tick()]}
    </text>
  )
}

const TYPING_DOTS = [".", "..", "...", "..", "."]

function TypingAnimation() {
  const [tick, setTick] = createSignal(0)

  onMount(() => {
    const timer = setInterval(() => {
      setTick((t) => (t + 1) % TYPING_DOTS.length)
    }, 200)
    onCleanup(() => clearInterval(timer))
  })

  return (
    <text fg="#ff00ff">
      {TYPING_DOTS[tick()]}
    </text>
  )
}

function ProgressBar(props: { width: number; progress: number; color: string }) {
  const filled = () => Math.round(props.width * props.progress)
  const empty = () => props.width - filled()
  const filledChar = "="
  const emptyChar = "-"

  return (
    <box flexDirection="row">
      <text fg={props.color}>{filledChar.repeat(filled())}</text>
      <text fg="#333333">{emptyChar.repeat(empty())}</text>
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
  waitingForResponse: () => boolean
}) {
  const { theme } = useTheme()
  const renderer = useRenderer()
  const [tick, setTick] = createSignal(0)

  // Heartbeat ticker - forces continuous re-renders for animations
  onMount(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1)
      renderer.requestRender()
    }, 100)
    onCleanup(() => clearInterval(timer))
  })

  const conversationTitle = () => {
    const id = props.activeConversationId
    if (!id) return "New conversation"
    const conv = props.conversations.find((c) => c.conversationId === id)
    return conv?.title ?? "Untitled"
  }

  // Determine if the bot is currently thinking/working
  const isThinking = () => {
    return props.waitingForResponse() || props.typingMembers.length > 0 || props.chatLoading
  }

  // Track elapsed time - updates with ticker
  const [thinkingStart, setThinkingStart] = createSignal(Date.now())

  const elapsed = createMemo(() => {
    tick() // subscribe to ticker for updates
    if (!isThinking()) return 0
    return Date.now() - thinkingStart()
  })

  createEffect(() => {
    if (isThinking()) {
      setThinkingStart(Date.now())
    }
  })

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

  // Calculate progress based on response state
  const progress = createMemo(() => {
    if (props.waitingForResponse() && !props.typingMembers.length) return 0.15
    if (props.typingMembers.length > 0) return 0.6
    const text = latestBotMessage()?.text ?? ""
    if (text.length > 0) return Math.min(0.95, 0.6 + text.length / 1000)
    return 0
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

          {/* Debug: show raw state */}
          <box paddingBottom={1}>
            <text fg={theme.textMuted}>
              <b>Debug:</b> waiting={props.waitingForResponse() ? "true" : "false"} | typing={props.typingMembers.length} | loading={props.chatLoading ? "true" : "false"}
            </text>
          </box>

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
            {/* Thinking state: LIVE dynamic UI */}
            <box gap={1}>
              {/* Header with animated indicators */}
              <box flexDirection="row" gap={1} alignItems="center">
                <AnimatedProgress />
                <text fg="#00ff88">
                  <b>
                    {props.waitingForResponse() && !props.typingMembers.length
                      ? "WAITING"
                      : props.typingMembers.length > 0
                        ? "TYPING"
                        : "STREAMING"}
                  </b>
                </text>
                <TypingAnimation />
              </box>

              {/* Elapsed time + pulse */}
              <box flexDirection="row" gap={1} alignItems="center">
                <AnimatedPulse />
                <text fg={theme.textMuted}>Elapsed:</text>
                <text fg="#ffaa00">
                  <b>{formatElapsed(elapsed())}</b>
                </text>
              </box>

              {/* Animated progress bar */}
              <box gap={0}>
                <ProgressBar
                  width={36}
                  progress={progress()}
                  color={props.waitingForResponse() && !props.typingMembers.length ? "#ffaa00" : "#00ff88"}
                />
                <box flexDirection="row" justifyContent="space-between">
                  <text fg={theme.textMuted}>
                    {props.waitingForResponse() && !props.typingMembers.length ? "Processing request..." : "Generating response..."}
                  </text>
                  <text fg={theme.text}>{Math.round(progress() * 100)}%</text>
                </box>
              </box>

              {/* Live output preview */}
              <box
                backgroundColor={theme.backgroundElement}
                paddingLeft={1}
                paddingRight={1}
                paddingTop={1}
                paddingBottom={1}
              >
                <Show
                  when={thinkingLines().length > 0}
                  fallback={
                    <box flexDirection="row" gap={1} alignItems="center">
                      <Spinner color={theme.textMuted} />
                      <text fg={theme.textMuted}>Awaiting response...</text>
                    </box>
                  }
                >
                  <For each={thinkingLines()}>
                    {(line, i) => (
                      <text fg={theme.textMuted} wrapMode="word">
                        {line || " "}
                      </text>
                    )}
                  </For>
                </Show>
              </box>

              {/* Streaming indicator */}
              <box flexDirection="row" gap={1}>
                <text fg="#00ddff">{">"}</text>
                <text fg={theme.textMuted}>
                  <span style={{ fg: theme.text }}>Live output</span> · {thinkingLines().length} lines
                </text>
              </box>
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
