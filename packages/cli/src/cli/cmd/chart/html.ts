import type { UsageChartData } from "./data"

/**
 * Renders the standalone usage-dashboard HTML. Pure string templating — no
 * runtime dependencies. Chart.js is inlined when available (offline-safe);
 * otherwise the page falls back to a CDN and shows a friendly notice if even
 * that is unavailable.
 */

const CDN = "https://cdn.jsdelivr.net/npm/chart.js@4.5.1/dist/chart.umd.min.js"

// Sonderr dark palette (matches the TUI's cyan accent)
const C = {
  bg: "#0b0e14",
  panel: "#11151d",
  border: "#1f2530",
  text: "#e8eaf0",
  muted: "#8b93a3",
  cyan: "#22d3ee",
  violet: "#a78bfa",
  green: "#34d399",
  amber: "#fbbf24",
  red: "#f87171",
  pink: "#f472b6",
}

const MODEL_COLORS = [C.cyan, C.violet, C.green, C.amber, C.pink, C.red, "#60a5fa", "#fb923c"]

function fmtTokens(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "B"
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M"
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K"
  return String(n)
}

function fmtCost(n: number): string {
  if (n >= 1_000) return "$" + n.toFixed(0)
  if (n >= 1) return "$" + n.toFixed(2)
  return "$" + n.toFixed(4)
}

function safeJson(data: UsageChartData): string {
  // escape "<" so session titles can never close the script tag (XSS-safe embed)
  return JSON.stringify(data).replace(/</g, "\\u003c")
}

