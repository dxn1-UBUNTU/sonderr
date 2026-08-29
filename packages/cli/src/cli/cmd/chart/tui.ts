import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { Global } from "@sonderr/core/global"
import { hasDisplay } from "@/sonderr/cli/cmd/tui/util/display"
import { readChartJsUmd } from "./chartjs"
import { buildChartDataFromSessions, toMs, type ChartSessionInput, type UsageChartData } from "./data"
import { renderChartHtml } from "./html"

/**
 * Bridge for the TUI `/chart` command: turns the experimental global session
 * list into the same dashboard the `sonderr chart` CLI command produces.
 *
 * Kept free of SDK type imports on purpose — the caller passes whatever the
 * client returned and we read it structurally.
 */

export interface SdkSessionLike {
  id: string
  title: string
  directory?: string
  projectID?: string
  parentID?: string
  cost?: number
  tokens?: { input: number; output: number; reasoning: number; cache: { read: number; write: number } }
  model?: { id: string; providerID: string; variant?: string } | null
  time: { created: number | string; updated: number | string }
}

function fromSdkSession(s: SdkSessionLike): ChartSessionInput {
  return {
    id: s.id,
    title: s.title,
    directory: s.directory,
    projectID: s.projectID,
    parentID: s.parentID,
    cost: s.cost,
    tokens: s.tokens,
    model: s.model ? `${s.model.providerID}/${s.model.id}` : undefined,
    created: toMs(s.time.created),
    updated: toMs(s.time.updated),
  }
}

export const UsageChart = {
  /** Build the dashboard HTML from SDK sessions and write it to disk. */
  async write(
    sessions: SdkSessionLike[],
    opts: { out?: string; now?: number } = {},
  ): Promise<{ file: string; data: UsageChartData }> {
    const data = buildChartDataFromSessions(sessions.map(fromSdkSession), { now: opts.now })
    const html = renderChartHtml(data, { chartJs: readChartJsUmd() })
    const stamp = new Date(opts.now ?? Date.now()).toISOString().replace(/[:.]/g, "-")
    const file = opts.out ?? path.join(Global.Path.tmp, `usage-chart-${stamp}.html`)
    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(file, html, "utf8")
    return { file, data }
  },

  /** Open the dashboard in the system browser. Returns false when headless. */
  async openBrowser(file: string): Promise<boolean> {
    if (!hasDisplay()) return false
    try {
      const open = (await import("open")).default
      await open(file)
      return true
    } catch {
      return false
    }
  },
}
