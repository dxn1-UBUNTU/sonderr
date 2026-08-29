/**
 * Pure data model + aggregation for `sonderr chart` and the TUI /chart command.
 *
 * Two adapters feed it:
 *  - CLI (`chart.ts`): rows from the session table, model/tool breakdown from
 *    `aggregateSessionStats` (message-accurate).
 *  - TUI (`chart/tui.ts`): sessions from `GET /experimental/session` (row-level
 *    numbers only, so models are derived per-session and tools are absent).
 *
 * Everything here is intentionally dependency-free so the TUI can import it
 * without dragging the Effect runtime into the browser payload.
 */

export interface ChartSessionInput {
  id: string
  title: string
  directory?: string
  projectID?: string
  parentID?: string
  cost?: number
  tokens?: { input: number; output: number; reasoning: number; cache: { read: number; write: number } }
  /** "provider/model" string; per-message accuracy only exists in CLI mode */
  model?: string
  /** epoch millis; adapters convert whatever the source stores */
  created: number
  updated: number
}

export interface ChartDailyPoint {
  /** local YYYY-MM-DD */
  date: string
  cost: number
  tokens: number
  sessions: number
}

export interface ChartModelPoint {
  model: string
  messages?: number
  cost: number
  tokens: number
}

export interface ChartToolPoint {
  tool: string
  count: number
}

export interface ChartSessionPoint {
  id: string
  title: string
  cost: number
  tokens: number
  updated: number
  directory?: string
}

export interface UsageChartData {
  generatedAt: number
  /** undefined = all time */
  days: number | undefined
  totals: {
    sessions: number
    messages: number | undefined
    cost: number
    tokens: { input: number; output: number; reasoning: number; cacheRead: number; cacheWrite: number }
  }
  daily: ChartDailyPoint[]
  models: ChartModelPoint[]
  tools: ChartToolPoint[]
  topSessions: ChartSessionPoint[]
}

export interface BuildChartOptions {
  days?: number
  /** message-accurate model usage (CLI) */
  models?: ChartModelPoint[]
  /** tool call counts (CLI) */
  tools?: ChartToolPoint[]
  /** total message count (CLI message scan) */
  totalMessages?: number
  /** authoritative totals when available (CLI keeps legacy-cost correctness there) */
  totals?: Partial<UsageChartData["totals"]>
  /** injectable clock for tests */
  now?: number
}

const MS_IN_DAY = 86_400_000

export function toMs(t: unknown): number {
  if (typeof t === "number") return t
  if (typeof t === "string") {
    const n = Date.parse(t)
    return Number.isNaN(n) ? 0 : n
  }
  if (t && typeof t === "object") {
    // effect DateTime.Utc exposes epochMilliseconds (older versions: epochMillis)
    const obj = t as { epochMilliseconds?: unknown; epochMillis?: unknown }
    if (typeof obj.epochMilliseconds === "number") return obj.epochMilliseconds
    if (typeof obj.epochMillis === "number") return obj.epochMillis
    const v = (t as { valueOf?: () => unknown }).valueOf?.()
    if (typeof v === "number") return v
    if (typeof v === "string") {
      const n = Date.parse(v)
      if (!Number.isNaN(n)) return n
    }
  }
  return 0
}

/** Same semantics as the stats command: 0 means "since local midnight today". */
export function cutoffFor(days: number | undefined, now = Date.now()): number {
  if (days === undefined) return 0
  if (days === 0) {
    const d = new Date(now)
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  }
  return now - days * MS_IN_DAY
}

export function filterSessions<T extends { updated?: unknown; projectID?: string }>(
  sessions: T[],
  opts: { cutoff?: number; projectFilter?: string; currentProjectID?: string },
): T[] {
  const cutoff = opts.cutoff ?? 0
  let out = cutoff > 0 ? sessions.filter((s) => toMs(s.updated) >= cutoff) : sessions
  if (opts.projectFilter !== undefined) {
    if (opts.projectFilter === "") {
      if (!opts.currentProjectID) throw new Error("currentProjectID required when projectFilter is empty string")
      out = out.filter((s) => s.projectID === opts.currentProjectID)
    } else {
      out = out.filter((s) => s.projectID === opts.projectFilter)
    }
  }
  return out
}

function localDateKey(ms: number): string {
  const d = new Date(ms)
  const m = `${d.getMonth() + 1}`.padStart(2, "0")
  const day = `${d.getDate()}`.padStart(2, "0")
  return `${d.getFullYear()}-${m}-${day}`
}

function emptyTokens() {
  return { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } }
}

