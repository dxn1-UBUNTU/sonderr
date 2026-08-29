/**
 * Pure helpers for shaping the feedback telemetry payload.
 *
 * Payload rules:
 * - Non-Sonderr-Gateway providers: providerID, modelID, variant?, rating, previousRating? only.
 *   No session or message IDs — they can't be correlated to upstream data.
 * - Sonderr Gateway providers: add sessionID, messageID, parentMessageID. The
 *   gateway can join parentMessageID against its `x-sonderr-request` header logs.
 */

export type Rating = "up" | "down"

export interface RateInput {
  messageID: string
  sessionID: string
  parentMessageID: string
  providerID: string
  modelID: string
  variant?: string
  next: Rating | null
}

export function isSonderrGateway(providerID: string): boolean {
  return providerID === "sonderr"
}

export function buildFeedbackProperties(input: RateInput, previousRating?: Rating): Record<string, unknown> {
  const properties: Record<string, unknown> = {
    providerID: input.providerID,
    modelID: input.modelID,
    rating: input.next ?? "cleared",
  }
  if (input.variant) properties.variant = input.variant
  if (previousRating) properties.previousRating = previousRating
  if (isSonderrGateway(input.providerID)) {
    properties.sessionID = input.sessionID
    properties.messageID = input.messageID
    properties.parentMessageID = input.parentMessageID
  }
  return properties
}
