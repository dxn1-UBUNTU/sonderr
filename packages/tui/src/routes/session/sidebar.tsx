/** @jsxImportSource @opentui/solid */
import { useProject } from "../../context/project"
import { useSync } from "../../context/sync"
import { createEffect, createMemo, createSignal, For, onCleanup, onMount, Show } from "solid-js"
import { useTheme } from "../../context/theme"
import { useTuiConfig } from "../../config"
import { InstallationChannel, InstallationVersion } from "@sonderr/core/installation/version"
import { usePluginRuntime } from "../../plugin/runtime"
import { useRenderer } from "@opentui/solid"

import { usePromptSubmit } from "../../context/prompt-submit"
import { getScrollAcceleration } from "../../util/scroll"
import { WorkspaceLabel } from "../../component/workspace-label"

type SessionStatus = { type: "idle" } | { type: "busy" } | { type: "retry" } | { type: "offline" }

type ToolPart = {
  type: string
  tool: string
  state: { status: string; title?: string; output?: unknown }
}

const SPINNER_CHARS = ["◐", "◓", "◑", "◒"]

function Spinner() {
  const [tick, setTick] = createSignal(0)

  onMount(() => {
    const timer = setInterval(() => {
      setTick((t) => (t + 1) % SPINNER_CHARS.length)
    }, 100)
    onCleanup(() => clearInterval(timer))
  })

  return <text fg="#00ff88">{SPINNER_CHARS[tick()]}</text>
}

const WAVE_FRAMES = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█", "▇", "▆", "▅", "▄", "▃", "▂"]

function AnimatedWave() {
  const [tick, setTick] = createSignal(0)

  onMount(() => {
    const timer = setInterval(() => {
      setTick((t) => (t + 1) % WAVE_FRAMES.length)
    }, 120)
    onCleanup(() => clearInterval(timer))
  })

  const frame = () => {
    const t = tick()
    const chars: string[] = []
    for (let i = 0; i < 6; i++) {
      chars.push(WAVE_FRAMES[(t + i) % WAVE_FRAMES.length])
    }
    return chars.join("")
  }

  return <text fg="#00ddff">{frame()}</text>
}

const PULSE_FRAMES = ["○", "◔", "◑", "◕", "●", "◕", "◑", "◔"]

function AnimatedPulse() {
  const [tick, setTick] = createSignal(0)

  onMount(() => {
    const timer = setInterval(() => {
      setTick((t) => (t + 1) % PULSE_FRAMES.length)
    }, 150)
    onCleanup(() => clearInterval(timer))
  })

  return <text fg="#ff00ff">{PULSE_FRAMES[tick()]}</text>
}

const DOT_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]

function AnimatedDots() {
  const [tick, setTick] = createSignal(0)

  onMount(() => {
    const timer = setInterval(() => {
      setTick((t) => (t + 1) % DOT_FRAMES.length)
    }, 80)
    onCleanup(() => clearInterval(timer))
  })

  return <text fg="#ffaa00">{DOT_FRAMES[tick()]}</text>
}

function ProgressBar(props: { width: number; color: string }) {
  const [offset, setOffset] = createSignal(0)

  onMount(() => {
    const timer = setInterval(() => {
      setOffset((o) => (o + 1) % props.width)
    }, 100)
    onCleanup(() => clearInterval(timer))
  })

  const block = "█"
  const space = "░"

  return (
    <text fg={props.color}>
      {Array.from({ length: props.width }, (_, i) => {
        const dist = Math.abs(i - offset())
        return dist < 3 ? block : space
      }).join("")}
    </text>
  )
}

