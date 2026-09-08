/** @jsxImportSource @opentui/solid */
import { useSync } from "../../context/sync"
import { useTheme } from "../../context/theme"
import { useRenderer } from "@opentui/solid"
import { createMemo, createSignal, For, Show, onMount, onCleanup } from "solid-js"
import { usePluginRuntime } from "../../plugin/runtime"
import { InstallationVersion } from "@sonderr/core/installation/version"

const ORANGE = "#ff8800"
const ORANGE_DARK = "#cc5500"
const ORANGE_LIGHT = "#ffaa33"
const ORANGE_BG = "#331100"

const SPINNER_CHARS = ["◐", "◓", "◑", "◒"]
const WAVE_FRAMES = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█", "▇", "▆", "▅", "▄", "▃", "▂"]

const SWARM_AGENTS = [
  { name: "researcher", role: "Research", icon: "🔍" },
  { name: "coder", role: "Implementation", icon: "⚙️" },
  { name: "reviewer", role: "Quality", icon: "🔎" },
  { name: "tester", role: "Testing", icon: "🧪" },
  { name: "documenter", role: "Docs", icon: "📝" },
  { name: "debugger", role: "Debugging", icon: "🐛" },
  { name: "architect", role: "Design", icon: "🏗️" },
] as const

function Spinner() {
  const [tick, setTick] = createSignal(0)
  onMount(() => {
    const timer = setInterval(() => setTick((t) => (t + 1) % SPINNER_CHARS.length), 100)
    onCleanup(() => clearInterval(timer))
  })
  return <text fg={ORANGE_LIGHT}>{SPINNER_CHARS[tick()]}</text>
}

function AnimatedWave() {
  const [tick, setTick] = createSignal(0)
  onMount(() => {
    const timer = setInterval(() => setTick((t) => (t + 1) % WAVE_FRAMES.length), 120)
    onCleanup(() => clearInterval(timer))
  })
  const frame = () => {
    const t = tick()
    const chars: string[] = []
    for (let i = 0; i < 6; i++) chars.push(WAVE_FRAMES[(t + i) % WAVE_FRAMES.length])
    return chars.join("")
  }
  return <text fg={ORANGE}>{frame()}</text>
}

