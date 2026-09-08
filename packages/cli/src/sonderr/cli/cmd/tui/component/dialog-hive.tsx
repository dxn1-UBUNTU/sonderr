/** @jsxImportSource @opentui/solid */
import { useDialog } from "@tui/ui/dialog"
import { DialogAlert } from "@tui/ui/dialog-alert"
import { DialogPrompt } from "@tui/ui/dialog-prompt"
import { DialogSelect, type DialogSelectOption } from "@tui/ui/dialog-select"
import { useToast } from "@tui/ui/toast"
import { createMemo, createSignal } from "solid-js"

const MENU_OPTIONS = [
  { title: "Hive status", value: "status", description: "Show hive swarm status and configuration" },
  { title: "Enable hive mode", value: "enable", description: "Enable hive mode" },
  { title: "Disable hive mode", value: "disable", description: "Disable hive mode" },
  { title: "Add API key", value: "add-key", description: "Add an API key to the hive key pool" },
  { title: "List API keys", value: "list-keys", description: "List API keys in the hive key pool" },
  { title: "Swarm agents", value: "swarm-agents", description: "View available swarm agents" },
] as const

const SWARM_AGENTS = [
  { name: "researcher", role: "Research", desc: "Investigate topics and gather evidence" },
  { name: "coder", role: "Implementation", desc: "Write production code and fix bugs" },
  { name: "reviewer", role: "Quality", desc: "Review code for bugs and issues" },
  { name: "tester", role: "Testing", desc: "Write and run tests" },
  { name: "documenter", role: "Docs", desc: "Write documentation and guides" },
  { name: "debugger", role: "Debugging", desc: "Diagnose and fix bugs" },
  { name: "architect", role: "Design", desc: "Design systems and plan implementations" },
] as const

export function DialogHive() {
  const dialog = useDialog()
  const toast = useToast()
  const [enabled, setEnabled] = createSignal(false)
  const [keys, setKeys] = createSignal<string[]>([])

  const options = createMemo<DialogSelectOption<string>[]>(() =>
    MENU_OPTIONS.map((item) => ({
      title: item.title,
      footer: item.value,
      category: "Hive",
      value: item.value,
    })),
  )

  const showMain = () => dialog.replace(() => <DialogHive />)

  const handleAddKey = () => {
    dialog.replace(() => (
      <DialogPrompt
        title="Add Hive API Key"
        placeholder="Enter API key (e.g., sk-...)"
        onConfirm={(value) => {
          const trimmed = value.trim()
          if (!trimmed) return
          setKeys([...keys(), trimmed])
          toast.show({ variant: "success", message: `Added key: ${trimmed.slice(0, 8)}...` })
          showMain()
        }}
        onCancel={showMain}
      />
    ))
  }

  const handleListKeys = () => {
    if (keys().length === 0) {
      dialog.replace(() => (
        <DialogAlert
          title="Hive API Keys"
          message={'No keys in the hive key pool yet.\nUse "Add API key" to add one.'}
          onConfirm={showMain}
        />
      ))
      return
    }
    dialog.replace(() => (
      <DialogSelect
        title="Hive API Keys"
        options={keys().map((key, i) => ({
          title: `Key ${i + 1}: ${key.slice(0, 8)}...`,
          value: key,
          category: "Keys",
        }))}
        flat
        onSelect={() => showMain()}
      />
    ))
  }

  const handleSwarmAgents = () => {
    const lines = [
      "Available swarm agents:",
      "",
      ...SWARM_AGENTS.map((a) => `  ${a.name} (${a.role}): ${a.desc}`),
      "",
      "Use the hive agent to delegate tasks to these swarm agents.",
      "Example: spawn a `researcher` agent to investigate a topic,",
      "or a `coder` agent to implement a feature.",
    ]
    dialog.replace(() => (
      <DialogAlert
        title="Swarm Agents"
        message={lines.join("\n")}
        onConfirm={showMain}
      />
    ))
  }

  const handleStatus = () => {
    const lines = [
      `Hive mode: ${enabled() ? "enabled" : "disabled"}`,
      `Keys in pool: ${keys().length}`,
      "",
      "Available tools:",
      "- hive_send: publish a memo to the hive swarm bus",
      "- hive_recall: read recent memos from the hive bus",
      "",
      "Swarm agents:",
      ...SWARM_AGENTS.map((a) => `  - ${a.name}: ${a.desc}`),
    ]
    dialog.replace(() => (
      <DialogAlert
        title="Hive Status"
        message={lines.join("\n")}
        onConfirm={showMain}
      />
    ))
  }

  const handleSelect = (option: DialogSelectOption<string>) => {
    switch (option.value) {
      case "status":
        handleStatus()
        break
      case "enable":
        setEnabled(true)
        toast.show({ variant: "success", message: "Hive mode enabled" })
        break
      case "disable":
        setEnabled(false)
        toast.show({ variant: "info", message: "Hive mode disabled" })
        break
      case "add-key":
        handleAddKey()
        break
      case "list-keys":
        handleListKeys()
        break
      case "swarm-agents":
        handleSwarmAgents()
        break
    }
  }

  return (
    <DialogSelect
      title={`Hive ${enabled() ? "(enabled)" : "(disabled)"}`}
      options={options()}
      flat
      onSelect={handleSelect}
    />
  )
}
