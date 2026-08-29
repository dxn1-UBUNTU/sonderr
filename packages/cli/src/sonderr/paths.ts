import * as path from "path"
import os from "os"
import { Filesystem } from "../util/filesystem"

export namespace SonderrPaths {
  const home = () => process.env.HOME || process.env.USERPROFILE || os.homedir()

  /**
   * Get the platform-specific VSCode global storage path for Sonderr extension.
   * - macOS: ~/Library/Application Support/Code/User/globalStorage/sonderr.sonderr-code
   * - Windows: %APPDATA%/Code/User/globalStorage/sonderr.sonderr-code
   * - Linux: ~/.config/Code/User/globalStorage/sonderr.sonderr-code
   */
  export function vscodeGlobalStorage(): string {
    const home = os.homedir()
    switch (process.platform) {
      case "darwin":
        return path.join(home, "Library", "Application Support", "Code", "User", "globalStorage", "sonderr.sonderr-code")
      case "win32":
        return path.join(
          process.env.APPDATA || path.join(home, "AppData", "Roaming"),
          "Code",
          "User",
          "globalStorage",
          "sonderr.sonderr-code",
        )
      default:
        return path.join(home, ".config", "Code", "User", "globalStorage", "sonderr.sonderr-code")
    }
  }

  /** Global Sonderr directories in user home: ~/.sonderr and ~/.sonderr (legacy first, .sonderr wins later) */
  export function globalDirs(): string[] {
    return [path.join(home(), ".sonderr"), path.join(home(), ".sonderr")]
  }

  /**
   * Discover Sonderr directories containing skills.
   * Returns parent directories (.sonderr/ and .sonderr/) for glob pattern "skills/[*]/SKILL.md".
   *
   * - Walks up from projectDir to worktreeRoot for .sonderr/ and .sonderr/
   * - Includes global ~/.sonderr/ and ~/.sonderr/
   * - Includes VSCode extension global storage
   *
   * Does NOT copy/migrate skills - just provides paths for discovery.
   * Skills remain in their original locations and can be managed independently
   * by the Sonderr VSCode extension.
   */
  export async function skillDirectories(opts: {
    projectDir: string
    worktreeRoot: string
    skipGlobalPaths?: boolean
  }): Promise<string[]> {
    const directories: string[] = []

    if (!opts.skipGlobalPaths) {
      // 1. Global ~/.sonderr/ and ~/.sonderr/ (loaded first so project-level overrides)
      for (const global of globalDirs()) {
        const globalSkills = path.join(global, "skills")
        if (!(await Filesystem.isDir(globalSkills))) continue
        directories.push(global) // Return parent, not skills/
      }

      // 2. VSCode extension global storage (marketplace-installed skills)
      const vscode = vscodeGlobalStorage()
      const vscodeSkills = path.join(vscode, "skills")
      if (await Filesystem.isDir(vscodeSkills)) {
        directories.push(vscode) // Return parent, not skills/
      }
    }

    // 3. Walk up from project dir to worktree root for .sonderr/ and .sonderr/
    // Returns parent directories (not skills/) because
    // the glob pattern "skills/[*]/SKILL.md" is applied from the parent
    // Loaded last so project-level skills take precedence over global
    for (const target of [".sonderr", ".sonderr"] as const) {
      const projectDirs = await Array.fromAsync(
        Filesystem.up({
          targets: [target],
          start: opts.projectDir,
          stop: opts.worktreeRoot,
        }),
      )
      for (const dir of projectDirs) {
        const skillsDir = path.join(dir, "skills")
        if ((await Filesystem.isDir(skillsDir)) && !directories.includes(dir)) {
          directories.push(dir)
        }
      }
    }

    return directories
  }
}
