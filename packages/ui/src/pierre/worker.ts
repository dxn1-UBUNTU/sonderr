import { WorkerPoolManager } from "@pierre/diffs/worker"
import ShikiWorkerUrl from "@pierre/diffs/worker/worker.js?worker&url"
import { ensureSonderrDiffTheme, SONDERR_DIFF_THEME } from "./sonderr-diff-theme" // sonderr_change

// sonderr_change start: register the "Sonderr" theme as a precondition of creating
// any diff worker pool. resolveThemes([theme]) runs on the main thread during
// initialize(); without the theme registered it throws "resolveTheme: No valid
// loader for Sonderr". Doing it here means every diff component (which imports this
// factory) is covered, instead of relying on the markdown context being imported.
ensureSonderrDiffTheme()
// sonderr_change end

export type WorkerPoolStyle = "unified" | "split"

export function workerFactory(): Worker {
  return new Worker(ShikiWorkerUrl, { type: "module" })
}

function createPool(lineDiffType: "none" | "word-alt") {
  const pool = new WorkerPoolManager(
    {
      workerFactory,
      // poolSize defaults to 8. More workers = more parallelism but
      // also more memory. Too many can actually slow things down.
      // NOTE: 2 is probably better for Sonderr, as I think 8 might be
      // a bit overkill, especially because Safari has a significantly slower
      // boot up time for workers
      poolSize: 2,
    },
    {
      theme: SONDERR_DIFF_THEME, // sonderr_change
      lineDiffType,
      preferredHighlighter: "shiki-wasm",
    },
  )

  void pool.initialize()
  return pool
}

let unified: WorkerPoolManager | undefined
let split: WorkerPoolManager | undefined

export function getWorkerPool(style: WorkerPoolStyle | undefined): WorkerPoolManager | undefined {
  if (typeof window === "undefined") return

  if (style === "split") {
    if (!split) split = createPool("word-alt")
    return split
  }

  if (!unified) unified = createPool("none")
  return unified
}

export function getWorkerPools() {
  return {
    unified: getWorkerPool("unified"),
    split: getWorkerPool("split"),
  }
}
