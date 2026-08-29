import { Flag } from "@sonderr/core/flag/flag"
import { Effect } from "effect"
import path from "path"

const preserveExerciseGlobalRoot = !!process.env.SONDERR_HTTPAPI_EXERCISE_GLOBAL
export const exerciseGlobalRoot =
  process.env.SONDERR_HTTPAPI_EXERCISE_GLOBAL ??
  path.join(process.env.TMPDIR ?? "/tmp", `sonderr-httpapi-global-${process.pid}`)
process.env.XDG_DATA_HOME = path.join(exerciseGlobalRoot, "data")
process.env.XDG_CONFIG_HOME = path.join(exerciseGlobalRoot, "config")
process.env.XDG_STATE_HOME = path.join(exerciseGlobalRoot, "state")
process.env.XDG_CACHE_HOME = path.join(exerciseGlobalRoot, "cache")
process.env.SONDERR_DISABLE_SHARE = "true"
process.env.SONDERR_DISABLE_SESSION_INGEST = "true" // sonderr_change - isolate the exerciser from async Sonderr session sync
process.env.SONDERR_DISABLE_PRESENCE = "1" // sonderr_change - presence now has a default Event Service URL; never open real sockets from the exerciser
process.env.SONDERR_DISABLE_CODEBASE_INDEXING = "vscode-no-workspace" // sonderr_change - route scenarios do not need an indexing worker per temp project
export const exerciseConfigDirectory = path.join(exerciseGlobalRoot, "config", "sonderr")
export const exerciseDataDirectory = path.join(exerciseGlobalRoot, "data", "sonderr") // sonderr_change

const preserveExerciseDatabase = !!process.env.SONDERR_HTTPAPI_EXERCISE_DB
export const exerciseDatabasePath =
  process.env.SONDERR_HTTPAPI_EXERCISE_DB ??
  path.join(process.env.TMPDIR ?? "/tmp", `sonderr-httpapi-exercise-${process.pid}.db`)
process.env.SONDERR_DB = exerciseDatabasePath
Flag.SONDERR_DB = exerciseDatabasePath

export const original = {
  SONDERR_SERVER_PASSWORD: Flag.SONDERR_SERVER_PASSWORD,
  SONDERR_SERVER_USERNAME: Flag.SONDERR_SERVER_USERNAME,
}

export const cleanupExercisePaths = Effect.promise(async () => {
  const fs = await import("fs/promises")
  if (!preserveExerciseDatabase) {
    await Promise.all(
      [exerciseDatabasePath, `${exerciseDatabasePath}-wal`, `${exerciseDatabasePath}-shm`].map((file) =>
        fs.rm(file, { force: true }).catch(() => undefined),
      ),
    )
  }
  if (!preserveExerciseGlobalRoot)
    await fs.rm(exerciseGlobalRoot, { recursive: true, force: true }).catch(() => undefined)
})
