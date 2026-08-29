import type { NamedError } from "@sonderr/core/util/error"
import { isRecord } from "@/util/record"

export const SONDERR_ERROR_CODES = {
  PAID_MODEL_AUTH_REQUIRED: "PAID_MODEL_AUTH_REQUIRED",
  PROMOTION_MODEL_LIMIT_REACHED: "PROMOTION_MODEL_LIMIT_REACHED",
} as const

export type SonderrErrorCode = (typeof SONDERR_ERROR_CODES)[keyof typeof SONDERR_ERROR_CODES]

const SONDERR_ERROR_CODE_VALUES = Object.values(SONDERR_ERROR_CODES) as string[]

/**
 * Check if an error is a Sonderr-specific error (has a known Sonderr error code in responseBody).
 * Currently all Sonderr errors are non-retryable, but this may change in the future.
 */
export function isSonderrError(error: ReturnType<NamedError["toObject"]>): boolean {
  return parseSonderrErrorCode(error) !== undefined
}

/**
 * Get a user-friendly title for a Sonderr error code.
 */
export function sonderrErrorTitle(code: SonderrErrorCode): string {
  switch (code) {
    case SONDERR_ERROR_CODES.PAID_MODEL_AUTH_REQUIRED:
      return "You need to sign in to use this model"
    case SONDERR_ERROR_CODES.PROMOTION_MODEL_LIMIT_REACHED:
      return "You need to sign up to keep going"
  }
}

/**
 * Get a user-friendly description for a Sonderr error code.
 */
export function sonderrErrorDescription(code: SonderrErrorCode): string {
  switch (code) {
    case SONDERR_ERROR_CODES.PAID_MODEL_AUTH_REQUIRED:
      return "Sign in or create an account to access over 500 models, use credits at cost, or bring your own key."
    case SONDERR_ERROR_CODES.PROMOTION_MODEL_LIMIT_REACHED:
      return "Sign up for free to continue and explore 500 other models. Takes 2 minutes, no credit card required. Or come back later."
  }
}

/**
 * Show a warning toast with the appropriate Sonderr error title/description.
 * Caller should check isSonderrError() first.
 */
export function showSonderrErrorToast(
  error: ReturnType<NamedError["toObject"]>,
  toast: { show: (opts: { variant: "warning"; title: string; message: string; duration: number }) => void },
): void {
  const code = parseSonderrErrorCode(error)
  if (!code) return
  toast.show({
    variant: "warning",
    title: sonderrErrorTitle(code),
    message: sonderrErrorDescription(code),
    duration: 5000,
  })
}

/**
 * Extract the specific Sonderr error code from an APIError's responseBody.
 * Returns the code string if found, undefined otherwise.
 *
 * Note: We check error.name === "APIError" directly instead of using
 * MessageV2.APIError.isInstance() to avoid a circular dependency
 * (message-v2.ts re-exports from this file).
 */
export function parseSonderrErrorCode(error: ReturnType<NamedError["toObject"]>): SonderrErrorCode | undefined {
  if (error.name !== "APIError") return undefined
  const responseBody = isRecord(error.data) ? error.data.responseBody : undefined
  if (typeof responseBody !== "string") return undefined
  try {
    const body = JSON.parse(responseBody)
    // Backend sends: { error: { code: "PAID_MODEL_AUTH_REQUIRED" } }
    // or: { code: "PROMOTION_MODEL_LIMIT_REACHED" }
    const code = body?.error?.code ?? body?.code
    if (typeof code === "string" && SONDERR_ERROR_CODE_VALUES.includes(code)) {
      return code as SonderrErrorCode
    }
  } catch {}
  return undefined
}
