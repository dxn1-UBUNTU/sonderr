// sonderr_change - coverage for the `sonderr chart` command and the TUI /chart
// command. The aggregation + HTML rendering are pure functions, so these tests
// run without a database.

import { describe, expect, test } from "bun:test"
import { buildChartDataFromSessions, cutoffFor, filterSessions, toMs, type ChartSessionInput } from "../src/cli/cmd/chart/data"
import { renderChartHtml } from "../src/cli/cmd/chart/html"
import { readChartJsUmd } from "../src/cli/cmd/chart/chartjs"

const NOW = new Date("2026-08-20T12:00:00Z").getTime()

function session(overrides: Partial<ChartSessionInput> & { id: string }): ChartSessionInput {
  return {
    title: `session ${overrides.id}`,
    created: NOW,
    updated: NOW,
    ...overrides,
  }
}

const tokens = { input: 100, output: 50, reasoning: 10, cache: { read: 30, write: 20 } }

describe("toMs", () => {
  test("handles numbers, ISO strings, and effect DateTime objects", () => {
    const ms = 1_755_000_000_000
    expect(toMs(ms)).toBe(ms)
    expect(toMs(new Date(ms).toISOString())).toBe(ms)
    expect(toMs({ epochMilliseconds: ms })).toBe(ms)
    expect(toMs({ epochMillis: ms })).toBe(ms)
    expect(toMs(undefined)).toBe(0)
    expect(toMs("not a date")).toBe(0)
  })

  test("effect DateTime relational coercion regression", () => {
    // the exact shape Session.fromRow produces: `>=` must never be trusted, toMs must be used
    const fake = { epochMilliseconds: NOW }
    expect(toMs(fake)).toBe(NOW)
    expect((fake as unknown as number) >= NOW).toBe(false) // object comparison is always false
  })
})

describe("cutoffFor", () => {
  test("all time, N days, and today semantics", () => {
    expect(cutoffFor(undefined, NOW)).toBe(0)
    expect(cutoffFor(7, NOW)).toBe(NOW - 7 * 86_400_000)
    // days=0 cuts at local midnight
    const midnight = new Date(NOW)
    midnight.setHours(0, 0, 0, 0)
    expect(cutoffFor(0, NOW)).toBe(midnight.getTime())
  })
})

describe("filterSessions", () => {
  const sessions = [
    { updated: NOW, projectID: "a" },
    { updated: NOW - 10 * 86_400_000, projectID: "b" },
  ]

  test("cutoff drops old sessions", () => {
    const out = filterSessions(sessions, { cutoff: NOW - 5 * 86_400_000 })
    expect(out).toHaveLength(1)
    expect(out[0]!.projectID).toBe("a")
  })

  test("project filter with empty string requires a current project", () => {
    expect(() => filterSessions(sessions, { projectFilter: "" })).toThrow("currentProjectID")
    expect(filterSessions(sessions, { projectFilter: "", currentProjectID: "b" })).toHaveLength(1)
    expect(filterSessions(sessions, { projectFilter: "a" })).toHaveLength(1)
  })
})

