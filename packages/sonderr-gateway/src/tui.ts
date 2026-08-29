/**
 * Sonderr Gateway TUI Integration
 *
 * This module provides TUI-specific functionality for sonderr-gateway.
 * It requires Sonderr TUI dependencies to be injected at runtime.
 *
 * Import from "@sonderr/sonderr-gateway/tui" for TUI features.
 */

// ============================================================================
// TUI Dependency Injection
// ============================================================================
export { initializeTUIDependencies, getTUIDependencies, areTUIDependenciesInitialized } from "./tui/context.js"
export type { TUIDependencies } from "./tui/types.js"

// ============================================================================
// TUI Helpers
// ============================================================================
export { formatProfileInfo, getOrganizationOptions, getDefaultOrganizationSelection } from "./tui/helpers.js"

// ============================================================================
// NOTE: TUI Components Moved to Sonderr
// ============================================================================
// All TUI components with JSX have been moved to packages/cli/src/sonderr/
// to ensure correct JSX transpilation with @opentui/solid.
//
// Components moved:
// - registerSonderrCommands -> @/sonderr/sonderr-commands
// - DialogSonderrTeamSelect -> @/sonderr/components/dialog-sonderr-team-select
// - DialogSonderrOrganization -> @/sonderr/components/dialog-sonderr-organization
// - DialogSonderrProfile -> @/sonderr/components/dialog-sonderr-profile
// - SonderrAutoMethod -> @/sonderr/components/dialog-sonderr-auto-method
// - SonderrNews -> @/sonderr/components/sonderr-news
// - NotificationBanner -> @/sonderr/components/notification-banner
// - DialogSonderrNotifications -> @/sonderr/components/dialog-sonderr-notifications