export function HiveSidebar(props: { sessionID: string; overlay?: boolean }) {
  const sync = useSync()
  const { theme } = useTheme()
  const renderer = useRenderer()
  const pluginRuntime = usePluginRuntime()
  const session = createMemo(() => sync.session.get(props.sessionID))

  const sessionStatus = createMemo(() => sync.data.session_status[props.sessionID] as { type: string } | undefined)
  const isWorking = createMemo(() => sessionStatus()?.type === "busy")

  const [tick, setTick] = createSignal(0)
  onMount(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1)
      renderer.requestRender()
    }, 50)
    onCleanup(() => clearInterval(timer))
  })

  const elapsed = createMemo(() => {
    if (!isWorking()) return 0
    return Date.now() - (session()?.time?.updated ?? Date.now())
  })

  const formatElapsed = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  const agentName = createMemo(() => session()?.agent ?? "hive")
  const isSwarmWorker = createMemo(() => agentName() !== "hive" && SWARM_AGENTS.some((a) => a.name === agentName()))

  const todos = createMemo(() => sync.data.todo[props.sessionID] ?? [])
  const pendingTodos = createMemo(() => todos().filter((t: any) => t.status === "pending" || t.status === "in_progress"))
  const completedTodos = createMemo(() => todos().filter((t: any) => t.status === "completed"))

  return (
    <Show when={session()}>
      <box
        backgroundColor={ORANGE_BG}
        width={42}
        height="100%"
        paddingTop={1}
        paddingBottom={1}
        paddingLeft={2}
        paddingRight={2}
        position={props.overlay ? "absolute" : "relative"}
      >
        <scrollbox flexGrow={1} verticalScrollbarOptions={{
          trackOptions: { backgroundColor: ORANGE_DARK, foregroundColor: ORANGE_LIGHT },
        }}>
          <box flexShrink={0} gap={1} paddingRight={1}>
            {/* Header */}
            <box paddingBottom={1} flexDirection="row" gap={1} alignItems="center">
              <text fg={ORANGE_LIGHT}>
                <b>🐝 HIVE</b>
              </text>
              <Show when={isSwarmWorker()}>
                <text fg={ORANGE}>worker</text>
              </Show>
            </box>

            {/* Agent info */}
            <box paddingBottom={1}>
              <text fg={ORANGE_LIGHT}>
                <b>Agent:</b> {agentName()}
              </text>
            </box>

            {/* Working indicator */}
            <Show when={isWorking()}>
              <box gap={1} paddingBottom={1}>
                <box flexDirection="row" gap={1} alignItems="center">
                  <Spinner />
                  <text fg={ORANGE_LIGHT}>
                    <b>SWARM ACTIVE</b>
                  </text>
                </box>
                <AnimatedWave />
                <text fg={ORANGE}>Elapsed: {formatElapsed(elapsed())}</text>
              </box>
            </Show>

            {/* Swarm agents */}
            <box paddingBottom={1} paddingTop={1}>
              <text fg={ORANGE}>
                <b>Swarm Agents</b>
              </text>
              <box paddingLeft={1} paddingTop={1} gap={0}>
                <For each={SWARM_AGENTS}>
                  {(agent) => (
                    <box flexDirection="row" gap={1}>
                      <text fg={agent.name === agentName() ? ORANGE_LIGHT : ORANGE}>
                        {agent.name === agentName() ? "▸" : " "} {agent.icon} {agent.name}
                      </text>
                    </box>
                  )}
                </For>
              </box>
            </box>

            {/* Todos */}
            <box paddingTop={1}>
              <text fg={ORANGE}>
                <b>Todos ({pendingTodos().length + completedTodos().length})</b>
              </text>
              <Show when={pendingTodos().length > 0}>
                <box paddingLeft={1} paddingTop={1} gap={0}>
                  <For each={pendingTodos().slice(0, 10)}>
                    {(todo: any) => (
                      <box flexDirection="row" gap={1}>
                        <text fg={ORANGE_LIGHT}>◻</text>
                        <text fg={ORANGE}>{todo.title?.slice(0, 20) ?? "Untitled"}</text>
                      </box>
                    )}
                  </For>
                </box>
              </Show>
              <Show when={completedTodos().length > 0}>
                <box paddingLeft={1} paddingTop={1} gap={0}>
                  <For each={completedTodos().slice(0, 5)}>
                    {(todo: any) => (
                      <box flexDirection="row" gap={1}>
                        <text fg={ORANGE_DARK}>✓</text>
                        <text fg={ORANGE_DARK}>{todo.title?.slice(0, 20) ?? "Untitled"}</text>
                      </box>
                    )}
                  </For>
                </box>
              </Show>
            </box>

            {/* Session title */}
            <pluginRuntime.Slot
              name="sidebar_title"
              mode="single_winner"
              session_id={props.sessionID}
              title={session()!.title}
              share_url={session()!.share?.url}
            >
              <box paddingTop={1} paddingRight={1}>
                <text fg={ORANGE_LIGHT}>
                  <b>{session()!.title}</b>
                </text>
              </box>
            </pluginRuntime.Slot>

            <pluginRuntime.Slot name="sidebar_content" session_id={props.sessionID} />
          </box>
        </scrollbox>

        <box flexShrink={0} gap={1} paddingTop={1}>
          <pluginRuntime.Slot name="sidebar_footer" mode="single_winner" session_id={props.sessionID}>
            <text fg={ORANGE_DARK}>
              sonderr -- version -- {InstallationVersion}
            </text>
          </pluginRuntime.Slot>
        </box>
      </box>
    </Show>
  )
}
