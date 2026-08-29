import { NavSection } from "../types"

export const SonderrClawNav: NavSection[] = [
  {
    title: "SonderrClaw",
    links: [
      { href: "/sonderrclaw/overview", children: "Overview" },
      { href: "/sonderrclaw/dashboard", children: "Dashboard" },
      { href: "/sonderrclaw/pre-installed-software", children: "Pre-installed Software" },
      { href: "/sonderrclaw/end-to-end", children: "End to End Config" },
      {
        href: "/sonderrclaw/control-ui/overview",
        children: "Control UI",
        subLinks: [
          { href: "/sonderrclaw/control-ui/changing-models", children: "Changing Models" },
          { href: "/sonderrclaw/control-ui/exec-approvals", children: "Exec Approvals" },
          { href: "/sonderrclaw/control-ui/version-pinning", children: "Version Pinning" },
        ],
      },
      {
        href: "/sonderrclaw/chat-platforms",
        children: "Chat Platforms",
        subLinks: [
          { href: "/sonderrclaw/chat-platforms/telegram", children: "Telegram" },
          { href: "/sonderrclaw/chat-platforms/discord", children: "Discord" },
          { href: "/sonderrclaw/chat-platforms/slack", children: "Slack" },
        ],
      },
      {
        href: "/sonderrclaw/development-tools",
        children: "Integrations",
        subLinks: [
          { href: "/sonderrclaw/development-tools/github", children: "GitHub" },
          { href: "/sonderrclaw/development-tools/google", children: "Google Workspace" },
          { href: "/sonderrclaw/development-tools/linear", children: "Linear" },
          { href: "/sonderrclaw/development-tools/composio", children: "Composio" },
          { href: "/sonderrclaw/tools/1password", children: "1Password" },
          { href: "/sonderrclaw/tools/brave-search", children: "Brave Search" },
          { href: "/sonderrclaw/tools/agentcard", children: "AgentCard" },
          { href: "/sonderrclaw/tools/other-tools", children: "Other Tools" },
        ],
      },
      {
        href: "/sonderrclaw/triggers",
        children: "Triggers",
        subLinks: [
          { href: "/sonderrclaw/triggers/webhooks", children: "Webhooks" },
          { href: "/sonderrclaw/triggers/scheduled", children: "Scheduled" },
        ],
      },
      {
        href: "/sonderrclaw/troubleshooting/common-questions",
        children: "Troubleshooting",
        subLinks: [
          { href: "/sonderrclaw/troubleshooting/common-questions", children: "Common Questions" },
          { href: "/sonderrclaw/troubleshooting/gateway-process", children: "Gateway Process States" },
          { href: "/sonderrclaw/troubleshooting/architecture", children: "Architecture Notes" },
        ],
      },
      {
        href: "/sonderrclaw/faq/general",
        children: "FAQ",
        subLinks: [
          { href: "/sonderrclaw/faq/general", children: "General" },
          { href: "/sonderrclaw/faq/pricing", children: "Pricing" },
        ],
      },
    ],
  },
]
