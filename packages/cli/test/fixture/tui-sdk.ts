import type { GlobalEvent } from "@sonderr/sdk/v2"
import type { EventSource } from "@sonderr/tui/context/sdk"

export const worktree = "/tmp/sonderr"
export const directory = `${worktree}/packages/cli`

export function json(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  })
}

export function eventSource(): EventSource {
  return { subscribe: async () => () => {} }
}

export function createEventSource() {
  let fn: ((event: GlobalEvent) => void) | undefined

  return {
    source: {
      subscribe: async (handler: (event: GlobalEvent) => void) => {
        fn = handler
        return () => {
          if (fn === handler) fn = undefined
        }
      },
    } satisfies EventSource,
    emit(event: GlobalEvent) {
      if (!fn) throw new Error("event source not ready")
      fn(event)
    },
  }
}

export type FetchHandler = (url: URL) => Response | Promise<Response> | undefined

export function createFetch(override?: FetchHandler) {
  const session = [] as URL[]
  const fetch = (async (input: RequestInfo | URL) => {
    const url = new URL(input instanceof Request ? input.url : String(input))
    if (url.pathname === "/session") session.push(url)

    const overridden = await override?.(url)
    if (overridden) return overridden

    switch (url.pathname) {
      case "/agent":
      case "/command":
      // case "/experimental/workspace": // sonderr_change
      case "/experimental/workspace/status":
      case "/formatter":
      case "/lsp":
      case "/network": // sonderr_change
      case "/background-process": // sonderr_change
        return json([])
      case "/config":
      case "/experimental/resource":
      case "/global/config": // sonderr_change
      case "/mcp":
      case "/provider/auth":
      case "/session/status":
        return json({})
      case "/config/providers":
        return json({ providers: {}, default: {} })
      case "/experimental/console":
        return json({ consoleManagedProviders: [], switchableOrgCount: 0 })
      case "/path":
        return json({ home: "", state: "", config: "", worktree, directory })
      case "/project/current":
        return json({ id: "proj_test", worktree: "/tmp/project-root" }) // sonderr_change
      case "/provider":
        return json({ all: [], default: {}, connected: [] })
      // sonderr_change start
      case "/experimental/workspace":
        return json([
          { id: "ws_a", type: "local", branch: "a", name: "a", directory: "/tmp/a", projectID: "proj_test" },
          { id: "ws_b", type: "local", branch: "b", name: "b", directory: "/tmp/b", projectID: "proj_test" },
        ])
      // sonderr_change end
      // sonderr_change start
      case "/indexing/status":
        return json({ state: "Disabled", message: "Indexing disabled.", processedFiles: 0, totalFiles: 0, percent: 0 })
      // sonderr_change end
      case "/session":
        return json([])
      case "/vcs":
        return json({ branch: "main" })
    }

    throw new Error(`unexpected request: ${url.pathname}`)
  }) as typeof globalThis.fetch

  return { fetch, session }
}
