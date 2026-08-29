import * as path from "path"
import * as os from "os"

/**
 * Global config dir: ~/.config/sonderr/ (XDG_CONFIG_HOME/sonderr)
 * This matches where the CLI reads global config from.
 */
function globalConfigDir(): string {
  const xdg = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config")
  return path.join(xdg, "sonderr")
}

export class MarketplacePaths {
  /** Project-scope config file: <workspace>/.sonderr/sonderr.json */
  configPath(scope: "project" | "global", workspace?: string): string {
    if (scope === "project") return path.join(workspace!, ".sonderr", "sonderr.json")
    return path.join(globalConfigDir(), "sonderr.json")
  }

  /** Agent install directory (where marketplace agents are written as .md files). */
  agentsDir(scope: "project" | "global", workspace?: string): string {
    if (scope === "project") return path.join(workspace!, ".sonderr", "agents")
    return path.join(globalConfigDir(), "agents")
  }

  /** Skill install directory (where the marketplace installer writes to). */
  skillsDir(scope: "project" | "global", workspace?: string): string {
    if (scope === "project") return path.join(workspace!, ".sonderr", "skills")
    return path.join(os.homedir(), ".sonderr", "skills")
  }
}
