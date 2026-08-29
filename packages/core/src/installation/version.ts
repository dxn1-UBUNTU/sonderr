declare global {
  const SONDERR_VERSION: string
  const SONDERR_CHANNEL: string
  const SONDERR_BUILD_KIND: string // sonderr_change
}

export const InstallationVersion = typeof SONDERR_VERSION === "string" ? SONDERR_VERSION : "local"
export const InstallationChannel = typeof SONDERR_CHANNEL === "string" ? SONDERR_CHANNEL : "local"
export const InstallationLocal = InstallationChannel === "local"
// sonderr_change start - distinguish release builds from source / local builds
export const InstallationBuildKind: "source" | "release" =
  typeof SONDERR_BUILD_KIND === "string" && SONDERR_BUILD_KIND === "release" ? "release" : "source"
// sonderr_change end
