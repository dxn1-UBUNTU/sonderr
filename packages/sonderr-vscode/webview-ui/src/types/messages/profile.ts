// Sonderr notification types (mirrored from sonderr-gateway)
export interface SonderrNotificationAction {
  actionText: string
  actionURL: string
}

export interface SonderrNotification {
  id: string
  title: string
  message: string
  action?: SonderrNotificationAction
  showIn?: string[]
  suggestModelId?: string
}

// Profile types from sonderr-gateway
export interface SonderrBalance {
  balance: number
}

export interface SonderrPassState {
  currentPeriodBaseCreditsUsd: number
  currentPeriodUsageUsd: number
  currentPeriodBonusCreditsUsd: number
  nextBillingAt?: string | null
}

export interface ProfileData {
  profile: {
    email: string
    name?: string
    organizations?: Array<{ id: string; name: string; role: string }>
    selectedOrganizationId?: string
    hasPersonalAccount?: boolean
  }
  balance: SonderrBalance | null
  sonderrPass: SonderrPassState | null
  currentOrgId: string | null
}
