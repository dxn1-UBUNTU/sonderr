import { createBuiltinPlugins, type BuiltinTuiPlugin } from "@sonderr/tui/builtins"
import type { RuntimeFlags } from "@/effect/runtime-flags"
import { withSonderrTuiPlugins } from "@/sonderr/plugins/internal" // sonderr_change

export type InternalTuiPlugin = BuiltinTuiPlugin

// sonderr_change start
export function internalTuiPlugins(
  flags: Pick<RuntimeFlags.Info, "experimentalEventSystem" | "experimentalSessionSwitcher">,
): InternalTuiPlugin[] {
  return withSonderrTuiPlugins(
    createBuiltinPlugins({
      experimentalEventSystem: flags.experimentalEventSystem,
    }),
    flags,
  )
}
