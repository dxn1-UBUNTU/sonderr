/** @jsxImportSource @opentui/solid */
import type { TuiPlugin } from "@sonderr/plugin/tui"
import type { InternalTuiPlugin } from "@/plugin/tui/internal"
import { DialogMemoryHelp } from "@/sonderr/cli/cmd/tui/component/dialog-memory"

const id = "internal:sonderr-memory-palette"

const tui: TuiPlugin = async (api) => {
  api.keymap.registerLayer({
    commands: [
      {
        namespace: "palette",
        name: "memory.help",
        title: "Memory",
        slashName: "memory",
        slashAliases: ["mem"],
        category: "System",
        run() {
          api.ui.dialog.setSize("large")
          api.ui.dialog.replace(() => <DialogMemoryHelp />)
        },
      },
    ],
    bindings: [],
  })
}

const plugin: InternalTuiPlugin = {
  id,
  tui,
}

export default plugin
