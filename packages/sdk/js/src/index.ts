export * from "./client.js"
export * from "./server.js"

import { createSonderrClient } from "./client.js"
import { createSonderrServer } from "./server.js"
import type { ServerOptions } from "./server.js"

export async function createSonderr(options?: ServerOptions) {
  const server = await createSonderrServer({
    ...options,
  })

  const client = createSonderrClient({
    baseUrl: server.url,
  })

  return {
    client,
    server,
  }
}
