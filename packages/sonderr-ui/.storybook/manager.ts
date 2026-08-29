import { addons } from "storybook/manager-api"
import { GLOBALS_UPDATED, SET_GLOBALS } from "storybook/internal/core-events"

addons.register("sonderr-ui/toolbar-visibility", (api) => {
  const update = (globals: Record<string, unknown>) => {
    const isVscode = globals["theme"] === "sonderr-vscode"
    document.documentElement.setAttribute("data-sonderr-theme", isVscode ? "sonderr-vscode" : "sonderr")
  }

  const channel = api.getChannel()
  if (!channel) return

  channel.on(SET_GLOBALS, ({ globals }: { globals: Record<string, unknown> }) => {
    update(globals)
  })

  channel.on(GLOBALS_UPDATED, ({ globals }: { globals: Record<string, unknown> }) => {
    update(globals)
  })
})
