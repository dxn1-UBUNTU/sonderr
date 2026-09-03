import type { BuiltinTuiPlugin } from "@sonderr/tui/builtins"
import HomeNews from "@/sonderr/plugins/home-news"
import HomeOnboarding from "@/sonderr/plugins/home-onboarding"
import Attention from "@/sonderr/plugins/attention"
import HomeFooter from "@/sonderr/plugins/home-footer"
import Permissions from "@/sonderr/plugins/permissions"
import SidebarFooter from "@/sonderr/plugins/sidebar-footer"
import MemoryStatus from "@/sonderr/plugins/memory-status"
import MemoryPalette from "@/sonderr/plugins/memory-palette"
import SidebarProcesses from "@/sonderr/plugins/sidebar-background-processes"
import SidebarIndexing from "@/sonderr/plugins/sidebar-indexing"
import SidebarPr from "@/sonderr/plugins/sidebar-pr"
import SidebarUsage from "@/sonderr/plugins/sidebar-usage"
import Sandbox from "@/sonderr/plugins/sandbox"
import Remote from "@/sonderr/plugins/remote"
import Reload from "@/sonderr/plugins/reload"
import SessionSwitcher from "@/sonderr/plugins/session-switcher"
import SessionV2Debug from "@/sonderr/plugins/session-v2-debug"
import HivePalette from "@/sonderr/plugins/hive-palette"
import type { RuntimeFlags } from "@/effect/runtime-flags"

const plugins = [
  HomeNews,
  HomeOnboarding,
  Attention,
  HomeFooter,
  Permissions,
  SidebarFooter,
  MemoryStatus,
  MemoryPalette,
  SidebarProcesses,
  SidebarIndexing,
  SidebarPr,
  SidebarUsage,
  Sandbox,
  Remote,
  Reload,
  HivePalette,
] satisfies BuiltinTuiPlugin[]

export function withSonderrTuiPlugins(
  builtins: BuiltinTuiPlugin[],
  flags: Pick<RuntimeFlags.Info, "experimentalEventSystem" | "experimentalSessionSwitcher">,
) {
  return [
    ...plugins,
    ...(flags.experimentalEventSystem ? [SessionV2Debug] : []),
    ...(flags.experimentalSessionSwitcher ? [SessionSwitcher] : []),
    ...builtins,
  ]
}
