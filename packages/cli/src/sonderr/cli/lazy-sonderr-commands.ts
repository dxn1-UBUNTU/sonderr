import { lazy } from "@/sonderr/cli/lazy-commands"

export const SonderrConsoleCommand = lazy({
  command: "console",
  describe: "open or stop the local Sonderr Console (deprecated)",
  load: async () => (await import("@/sonderr/cli/cmd/console")).SonderrConsoleCommand,
})

export const CloudCommand = lazy({
  command: "cloud",
  describe: "run Cloud Agent tasks",
  load: async () => (await import("@/sonderr/cli/cmd/cloud")).CloudCommand,
})

export const RollCallCommand = lazy({
  command: "roll-call <filter>",
  describe: "batch-test text models matching a filter for connectivity and latency",
  load: async () => (await import("@/sonderr/cli/cmd/roll-call")).RollCallCommand,
})

export const ProfileCommand = lazy({
  command: "profile",
  describe: "show Sonderr account profile",
  load: async () => (await import("@/sonderr/cli/cmd/profile")).ProfileCommand,
})

export const RemoteCommand = lazy({
  command: "remote",
  describe: "enable remote connection for real-time session relay",
  load: async () => (await import("@/cli/cmd/remote")).RemoteCommand,
})

export const DaemonCommand = lazy({
  command: "daemon",
  describe: "manage the local sonderr daemon",
  load: async () => (await import("@/sonderr/cli/cmd/daemon")).DaemonCommand,
})

export const ConfigCLICommand = lazy({
  command: "config",
  describe: "configuration tools",
  load: async () => (await import("@/cli/cmd/config")).ConfigCommand,
})

export const WorktreeCommand = lazy({
  command: "worktree",
  describe: "manage git worktrees",
  load: async () => (await import("@/sonderr/cli/cmd/worktree")).WorktreeCommand,
})

export const PtySmokeCommand = lazy({
  command: "__pty-smoke",
  describe: false,
  load: async () => (await import("@/sonderr/cli/cmd/pty-smoke")).PtySmokeCommand,
})

export const DevSetupCommand = lazy({
  command: "dev-setup",
  describe: "install a `sonderrdev` shell alias for this checkout",
  load: async () => (await import("@/sonderr/cli/dev-setup")).DevSetupCommand,
})

export const DevAliasCommand = lazy({
  command: "dev-alias [shell]",
  describe: false,
  load: async () => (await import("@/sonderr/cli/dev-setup")).DevAliasCommand,
})
