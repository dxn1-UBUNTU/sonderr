import path from "path"

process.env.SONDERR_DB = ":memory:"
process.env.SONDERR_MODELS_PATH = path.join(import.meta.dir, "plugin", "fixtures", "models-dev.json")
process.env.SONDERR_DISABLE_MODELS_FETCH = "true"

// sonderr_change start - fail closed: core unit tests do not redirect XDG dirs, so SONDERR_DB
// is the only thing keeping them off the real ~/.local/share/sonderr database. Verify the
// resolved path (env is read at flag import time, so this must stay after the env writes).
const { Database } = await import("../src/database/database")
const resolved = Database.path()
if (resolved !== ":memory:") {
  throw new Error(`unit test preload: database path must resolve to ":memory:", got "${resolved}"`)
}
// sonderr_change end
