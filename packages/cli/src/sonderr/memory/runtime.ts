import { Global } from "@sonderr/core/global"
import * as Log from "@sonderr/core/util/log"
import { MemoryInstance } from "@sonderr/sonderr-memory/effect/instance"
import { MemoryLog } from "@sonderr/sonderr-memory/effect/log"
import { MemoryPaths } from "@sonderr/sonderr-memory/effect/paths"
import { bind } from "@/sonderr/instance"
import { MemoryEvents } from "./events"

const log = Log.create({ service: "memory" })

let installed = false

/** Wire the package's injectable seams to sonderr at process startup: the instance-context binder
 * (so async package calls survive the host ALS), the diagnostic logger, host paths (resolved from
 * Global), and the Bus-backed event sink. Idempotent. */
export function installMemoryRuntime() {
  if (installed) return
  installed = true
  MemoryPaths.configure(() => ({ data: Global.Path.data }))
  MemoryInstance.setBinder((fn) => bind(fn))
  MemoryLog.setWarn((message, meta) => log.warn(message, meta))
  MemoryEvents.install()
}
