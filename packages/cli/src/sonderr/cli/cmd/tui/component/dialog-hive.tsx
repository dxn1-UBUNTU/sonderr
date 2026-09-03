/** @jsxImportSource @opentui/solid */
import { useDialog } from "@tui/ui/dialog"
import { DialogAlert } from "@tui/ui/dialog-alert"
import { DialogPrompt } from "@tui/ui/dialog-prompt"
import { DialogSelect, type DialogSelectOption } from "@tui/ui/dialog-select"
import { useProject } from "@tui/context/project"
import { useSDK } from "@tui/context/sdk"
import { useTheme } from "@tui/context/theme"
import { useToast } from "@tui/ui/toast"
import { createSignal } from "solid-js"

const MENU_OPTIONS = [
  { title: "Hive status", value: "status", description: "Show hive swarm status and configuration" },
  { title: "Enable hive mode", value: "enable", description: "Enable hive mode" },
  { title: "Disable hive mode", value: "disable", description: "Disable hive mode" },
  { title: "Add API key", value: "add-key", description: "Add an API key to the hive key pool" },
  { title: "List API keys", value: "list-keys", description: "List API keys in the hive key pool" },
] as const

export function DialogHive() {
  const sdk = useSDK()
  const project = useProject()
  const dialog = useDialog()
  const { theme } = useTheme()
  const toast = useToast()
  const [enabled, setEnabled] = createSignal(false)
  const [keys, setKeys] = createSignal<string[]>([])

  const options: DialogSelectOption<string>[] = MENU_OPTIONS.map((item) => ({
    title: item.title,
    footer: item.value,
    category: "Hive",
    value: item.value,
  }))

  const handleAddKey = async () => {
    dialog.replace(() => (
      <DialogPrompt
        title="Add Hive API Key"
        placeholder="Enter API key (e.g., sk-...)"
        onConfirm={async (value) => {
          dialog.clear()
          if (!value.trim()) return
          setKeys([...keys(), value.trim()])
          toast.show({ variant: "success", message: `Added key: ${value.trim().slice(0, 8)}...` })
        }}
        onCancel={() => {
          dialog.clear()
          dialog.replace(() => <DialogHive />)
        }}
      />
    ))
  }

  const handleListKeys = () => {
    if (keys().length === 0) {
      dialog.replace(() => (
        <DialogAlert
          title="Hive API Keys"
          message={'No keys in the hive key pool yet.\nUse "Add API key" to add one.'}
          onConfirm={() => {
            dialog.clear()
            dialog.replace(() => <DialogHive />)
          }}
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
        onSelect={async () => {
          dialog.clear()
          dialog.replace(() => <DialogHive />)
        }}
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
    ]
    dialog.replace(() => (
      <DialogAlert
        title="Hive Status"
        message={lines.join("\n")}
        onConfirm={() => {
          dialog.clear()
          dialog.replace(() => <DialogHive />)
        }}
      />
    ))
  }

  const handleSelect = async (option: DialogSelectOption<string>) => {
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
    }
  }

  return (
    <DialogSelect
      title={`Hive ${enabled() ? "(enabled)" : "(disabled)"}`}
      options={options}
      flat
      footer={
        <text fg={theme.textMuted}>
          Status:{" "}
          {enabled() ? <text fg={theme.success}>enabled</text> : <text fg={theme.error}>disabled</text>}
        </text>
      }
      onSelect={handleSelect}
    />
  )
}
