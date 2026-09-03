/** @jsxImportSource @opentui/solid */
import { useDialog } from "@tui/ui/dialog"
import { DialogSelect, type DialogSelectOption } from "@tui/ui/dialog-select"
import { useProject } from "@tui/context/project"
import { useSDK } from "@tui/context/sdk"
import { useTheme } from "@tui/context/theme"
import { useToast } from "@tui/ui/toast"
import { errorMessage } from "@/util/error"
import { route } from "@/sonderr/cli/cmd/tui/memory-command"

const HIVE_COMMANDS = [
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

  const options: DialogSelectOption<string>[] = HIVE_COMMANDS.map((item) => ({
    title: item.title,
    footer: `/SONDERR-HIVE ${item.value}`,
    category: "Hive",
    value: item.value,
  }))

  return (
    <DialogSelect
      title="Hive"
      options={options}
      flat
      onSelect={async (option) => {
        dialog.clear()
        const workspace = project.workspace.current()
        const result = await sdk.client.tui.appendPrompt({
          ...route({ workspace, directory: undefined }),
          text: `/SONDERR-HIVE ${option.value}`,
        })
        if (!result.error) return
        toast.show({ variant: "error", message: `Hive menu failed: ${errorMessage(result.error)}` })
      }}
    />
  )
}
