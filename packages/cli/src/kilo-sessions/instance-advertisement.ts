// sonderr_change - new file
// Shared derivation for the spawn-capable instance advertisement payload.
// Used by both `sonderr remote` (explicit CLI) and `enableRemote()` (covers `/remote`
// and SONDERR_REMOTE / remote_control auto-enable) so all enable paths advertise
// identically.
import { InstallationVersion } from "@sonderr/core/installation/version"
import os from "node:os"
import path from "node:path"
import type { RemoteProtocol } from "@/sonderr-sessions/remote-protocol"

function truncate(value: string, max: number) {
  return value.length > max ? value.slice(0, max) : value
}

export function buildInstanceAdvertisement(directory: string): RemoteProtocol.InstanceAdvertisement {
  return {
    name: truncate(os.hostname(), 64),
    projectName: truncate(path.basename(directory) || directory, 64),
    version: truncate(InstallationVersion, 32),
  }
}
