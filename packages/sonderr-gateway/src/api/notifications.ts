import { z } from "zod"
import { SONDERR_API_BASE } from "./constants.js"
import { getDefaultHeaders, buildSonderrHeaders } from "../headers.js"

/**
 * Sonderr notification schema
 */
export const SonderrNotificationSchema = z.object({
  id: z.string(),
  title: z.string(),
  message: z.string(),
  action: z
    .object({
      actionText: z.string(),
      actionURL: z.string(),
    })
    .optional(),
  showIn: z.array(z.string()).optional(),
  suggestModelId: z.string().optional(),
})

export type SonderrNotification = z.infer<typeof SonderrNotificationSchema>

const NotificationsResponseSchema = z.object({
  notifications: z.array(SonderrNotificationSchema),
})

const NOTIFICATIONS_TIMEOUT_MS = 5000

/**
 * Fetch notifications from Sonderr API
 *
 * @param options - Configuration with token and optional organization ID
 * @returns Array of notifications from the Sonderr API (clients filter by showIn)
 */
export async function fetchSonderrNotifications(options: {
  sonderrToken?: string
  sonderrOrganizationId?: string
}): Promise<SonderrNotification[]> {
  const token = options.sonderrToken
  if (!token) return []

  const url = `${SONDERR_API_BASE}/api/users/notifications`

  try {
    const response = await fetch(url, {
      headers: {
        ...getDefaultHeaders(),
        ...buildSonderrHeaders(undefined, { sonderrOrganizationId: options.sonderrOrganizationId }),
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(NOTIFICATIONS_TIMEOUT_MS),
    })

    if (!response.ok) return []

    const json = await response.json()
    const result = NotificationsResponseSchema.safeParse(json)

    if (!result.success) return []

    return result.data.notifications
  } catch {
    return []
  }
}
