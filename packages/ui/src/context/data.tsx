import type { Message, Session, Part, SnapshotFileDiff, SessionStatus, Provider } from "@sonderr/sdk/v2"
import { createSimpleContext } from "./helper"
import { PreloadMultiFileDiffResult } from "@pierre/diffs/ssr"

export type NormalizedProviderListResponse = {
  all: Map<string, Provider>
  default: {
    [key: string]: string
  }
  connected: Array<string>
}

type Data = {
  agent?: {
    name: string
    color?: string
  }[]
  provider?: NormalizedProviderListResponse
  session: Session[]
  session_status: {
    [sessionID: string]: SessionStatus
  }
  session_diff: {
    [sessionID: string]: SnapshotFileDiff[]
  }
  session_diff_preload?: {
    [sessionID: string]: PreloadMultiFileDiffResult<any>[]
  }
  message: {
    [sessionID: string]: Message[]
  }
  part: {
    [messageID: string]: Part[]
  }
  part_text_accum_delta?: {
    [partID: string]: string
  }
}

export type NavigateToSessionFn = (sessionID: string) => void

export type SessionHrefFn = (sessionID: string) => string

// sonderr_change start
// The optional trailing sessionID scopes the open to the session the file
// reference was rendered for, so the extension resolves its workspace directory
// from that explicit id instead of whatever session is current when the click
// is processed (avoids opening the wrong worktree during a session switch).
export type OpenFileFn = (filePath: string, line?: number, column?: number, sessionID?: string) => void

export type OpenDiffFn = (diff: {
  file: string
  before?: string // sonderr_change - optional, sonderr uses `patch`
  after?: string // sonderr_change - optional, sonderr uses `patch`
  patch?: string // sonderr_change
  additions: number
  deletions: number
  status?: "added" | "deleted" | "modified" // sonderr_change
  // sonderr_change start - multi-file patch preview payload
  files?: Array<{
    file: string
    before?: string
    after?: string
    patch?: string
    additions: number
    deletions: number
    status?: "added" | "deleted" | "modified" // sonderr_change
  }>
  // sonderr_change end
}) => void

export type OpenUrlFn = (url: string) => void

export type OpenContentFn = (content: string, language?: string) => void // sonderr_change

// sonderr_change start: sessionID scopes validation to the session the
// candidates were rendered for, so the extension resolves its workspace
// directory from that explicit id instead of whatever session is current.
export type ValidateFilesFn = (sessionID: string, paths: string[]) => Promise<string[]>
// sonderr_change end

export const { use: useData, provider: DataProvider } = createSimpleContext({
  name: "Data",
  init: (props: {
    data: Data
    directory: string
    onNavigateToSession?: NavigateToSessionFn
    onSessionHref?: SessionHrefFn
    onOpenFile?: OpenFileFn // sonderr_change
    onOpenDiff?: OpenDiffFn // sonderr_change
    onOpenUrl?: OpenUrlFn // sonderr_change
    onOpenContent?: OpenContentFn // sonderr_change
    onValidateFiles?: ValidateFilesFn // sonderr_change
  }) => {
    return {
      get store() {
        return props.data
      },
      get directory() {
        return props.directory
      },
      navigateToSession: props.onNavigateToSession,
      sessionHref: props.onSessionHref,
      openFile: props.onOpenFile, // sonderr_change
      openDiff: props.onOpenDiff, // sonderr_change
      openUrl: props.onOpenUrl, // sonderr_change
      openContent: props.onOpenContent, // sonderr_change
      validateFiles: props.onValidateFiles, // sonderr_change
    }
  },
})
