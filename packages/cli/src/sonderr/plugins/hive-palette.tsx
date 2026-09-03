/** @jsxImportSource @opentui/solid */
import type { TuiPlugin } from "@sonderr/plugin/tui"
import type { InternalTuiPlugin } from "@/plugin/tui/internal"
import { DialogHive } from "@/sonderr/cli/cmd/tui/component/dialog-hive"

const id = "internal:sonderr-hive-palette"

const tui: TuiPlugin = async (api) => {
  api.keymap.registerLayer({
    commands: [
      {
        namespace: "palette",
        name: "hive.menu",
        title: "Hive",
        slashName: "SONDERR-HIVE",
        slashAliases: ["hive"],
        category: "Sonderr",
        run() {
          api.ui.dialog.setSize("large")
          api.ui.dialog.replace(() => <DialogHive />)
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
