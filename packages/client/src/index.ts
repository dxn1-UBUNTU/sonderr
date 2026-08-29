export * from "./generated/index"
export type { EventsSubscribeOutput as SonderrEvent } from "./generated/types"

// sonderr_change start - compatibility with upstream session-ui's legacy Promise client type
export type FileDiffInfo = {
  file: string
  patch: string
  additions: number
  deletions: number
  status: "added" | "deleted" | "modified"
}
// sonderr_change end