export function Sidebar(props: { sessionID: string; overlay?: boolean }) {
  const pluginRuntime = usePluginRuntime()
  const project = useProject()
  const sync = useSync()
  const { theme } = useTheme()
  const tuiConfig = useTuiConfig()
  const renderer = useRenderer()
  const promptSubmit = usePromptSubmit()
  const session = createMemo(() => sync.session.get(props.sessionID))
  const workspace = () => {
    const workspaceID = session()?.workspaceID
    if (!workspaceID) return
    return project.workspace.get(workspaceID)
  }
  const scrollAcceleration = createMemo(() => getScrollAcceleration(tuiConfig))

  const sessionStatus = createMemo(
    () => sync.data.session_status[props.sessionID] as SessionStatus | undefined,
  )
  const isWorking = createMemo(() => sessionStatus()?.type === "busy")

  // Track prompt submission for immediate UI response
  const isPromptPending = createMemo(() => {
    const submitted = promptSubmit.state()
    if (!submitted.submittedAt || submitted.sessionID !== props.sessionID) return false
    // Consider pending if submitted within last 30 seconds AND session is not idle
    const elapsed = Date.now() - submitted.submittedAt
    if (elapsed > 30000) return false
    // If session is definitely idle, don't show pending
    if (sessionStatus()?.type === "idle") return false
    return true
  })

  // Clear prompt pending state when session becomes idle
  createEffect(() => {
    if (sessionStatus()?.type === "idle" && promptSubmit.state().sessionID === props.sessionID) {
      promptSubmit.clear()
    }
  })

  // Combined working state - shows immediately on prompt send
  const showWorking = createMemo(() => isWorking() || isPromptPending())

  // Get the effective work start time (from prompt submission or now)
  const workStartTime = createMemo(() => {
    const submitted = promptSubmit.state()
    if (submitted.sessionID === props.sessionID && submitted.submittedAt) {
      return submitted.submittedAt
    }
    return Date.now()
  })

  // Get current running tool
  const currentTool = createMemo(() => {
    if (!showWorking()) return null
    const msgs = sync.data.message[props.sessionID] ?? []
    for (let i = msgs.length - 1; i >= 0; i--) {
      const parts = sync.data.part[msgs[i].id] ?? []
      for (const part of parts as ToolPart[]) {
        if (part.type === "tool" && part.state.status === "running") {
          return part.state.title ?? part.tool
        }
      }
    }
    return null
  })

  // Count active tools
  const activeToolCount = createMemo(() => {
    if (!showWorking()) return 0
    let count = 0
    const msgs = sync.data.message[props.sessionID] ?? []
    for (const msg of msgs) {
      const parts = sync.data.part[msg.id] ?? []
      for (const part of parts as ToolPart[]) {
        if (part.type === "tool" && part.state.status === "running") {
          count++
        }
      }
    }
    return count
  })

  // Force re-render for animations
  const [tick, setTick] = createSignal(0)
  onMount(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1)
      renderer.requestRender()
    }, 50)
    onCleanup(() => clearInterval(timer))
  })

  // Elapsed time tracking - starts from prompt submission
  const elapsed = createMemo(() => {
    tick()
    if (!showWorking()) return 0
    return Date.now() - workStartTime()
  })

  const formatElapsed = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  return (
    <Show when={session()}>
      <box
        backgroundColor={theme.backgroundPanel}
        width={42}
        height="100%"
        paddingTop={1}
        paddingBottom={1}
        paddingLeft={2}
        paddingRight={2}
        position={props.overlay ? "absolute" : "relative"}
      >
        <scrollbox
          flexGrow={1}
          scrollAcceleration={scrollAcceleration()}
          verticalScrollbarOptions={{
            trackOptions: {
              backgroundColor: theme.background,
              foregroundColor: theme.borderActive,
            },
          }}
        >
          <box flexShrink={0} gap={1} paddingRight={1}>
            {/* Dynamic AI Working Indicator */}
            <Show when={showWorking()}>
              <box gap={1} paddingBottom={1}>
                {/* Header */}
                <box flexDirection="row" gap={1} alignItems="center">
                  <Spinner />
                  <text fg="#00ff88">
                    <b>AI WORKING</b>
                  </text>
                  <AnimatedDots />
                </box>

                {/* Wave animation */}
                <AnimatedWave />

                {/* Elapsed time */}
                <box flexDirection="row" gap={1} alignItems="center">
                  <AnimatedPulse />
                  <text fg={theme.textMuted}>Elapsed:</text>
                  <text fg="#ffaa00">
                    <b>{formatElapsed(elapsed())}</b>
                  </text>
                </box>

                {/* Progress bar */}
                <ProgressBar width={36} color="#00ff88" />

                {/* Current tool */}
                <Show when={currentTool()}>
                  <box
                    backgroundColor={theme.background}
                    paddingLeft={1}
                    paddingRight={1}
                    paddingTop={1}
                    paddingBottom={1}
                  >
                    <box flexDirection="row" gap={1} alignItems="center">
                      <text fg="#00ddff">{"▶"}</text>
                      <text fg={theme.text}>
                        <b>Current:</b> {currentTool()}
                      </text>
                    </box>
                    <Show when={activeToolCount() > 1}>
                      <text fg={theme.textMuted}>
                        +{activeToolCount() - 1} more running
                      </text>
                    </Show>
                    </box>
                  </Show>

                {/* Idle fallback */}
                <Show when={!currentTool()}>
                  <box
                    backgroundColor={theme.background}
                    paddingLeft={1}
                    paddingRight={1}
                    paddingTop={1}
                    paddingBottom={1}
                  >
                    <text fg={theme.textMuted}>Processing request...</text>
                  </box>
                </Show>

                {/* Footer animation */}
                <box flexDirection="row" gap={1} alignItems="center">
                  <text fg="#ff00ff">{"◆"}</text>
                  <text fg={theme.textMuted}>
                    <span style={{ fg: theme.text }}>Live</span> · {activeToolCount()} active
                  </text>
                </box>
              </box>
            </Show>

            <pluginRuntime.Slot
              name="sidebar_title"
              mode="single_winner"
              session_id={props.sessionID}
              title={session()!.title}
              share_url={session()!.share?.url}
            >
              <box paddingRight={1}>
                <text fg={theme.text}>
                  <b>{session()!.title}</b>
                </text>
                <Show when={InstallationChannel !== "latest"}>
                  <text fg={theme.textMuted}>{props.sessionID}</text>
                </Show>
                <Show when={session()!.workspaceID}>
                  <text fg={theme.textMuted}>
                    <Show
                      when={workspace()}
                      fallback={<WorkspaceLabel type="unknown" name={session()!.workspaceID!} status="error" icon />}
                    >
                      {(item) => (
                        <WorkspaceLabel
                          type={item().type}
                          name={item().name}
                          status={project.workspace.status(item().id) ?? "error"}
                          icon
                        />
                      )}
                    </Show>
                  </text>
                </Show>
                <Show when={session()!.share?.url}>
                  <text fg={theme.textMuted}>{session()!.share!.url}</text>
                </Show>
              </box>
            </pluginRuntime.Slot>
            <pluginRuntime.Slot name="sidebar_content" session_id={props.sessionID} />
          </box>
        </scrollbox>

        <box flexShrink={0} gap={1} paddingTop={1}>
          <pluginRuntime.Slot name="sidebar_footer" mode="single_winner" session_id={props.sessionID}>
            {/* sonderr_change start */}
            <text fg={theme.textMuted}>
              <span style={{ fg: isWorking() ? "#00ff88" : theme.success }}>•</span>{" "}
              <b>Sonderr</b> <span>{InstallationVersion}</span>
            </text>
            {/* sonderr_change end */}
          </pluginRuntime.Slot>
        </box>
      </box>
    </Show>
  )
}
