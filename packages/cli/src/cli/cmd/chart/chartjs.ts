import { existsSync, readFileSync } from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"

/**
 * Resolve the chart.js UMD bundle from the CLI's own dependency so generated
 * dashboards are fully self-contained and work offline. Falls back to
 * undefined (the HTML then loads Chart.js from a CDN and degrades gracefully
 * if that fails too).
 */
let cached: string | undefined | null = null

export function readChartJsUmd(): string | undefined {
  if (cached !== null) return cached
  cached = (() => {
    try {
      const req = createRequire(import.meta.url)
      const pkg = req.resolve("chart.js/package.json")
      const dir = path.dirname(pkg)
      for (const file of ["dist/chart.umd.min.js", "dist/chart.umd.js"]) {
        const full = path.join(dir, file)
        if (existsSync(full)) return readFileSync(full, "utf8")
      }
    } catch {
      // not installed / not resolvable — CDN fallback in the generated HTML
    }
    return undefined
  })()
  return cached
}
