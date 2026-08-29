export const opaque = [
  { id: "semantic_search", file: "sonderr/tool/semantic-search.ts" },
  { id: "lsp", file: "tool/lsp.ts" },
] as const

export const host = [
  { id: "interactive_terminal", file: "sonderr/tool/interactive-terminal.ts" },
  { id: "notebook_execute", file: "sonderr/tool/notebook-host.ts" },
  { id: "background_process", file: "sonderr/tool/background-process.ts" },
] as const