function emptyTotals() {
  return { input: 0, output: 0, reasoning: 0, cacheRead: 0, cacheWrite: 0 }
}

function tokensTotal(t: { input: number; output: number; reasoning: number; cache: { read: number; write: number } }) {
  return t.input + t.output + t.reasoning + t.cache.read + t.cache.write
}

/**
 * Build the full chart payload from a session list.
 *
 * Mirrors the stats command's counting rules: child (subagent) sessions keep
 * their tokens but report zero cost so nothing is double-counted.
 */
export function buildChartDataFromSessions(
  sessions: ChartSessionInput[],
  opts: BuildChartOptions = {},
): UsageChartData {
  const now = opts.now ?? Date.now()
  const cutoff = cutoffFor(opts.days, now)
  const included = cutoff > 0 ? sessions.filter((s) => s.updated >= cutoff) : sessions

  let totals: UsageChartData["totals"] = {
    sessions: included.length,
    messages: opts.totalMessages,
    cost: included.reduce((sum, s) => sum + (s.parentID ? 0 : s.cost ?? 0), 0),
    tokens: emptyTotals(),
  }
  for (const s of included) {
    if (!s.tokens) continue
    totals.tokens.input += s.tokens.input || 0
    totals.tokens.output += s.tokens.output || 0
    totals.tokens.reasoning += s.tokens.reasoning || 0
    totals.tokens.cacheRead += s.tokens.cache?.read || 0
    totals.tokens.cacheWrite += s.tokens.cache?.write || 0
  }
  if (opts.totals) {
    totals = {
      ...totals,
      ...opts.totals,
      tokens: { ...totals.tokens, ...opts.totals.tokens },
    }
  }

  // ---- daily buckets (cost only accrues to root sessions) ----
  const dailyMap = new Map<string, ChartDailyPoint>()
  for (const s of included) {
    const key = localDateKey(s.updated || s.created || now)
    const point = dailyMap.get(key) ?? { date: key, cost: 0, tokens: 0, sessions: 0 }
    point.sessions += 1
    point.tokens += tokensTotal(s.tokens ?? emptyTokens())
    if (!s.parentID) point.cost += s.cost ?? 0
    dailyMap.set(key, point)
  }
  // fill day gaps so the line reads as a continuous timeline
  const keys = [...dailyMap.keys()].sort()
  const daily: ChartDailyPoint[] = []
  if (keys.length > 0) {
    const start = new Date(keys[0]!)
    const end = new Date(keys[keys.length - 1]!)
    const spanDays = Math.round((end.getTime() - start.getTime()) / MS_IN_DAY)
    if (spanDays >= 0 && spanDays <= 400) {
      for (let t = start.getTime(); t <= end.getTime(); t += MS_IN_DAY) {
        const key = localDateKey(t)
        daily.push(dailyMap.get(key) ?? { date: key, cost: 0, tokens: 0, sessions: 0 })
      }
    } else {
      daily.push(...keys.map((k) => dailyMap.get(k)!))
    }
  }
  // DST shifts can duplicate a key when stepping by 24h; dedupe defensively
  const seen = new Set<string>()
  const dailyDeduped = daily.filter((p) => (seen.has(p.date) ? false : (seen.add(p.date), true)))

  // ---- models ----
  let models: ChartModelPoint[]
  if (opts.models) {
    models = [...opts.models].sort((a, b) => b.cost - a.cost || b.tokens - a.tokens)
  } else {
    const byModel = new Map<string, ChartModelPoint>()
    for (const s of included) {
      if (!s.model) continue
      const point = byModel.get(s.model) ?? { model: s.model, cost: 0, tokens: 0 }
      point.cost += s.parentID ? 0 : s.cost ?? 0
      point.tokens += tokensTotal(s.tokens ?? emptyTokens())
      byModel.set(s.model, point)
    }
    models = [...byModel.values()].sort((a, b) => b.cost - a.cost || b.tokens - a.tokens)
  }

  const tools = opts.tools ? [...opts.tools].sort((a, b) => b.count - a.count) : []

  const topSessions: ChartSessionPoint[] = included
    .filter((s) => !s.parentID)
    .map((s) => ({
      id: s.id,
      title: s.title,
      cost: s.cost ?? 0,
      tokens: tokensTotal(s.tokens ?? emptyTokens()),
      updated: s.updated,
      directory: s.directory,
    }))
    .sort((a, b) => b.cost - a.cost || b.tokens - a.tokens || b.updated - a.updated)
    .slice(0, 8)

  return {
    generatedAt: now,
    days: opts.days,
    totals,
    daily: dailyDeduped,
    models,
    tools,
    topSessions,
  }
}