describe("buildChartDataFromSessions", () => {
  test("aggregates totals, daily buckets, models, and top sessions", () => {
    const day1 = new Date("2026-08-18T10:00:00Z").getTime()
    const day2 = new Date("2026-08-19T15:00:00Z").getTime()
    const data = buildChartDataFromSessions(
      [
        session({ id: "root1", cost: 2, tokens, updated: day1, created: day1 }),
        session({ id: "root2", cost: 1, tokens, updated: day2, created: day2, model: "anthropic/claude" }),
        // child session keeps tokens but never adds cost
        session({ id: "child", cost: 99, tokens, updated: day2, created: day2, parentID: "root2" }),
      ],
      { now: NOW },
    )

    expect(data.totals.sessions).toBe(3)
    expect(data.totals.cost).toBe(3)
    const total = 100 + 50 + 10 + 30 + 20
    expect(data.totals.tokens.input).toBe(300)

    expect(data.daily).toHaveLength(2)
    expect(data.daily[0]!.date).toBe("2026-08-18")
    expect(data.daily[0]!.cost).toBe(2)
    expect(data.daily[0]!.sessions).toBe(1)
    expect(data.daily[1]!.tokens).toBe(total * 2)

    // derived model usage excludes child cost
    expect(data.models).toHaveLength(1)
    expect(data.models[0]!.model).toBe("anthropic/claude")
    expect(data.models[0]!.cost).toBe(1)

    expect(data.topSessions).toHaveLength(2)
    expect(data.topSessions[0]!.id).toBe("root1")
  })

  test("fills day gaps with zero points", () => {
    const a = new Date("2026-08-10T10:00:00Z").getTime()
    const b = new Date("2026-08-14T10:00:00Z").getTime()
    const data = buildChartDataFromSessions([session({ id: "x", cost: 1, updated: a, created: a }), session({ id: "y", cost: 1, updated: b, created: b })], {
      now: NOW,
    })
    expect(data.daily).toHaveLength(5)
    expect(data.daily[2]!.sessions).toBe(0)
    expect(data.daily[2]!.cost).toBe(0)
  })

  test("days filter excludes older sessions", () => {
    const recent = NOW - 86_400_000
    const old = NOW - 30 * 86_400_000
    const data = buildChartDataFromSessions(
      [session({ id: "recent", updated: recent, created: recent }), session({ id: "old", updated: old, created: old })],
      { days: 7, now: NOW },
    )
    expect(data.totals.sessions).toBe(1)
    expect(data.topSessions[0]!.id).toBe("recent")
  })

  test("CLI overrides: message-accurate models/tools/totals win", () => {
    const data = buildChartDataFromSessions([session({ id: "s", cost: 1, tokens, model: "wrong/model" })], {
      now: NOW,
      totalMessages: 42,
      models: [{ model: "anthropic/claude-sonnet", messages: 20, cost: 5, tokens: 1000 }],
      tools: [
        { tool: "bash", count: 7 },
        { tool: "edit", count: 3 },
      ],
      totals: { cost: 5, messages: 42 },
    })
    expect(data.totals.messages).toBe(42)
    expect(data.totals.cost).toBe(5)
    // totals.tokens must stay flat + finite even when the override omits it (NaN regression)
    expect(Number.isNaN(data.totals.tokens.cacheRead)).toBe(false)
    expect(data.totals.tokens.input).toBe(100)
    expect(data.models[0]!.model).toBe("anthropic/claude-sonnet")
    expect(data.models[0]!.messages).toBe(20)
    expect(data.tools.map((t) => t.tool)).toEqual(["bash", "edit"])
  })

  test("empty input produces a valid empty payload", () => {
    const data = buildChartDataFromSessions([], { now: NOW })
    expect(data.totals.sessions).toBe(0)
    expect(data.daily).toHaveLength(0)
    expect(data.models).toHaveLength(0)
    expect(data.topSessions).toHaveLength(0)
  })
})

describe("renderChartHtml", () => {
  const data = buildChartDataFromSessions(
    [
      session({ id: "s1", title: 'nice <script>alert("x")</script> title', cost: 1.5, tokens, updated: NOW, created: NOW }),
      session({ id: "s2", title: "second", cost: 0.5, tokens, updated: NOW, created: NOW, model: "anthropic/claude" }),
    ],
    { now: NOW, tools: [{ tool: "bash", count: 4 }] },
  )

  test("embeds data XSS-safe and renders panels", () => {
    const html = renderChartHtml(data)
    // "<" inside the JSON payload is escaped, so a title can't break out of the script tag
    expect(html).not.toContain('<script>alert("x")</script> title')
    expect(html).toContain("SONDERR")
    expect(html).toContain('id="sonderr-chart-data"')
    expect(html).toContain('id="cost-chart"')
    expect(html).toContain('id="tokens-chart"')
    expect(html).toContain('id="models-chart"')
    expect(html).toContain('id="tools-chart"')
    expect(html).toContain('id="sessions-body"')
  })

  test("inlines Chart.js when the dependency resolves", () => {
    const js = readChartJsUmd()
    // chart.js is a declared dependency of this package, so it should resolve in the workspace
    expect(js).toBeTruthy()
    const html = renderChartHtml(data, { chartJs: js })
    expect(html).not.toContain("cdn.jsdelivr.net/npm/chart.js")
    expect(html).toContain("Chart.js v4.5.1") // UMD bundle header, minified source inlined
  })

  test("falls back to the CDN when no bundle is provided", () => {
    const html = renderChartHtml(data, {})
    expect(html).toContain("cdn.jsdelivr.net/npm/chart.js")
  })

  test("empty data renders the empty state without charts", () => {
    const html = renderChartHtml(buildChartDataFromSessions([], { now: NOW }))
    expect(html).toContain("No sessions in this range yet")
    expect(html).not.toContain('id="cost-chart"')
  })
})
