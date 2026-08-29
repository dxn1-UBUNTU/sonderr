import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import { Effect } from "effect"
import open from "open"
import { Database } from "@sonderr/core/database/database"
import { SessionTable } from "@sonderr/core/session/sql"
import { Global } from "@sonderr/core/global"
import { InstanceRef } from "@/effect/instance-ref"
import { Session } from "@/session/session"
import { hasDisplay } from "@/sonderr/cli/cmd/tui/util/display"
import { effectCmd } from "../effect-cmd"
import { readChartJsUmd } from "./chart/chartjs"
import { buildChartDataFromSessions, cutoffFor, filterSessions, toMs, type ChartSessionInput } from "./chart/data"
import { renderChartHtml } from "./chart/html"
import { aggregateSessionStats } from "./stats"

export const ChartCommand = effectCmd({
  command: "chart",
  describe: "render usage charts (cost, tokens, models, tools) and open them in your browser",
  builder: (yargs) =>
    yargs
      .option("days", {
        describe: "show the last N days (default: all time)",
        type: "number",
      })
      .option("project", {
        describe: "filter by project (default: all projects, empty string: current project)",
        type: "string",
      })
      .option("out", {
        describe: "write the dashboard to this file instead of a timestamped temp file",
        type: "string",
      })
      .option("open", {
        describe: "open the dashboard in a browser after writing",
        type: "boolean",
        default: true,
      }),
  handler: Effect.fn("Cli.chart")(function* (args) {
    const ctx = yield* InstanceRef
    if (!ctx) return

    // message-accurate breakdown (models, tools, totals incl. legacy sessions)
    const stats = yield* aggregateSessionStats(args.days, args.project, ctx.project)

    // row-level series for the daily timeline + top sessions
    const { db } = yield* Database.Service
    const rows = (yield* db.select().from(SessionTable).all().pipe(Effect.orDie)).map((row) => Session.fromRow(row))

    const currentProjectID = args.project === "" ? ctx.project?.id : undefined
    const sessions: ChartSessionInput[] = filterSessions(
      rows.map((info) => ({
        id: info.id,
        title: info.title,
        directory: info.location?.directory,
        projectID: info.projectID,
        parentID: info.parentID,
        cost: info.cost,
        tokens: info.tokens,
        model: info.model ? `${info.model.providerID}/${info.model.id}` : undefined,
        created: toMs(info.time.created),
        updated: toMs(info.time.updated),
      })),
      {
        cutoff: cutoffFor(args.days),
        projectFilter: args.project,
        currentProjectID,
      },
    )

    const data = buildChartDataFromSessions(sessions, {
      days: args.days,
      totalMessages: stats.totalMessages,
      models: Object.entries(stats.modelUsage).map(([model, usage]) => ({
        model,
        messages: usage.messages,
        cost: usage.cost,
        tokens: usage.tokens.input + usage.tokens.output + usage.tokens.cache.read + usage.tokens.cache.write,
      })),
      tools: Object.entries(stats.toolUsage).map(([tool, count]) => ({ tool, count })),
      totals: {
        sessions: stats.totalSessions,
        cost: stats.totalCost,
        messages: stats.totalMessages,
        tokens: {
          input: stats.totalTokens.input,
          output: stats.totalTokens.output,
          reasoning: stats.totalTokens.reasoning,
          cacheRead: stats.totalTokens.cache.read,
          cacheWrite: stats.totalTokens.cache.write,
        },
      },
    })

    const html = renderChartHtml(data, { chartJs: readChartJsUmd() })
    const file =
      args.out ?? path.join(Global.Path.tmp, `usage-chart-${new Date().toISOString().replace(/[:.]/g, "-")}.html`)
    mkdirSync(path.dirname(file), { recursive: true })
    writeFileSync(file, html)

    const totalTokens =
      data.totals.tokens.input +
      data.totals.tokens.output +
      data.totals.tokens.reasoning +
      data.totals.tokens.cacheRead +
      data.totals.tokens.cacheWrite
    console.log(`Usage charts written to ${file}`)
    console.log(`  ${data.totals.sessions} sessions · $${data.totals.cost.toFixed(2)} · ${totalTokens.toLocaleString()} tokens`)

    if (!args.open) return
    if (!hasDisplay()) {
      console.log("No display detected — open the file manually in a browser.")
      return
    }
    yield* Effect.tryPromise({
      try: () => open(file),
      catch: () => new Error("browser open failed"),
    }).pipe(
      Effect.catchAll(() =>
        Effect.sync(() => console.log("Could not open a browser — open the file manually in your file manager.")),
      ),
    )
  }),
})
