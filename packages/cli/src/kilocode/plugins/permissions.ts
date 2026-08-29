import type { TuiPlugin } from "@sonderr/plugin/tui"
import type { InternalTuiPlugin } from "@/plugin/tui/internal"
import { MemoryPermission } from "@/sonderr/cli/cmd/tui/permissions"

const id = "internal:sonderr-permissions"

const tui: TuiPlugin = async () => {
  MemoryPermission.register()
}

const plugin: InternalTuiPlugin = {
  id,
  tui,
}

export default plugin