export function renderChartHtml(data: UsageChartData, opts: { chartJs?: string } = {}): string {
  const script = opts.chartJs ? `<script>${opts.chartJs}</script>` : `<script src="${CDN}"></script>`
  const generated = new Date(data.generatedAt).toLocaleString()
  const range =
    data.days === undefined ? "all time" : data.days === 0 ? "today" : `last ${data.days} day${data.days === 1 ? "" : "s"}`

  const t = data.totals
  const totalTokens = t.tokens.input + t.tokens.output + t.tokens.reasoning + t.tokens.cacheRead + t.tokens.cacheWrite
  const activeDays = data.daily.filter((d) => d.sessions > 0).length
  const kpis = [
    { label: "Total cost", value: fmtCost(t.cost) },
    { label: "Sessions", value: String(t.sessions) },
    { label: "Total tokens", value: fmtTokens(totalTokens) },
    { label: "Active days", value: String(activeDays) },
    ...(t.messages !== undefined ? [{ label: "Messages", value: String(t.messages) }] : []),
  ]

  const hasModels = data.models.length > 0
  const hasTools = data.tools.length > 0
  const hasSessions = data.topSessions.length > 0
  const hasDaily = data.daily.length > 0

  const body =
    t.sessions === 0
      ? `<div class="panel"><div class="empty">No sessions in this range yet.<br>Run <span class="cost">sonderr</span> and come back — charts will build themselves from your usage.</div></div>`
      : `<div class="kpis">${kpis
          .map((k) => `<div class="kpi"><div class="label">${k.label}</div><div class="value cyan">${k.value}</div></div>`)
          .join("")}</div>
<div class="grid">
  ${hasDaily ? `<div class="panel"><h2>Cost over time</h2><div class="chart-box"><canvas id="cost-chart"></canvas></div></div>` : ""}
  ${hasDaily ? `<div class="panel"><h2>Tokens over time</h2><div class="chart-box"><canvas id="tokens-chart"></canvas></div></div>` : ""}
  ${hasModels ? `<div class="panel"><h2>Usage by model</h2><div class="chart-box short"><canvas id="models-chart"></canvas></div></div>` : ""}
  ${hasTools ? `<div class="panel"><h2>Top tools</h2><div class="chart-box short"><canvas id="tools-chart"></canvas></div></div>` : ""}
  ${
    hasSessions
      ? `<div class="panel wide"><h2>Top sessions by cost</h2><table><thead><tr><th>Session</th><th class="num">Cost</th><th class="num">Tokens</th><th class="num">Updated</th><th>Project</th></tr></thead><tbody id="sessions-body"></tbody></table></div>`
      : ""
  }
</div>`

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sonderr usage charts</title>
${script}
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: ${C.bg}; color: ${C.text};
    font: 14px/1.5 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    padding: 32px clamp(16px, 4vw, 48px) 48px;
  }
  header { display: flex; align-items: baseline; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-bottom: 24px; }
  .wordmark { font-size: 26px; font-weight: 800; letter-spacing: 0.35em; color: ${C.text}; }
  .wordmark span { color: ${C.cyan}; }
  .sub { color: ${C.muted}; font-size: 13px; }
  .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 16px; }
  .kpi { background: ${C.panel}; border: 1px solid ${C.border}; border-radius: 10px; padding: 14px 16px; }
  .kpi .label { color: ${C.muted}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; }
  .kpi .value { font-size: 24px; font-weight: 700; margin-top: 2px; }
  .kpi .value.cyan { color: ${C.cyan}; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 16px; }
  .panel { background: ${C.panel}; border: 1px solid ${C.border}; border-radius: 10px; padding: 16px 18px; }
  .panel h2 { font-size: 13px; font-weight: 600; color: ${C.muted}; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 12px; }
  .panel.wide { grid-column: 1 / -1; }
  .chart-box { position: relative; height: 280px; }
  .chart-box.short { height: 240px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; color: ${C.muted}; font-weight: 600; padding: 6px 8px; border-bottom: 1px solid ${C.border}; }
  td { padding: 7px 8px; border-bottom: 1px solid ${C.border}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 340px; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  tr:last-child td { border-bottom: none; }
  .muted { color: ${C.muted}; }
  .cost { color: ${C.green}; font-variant-numeric: tabular-nums; }
  footer { margin-top: 24px; color: ${C.muted}; font-size: 12px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 6px; }
  .empty { color: ${C.muted}; padding: 40px 0; text-align: center; }
  #chartjs-missing { display: none; margin: 16px 0; padding: 14px 16px; border: 1px solid ${C.amber}; border-radius: 10px; color: ${C.amber}; background: ${C.panel}; }
</style>
</head>
<body>
<header>
  <div>
    <div class="wordmark">SONDERR<span>.</span></div>
    <div class="sub">usage charts · ${range} · ${t.sessions} session${t.sessions === 1 ? "" : "s"}</div>
  </div>
  <div class="sub">generated ${generated}</div>
</header>
<div id="chartjs-missing">Chart.js could not be loaded (offline?). The raw usage data is still embedded in this file.</div>
${body}
<footer>
  <div>sonderr chart — local usage, nothing leaves your machine</div>
  <div>sonderr chart --days 30 · --project · --out</div>
</footer>
<script type="application/json" id="sonderr-chart-data">${safeJson(data)}</script>
<script>
(function () {
  if (typeof Chart === "undefined") {
    document.getElementById("chartjs-missing").style.display = "block"
    return
  }
  var data = JSON.parse(document.getElementById("sonderr-chart-data").textContent)
  var C = {
    text: "${C.text}", muted: "${C.muted}", border: "${C.border}", panel: "${C.panel}",
    cyan: "${C.cyan}", violet: "${C.violet}", green: "${C.green}", amber: "${C.amber}", pink: "${C.pink}", red: "${C.red}"
  }
  var MODEL_COLORS = [C.cyan, C.violet, C.green, C.amber, C.pink, C.red, "#60a5fa", "#fb923c"]
  var tokenColors = { input: C.cyan, output: C.violet, reasoning: C.pink, cacheRead: C.green, cacheWrite: C.amber }
  Chart.defaults.color = C.muted
  Chart.defaults.borderColor = C.border
  Chart.defaults.font.family = getComputedStyle(document.body).fontFamily

  function money(n) { return n >= 1 ? "$" + n.toFixed(2) : "$" + n.toFixed(4) }
  function tokens(n) {
    if (n >= 1e9) return (n / 1e9).toFixed(2) + "B"
    if (n >= 1e6) return (n / 1e6).toFixed(2) + "M"
    if (n >= 1e3) return (n / 1e3).toFixed(1) + "K"
    return String(n)
  }

  var daily = data.daily || []
  var labels = daily.map(function (d) { return d.date.slice(5) })

  var costEl = document.getElementById("cost-chart")
  if (costEl) {
    var grad = costEl.getContext("2d").createLinearGradient(0, 0, 0, 280)
    grad.addColorStop(0, "rgba(34,211,238,0.35)")
    grad.addColorStop(1, "rgba(34,211,238,0.02)")
    new Chart(costEl, {
      type: "line",
      data: {
        labels: labels,
        datasets: [{
          data: daily.map(function (d) { return d.cost }),
          borderColor: C.cyan, backgroundColor: grad, fill: true, tension: 0.3, pointRadius: 0, borderWidth: 2,
        }],
      },
      options: {
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: "index" },
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (ctx) { return money(ctx.parsed.y ?? 0) } } } },
        scales: { x: { ticks: { maxTicksLimit: 10 } }, y: { ticks: { callback: money }, beginAtZero: true } },
      },
    })
  }

  var tokensEl = document.getElementById("tokens-chart")
  if (tokensEl) {
    // daily rows only carry a pre-aggregated token total, so split each day by
    // the overall input/output/reasoning/cache proportions
    var tt = data.totals.tokens
    var grand = tt.input + tt.output + tt.reasoning + tt.cacheRead + tt.cacheWrite || 1
    var split = { input: "Input", output: "Output", reasoning: "Reasoning", cacheRead: "Cache read", cacheWrite: "Cache write" }
    new Chart(tokensEl, {
      type: "bar",
      data: {
        labels: labels,
        datasets: Object.keys(split).map(function (k) {
          return {
            label: split[k],
            data: daily.map(function (d) { return (d.tokens * tt[k]) / grand }),
            stack: "tokens",
            backgroundColor: tokenColors[k],
            borderWidth: 0,
          }
        }),
      },
      options: {
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: "index" },
        plugins: { legend: { position: "bottom", labels: { boxWidth: 10, boxHeight: 10 } } },
        scales: { x: { stacked: true, ticks: { maxTicksLimit: 10 } }, y: { stacked: true, ticks: { callback: tokens }, beginAtZero: true } },
      },
    })
  }

  var modelsEl = document.getElementById("models-chart")
  if (modelsEl) {
    var modelCost = data.models.reduce(function (s, m) { return s + m.cost }, 0)
    var useCost = modelCost > 0
    new Chart(modelsEl, {
      type: "doughnut",
      data: {
        labels: data.models.map(function (m) { return m.model }),
        datasets: [{
          data: data.models.map(function (m) { return useCost ? Math.max(m.cost, 1e-6) : m.tokens }),
          backgroundColor: data.models.map(function (_, i) { return MODEL_COLORS[i % MODEL_COLORS.length] }),
          borderColor: C.panel, borderWidth: 2,
        }],
      },
      options: {
        maintainAspectRatio: false,
        cutout: "62%",
        plugins: {
          legend: { position: "right", labels: { boxWidth: 10, boxHeight: 10, font: { size: 11 } } },
          tooltip: { callbacks: { label: function (ctx) { return ctx.label + " — " + (useCost ? money(ctx.parsed) : tokens(ctx.parsed) + " tokens") } } },
        },
      },
    })
  }

  var toolsEl = document.getElementById("tools-chart")
  if (toolsEl) {
    var top = data.tools.slice(0, 10)
    new Chart(toolsEl, {
      type: "bar",
      data: {
        labels: top.map(function (t) { return t.tool }),
        datasets: [{ data: top.map(function (t) { return t.count }), backgroundColor: C.violet, borderRadius: 4 }],
      },
      options: {
        indexAxis: "y",
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true, ticks: { precision: 0 } } },
      },
    })
  }

  var body = document.getElementById("sessions-body")
  if (body) {
    data.topSessions.forEach(function (s) {
      var tr = document.createElement("tr")
      function cell(text, cls) {
        var td = document.createElement("td")
        if (cls) td.className = cls
        td.textContent = text == null ? "" : String(text)
        td.title = text == null ? "" : String(text)
        return td
      }
      tr.appendChild(cell(s.title || s.id, ""))
      tr.appendChild(cell(money(s.cost), "num cost"))
      tr.appendChild(cell(tokens(s.tokens), "num"))
      tr.appendChild(cell(new Date(s.updated).toLocaleDateString(undefined, { month: "short", day: "numeric" }), "num muted"))
      tr.appendChild(cell((s.directory || "").split(/[\\\\/]/).pop() || s.directory || "—", "muted"))
      body.appendChild(tr)
    })
  }
})();
</script>
</body>
</html>`
}
