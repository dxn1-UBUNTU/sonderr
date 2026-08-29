import type { Plugin } from "@sonderr/plugin"
import { authenticateWithDeviceAuthTUI } from "./auth/device-auth-tui.js"

/**
 * Sonderr Gateway Authentication Plugin
 *
 * Provides device authorization flow for Sonderr Gateway
 * to integrate with Sonderr's auth system.
 *
 * This version uses the TUI-compatible flow that works with both CLI and TUI contexts.
 */
export const SonderrAuthPlugin: Plugin = async (ctx) => {
  return {
    auth: {
      provider: "sonderr",
      async loader(getAuth, providerInfo) {
        // Get the stored auth
        const auth = await getAuth()
        if (!auth) return {}

        // For API auth, the key is the token directly
        if (auth.type === "api") {
          return {
            sonderrToken: auth.key,
          }
        }

        // For OAuth auth, access token contains the Sonderr token
        // The accountId field is in Sonderr's Auth type but not exposed to SDK
        // so we access it as a property on the auth object
        if (auth.type === "oauth") {
          const result: Record<string, string> = {
            sonderrToken: auth.access,
          }
          // accountId is present in Sonderr's OAuth schema but not in SDK's
          const maybeAccountId = (auth as any).accountId
          if (maybeAccountId) {
            result.sonderrOrganizationId = maybeAccountId
          }
          return result
        }

        return {}
      },
      methods: [
        {
          type: "oauth",
          label: "Sonderr Gateway (Device Authorization)",
          async authorize() {
            // Use the TUI-compatible version that returns immediately
            // This works with both TUI dialogs and Web UI
            return await authenticateWithDeviceAuthTUI()
          },
        },
      ],
    },
  }
}

export default SonderrAuthPlugin
