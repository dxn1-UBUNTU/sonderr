/** @jsxImportSource @opentui/solid */
/**
 * Sonderr-specific overrides for the provider dialog.
 *
 * Exports constants and renderers consumed by the shared upstream
 * `dialog-provider.tsx` so the upstream diff stays minimal.
 */

import type { JSX } from "solid-js"
import type { RGBA } from "@opentui/core"
import type { ProviderAuthAuthorization } from "@sonderr/sdk/v2"
import { SonderrAutoMethod } from "@/sonderr/components/dialog-sonderr-auto-method"
export { selectProvider } from "@/sonderr/anaconda-desktop/tui/setup"

// ---------------------------------------------------------------------------
// Failed-state gutter/description helpers
// ---------------------------------------------------------------------------

/**
 * Returns a red `!` gutter element when the provider is in a failed auth state,
 * or `undefined` if not failed and not connected (falls through to default check).
 */
export function renderGutter(
  providerID: string,
  failed: string[],
  theme: { error: RGBA },
): (() => JSX.Element) | undefined {
  if (!failed.includes(providerID)) return undefined
  return () => <text fg={theme.error}>!</text>
}

/**
 * Returns a description suffix when the provider has encountered an error,
 * or `undefined` to leave the default description unchanged.
 *
 * NOTE: The sync state only carries failed provider IDs, not the error kind.
 * A generic message is used so it remains accurate for auth, network, and
 * schema failure types alike.
 */
export function failedDescription(providerID: string, failed: string[]): string | undefined {
  if (!failed.includes(providerID)) return undefined
  return "(connection error — click to reconnect)"
}

// ---------------------------------------------------------------------------
// Provider priority (replaces upstream map entirely)
// ---------------------------------------------------------------------------

export const PROVIDER_PRIORITY: Record<string, number> = {
  anthropic: 0,
  openai: 1,
  google: 2,
  "github-copilot": 3,
  groq: 4,
  mistral: 5,
  cohere: 6,
  xai: 7,
  deepseek: 8,
  openrouter: 9,
  together: 10,
  perplexity: 11,
  nvidia: 12,
  azure: 13,
  bedrock: 14,
  vertex: 15,
  "anaconda-desktop": 16,
}

// ---------------------------------------------------------------------------
// Provider descriptions shown next to the name in the selection list
// ---------------------------------------------------------------------------

export const PROVIDER_DESCRIPTIONS: Record<string, string> = {
  anthropic: "(Claude Sonnet/Opus — API key or Claude Pro)",
  openai: "(GPT-4o, o-series — API key or ChatGPT)",
  google: "(Gemini 2.5 Pro/Flash — API key)",
  "github-copilot": "(GitHub Copilot — GitHub login)",
  "anaconda-desktop": "(Local models — runs on your machine)",
  groq: "(Llama, Mixtral — fast inference)",
  mistral: "(Mistral Large — API key)",
  cohere: "(Command R — API key)",
  xai: "(Grok — API key)",
  openrouter: "(Multi-provider — API key)",
  together: "(Llama, Mistral — API key)",
  deepseek: "(DeepSeek — API key)",
  perplexity: "(Sonar — API key)",
  nvidia: "(Nemotron — API key)",
  azure: "(Azure OpenAI — API key)",
  bedrock: "(AWS models — IAM auth)",
  vertex: "(Google Cloud — IAM auth)",
}

export const PROVIDER_TITLES: Record<string, string> = {
  openai: "OpenAI / Codex",
}

/** Local OpenAI-compatible providers where API key is optional (localhost). */
export const LOCAL_OPTIONAL_API_KEY = new Set(["atomic-chat", "lmstudio"])

export function isLocalOptionalApiKey(providerID: string) {
  return LOCAL_OPTIONAL_API_KEY.has(providerID)
}

export const LOCAL_API_KEY_PLACEHOLDER = "local"

// ---------------------------------------------------------------------------
// Auto-method renderer
// ---------------------------------------------------------------------------

/**
 * If the provider is Sonderr Gateway, renders the custom `SonderrAutoMethod`
 * component that handles device-auth + org selection.
 *
 * Returns `undefined` for every other provider so the caller can fall
 * through to the default `AutoMethod`.
 */
export function renderAutoMethod(opts: {
  providerID: string
  title: string
  index: number
  authorization: ProviderAuthAuthorization
  useSDK: () => any
  useTheme: () => any
  DialogModel: any
}): (() => JSX.Element) | undefined {
  if (opts.providerID !== "sonderr") return undefined
  return () => (
    <SonderrAutoMethod
      providerID={opts.providerID}
      title={opts.title}
      index={opts.index}
      authorization={opts.authorization}
      useSDK={opts.useSDK}
      useTheme={opts.useTheme}
      DialogModel={opts.DialogModel}
    />
  )
}

// ---------------------------------------------------------------------------
// API-key dialog description
// ---------------------------------------------------------------------------

/**
 * Returns a custom description element for the API-key dialog when the
 * provider is Sonderr Gateway. Returns `undefined` otherwise.
 */
export function renderApiDescription(
  providerID: string,
  theme: { textMuted: RGBA; text: RGBA; primary: RGBA },
): (() => JSX.Element) | undefined {
  if (providerID === "atomic-chat") {
    return () => (
      <text fg={theme.textMuted}>
        Connect to Atomic Chat on this machine (default http://127.0.0.1:1337). Leave API key empty for local server.
      </text>
    )
  }
  if (providerID !== "sonderr") return undefined
  return () => (
    <box gap={1}>
      <text fg={theme.textMuted}>
        Sonderr Gateway gives you access to all the best coding models at the cheapest prices with a single API key.
      </text>
      <text fg={theme.text}>
        Go to <span style={{ fg: theme.primary }}>https://kilo.ai/gateway</span> to get a key
      </text>
    </box>
  )
}

export function apiKeyPlaceholder(providerID: string) {
  return isLocalOptionalApiKey(providerID) ? "Optional for localhost" : "API key"
}
