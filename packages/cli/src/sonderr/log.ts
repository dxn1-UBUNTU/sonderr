import * as Log from "@sonderr/core/util/log"
import { InstallationBuildKind } from "@sonderr/core/installation/version"

export namespace SonderrLog {
  export function init() {
    const value = process.env.SONDERR_LOG_LEVEL?.toUpperCase()
    const level: Log.Level =
      value === "DEBUG" || value === "INFO" || value === "WARN" || value === "ERROR"
        ? value
        : InstallationBuildKind === "release"
          ? "INFO"
          : "DEBUG"
    return Log.init({
      print: process.env.SONDERR_PRINT_LOGS === "1",
      dev: InstallationBuildKind !== "release",
      level,
    })
  }
}
