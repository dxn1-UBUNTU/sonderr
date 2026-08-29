/**
 * Legacy Sonderr CLI migration module
 *
 * Migrates authentication from the legacy Sonderr VS Code extension CLI
 * config path (~/.sonderr/cli/config.json) to the new auth.json format.
 */
import fs from "fs/promises"
import os from "os"
import path from "path"

export const LEGACY_CONFIG_PATH = path.join(os.homedir(), ".sonderr", "cli", "config.json")

interface LegacyProvider {
  id: string
  provider: string
  sonderrToken?: string
  sonderrModel?: string
  sonderrOrganizationId?: string
}

interface LegacyConfig {
  providers?: LegacyProvider[]
}

interface LegacySonderrAuth {
  token: string
  organizationId?: string
}

// Auth info types matching sonderr's Auth module
type ApiAuth = { type: "api"; key: string }
type OAuthAuth = { type: "oauth"; access: string; refresh: string; expires: number; accountId?: string }
type AuthInfo = ApiAuth | OAuthAuth

/**
 * Extract sonderr auth from legacy config
 */
function extractSonderrAuth(config: LegacyConfig): LegacySonderrAuth | undefined {
  if (!config.providers) return undefined

  const provider = config.providers.find((p) => p.provider === "sonderr")
  if (!provider?.sonderrToken) return undefined

  return {
    token: provider.sonderrToken,
    organizationId: provider.sonderrOrganizationId,
  }
}

/**
 * Migrate Sonderr authentication from legacy CLI config path.
 *
 * Checks ~/.sonderr/cli/config.json for existing sonderr credentials
 * and migrates them to the new auth.json format.
 *
 * @param hasSonderrAuth - Callback to check if sonderr auth already exists
 * @param saveSonderrAuth - Callback to save the migrated auth
 * @returns true if migration was performed, false otherwise
 */
export async function migrateLegacySonderrAuth(
  hasSonderrAuth: () => Promise<boolean>,
  saveSonderrAuth: (auth: AuthInfo) => Promise<void>,
): Promise<boolean> {
  // Skip if sonderr auth already configured
  if (await hasSonderrAuth()) return false

  // Check if legacy config exists and parse it
  const content = await fs.readFile(LEGACY_CONFIG_PATH, "utf-8").catch(() => null)
  if (!content) return false

  let config: LegacyConfig | null = null
  try {
    config = JSON.parse(content) as LegacyConfig
  } catch {
    return false
  }

  // Extract sonderr auth from legacy config
  const legacy = extractSonderrAuth(config)
  if (!legacy) return false

  // Migrate to new format
  // Use OAuth format if organization ID present, otherwise API format
  if (legacy.organizationId) {
    await saveSonderrAuth({
      type: "oauth",
      access: legacy.token,
      refresh: "",
      expires: 0,
      accountId: legacy.organizationId,
    })
  } else {
    await saveSonderrAuth({
      type: "api",
      key: legacy.token,
    })
  }

  return true
}
