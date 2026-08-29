// English runtime translations for autocomplete (sonderr:autocomplete.* namespace)
// Source: src/i18n/locales/en/sonderr.json → "autocomplete" section

export const dict = {
  "sonderr:autocomplete.statusBar.enabled": "$(sonderr-logo) Autocomplete",
  "sonderr:autocomplete.statusBar.snoozed": "snoozed",
  "sonderr:autocomplete.statusBar.warning": "$(warning) Autocomplete",
  "sonderr:autocomplete.statusBar.tooltip.basic": "Sonderr Autocomplete",
  "sonderr:autocomplete.statusBar.tooltip.noUsableProvider":
    "**No autocomplete model configured**\n\nTo enable autocomplete, add a profile with one of these supported providers: {{providers}}.\n\n[Open Settings]({{command}})",
  "sonderr:autocomplete.statusBar.tooltip.completionSummary":
    "Performed {{count}} completions between {{startTime}} and {{endTime}}, for a total cost of {{cost}}.",
  "sonderr:autocomplete.statusBar.tooltip.providerInfo": "Autocompletions provided by {{model}} via {{provider}}.",
  "sonderr:autocomplete.statusBar.cost.zero": "$0.00",
  "sonderr:autocomplete.statusBar.cost.lessThanCent": "<$0.01",
  "sonderr:autocomplete.codeAction.title": "Sonderr: Suggested Edits",
  "sonderr:autocomplete.incompatibilityExtensionPopup.message":
    "The Sonderr Autocomplete is being blocked by a conflict with GitHub Copilot. To fix this, you must disable Copilot's inline suggestions.",
  "sonderr:autocomplete.incompatibilityExtensionPopup.disableCopilot": "Disable Copilot",
  "sonderr:autocomplete.incompatibilityExtensionPopup.disableInlineAssist": "Disable Autocomplete",
  "sonderr:autocomplete.creditsExhausted.message":
    "Sonderr Autocomplete has been paused. Possible causes: your Sonderr account has no remaining credits, or your configured API key (BYOK) has reached its quota limit. Add Sonderr credits or check your API key configuration to resume autocomplete.",
  "sonderr:autocomplete.creditsExhausted.addCredits": "Add Credits",
  "sonderr:autocomplete.authError.message":
    "Sonderr Autocomplete has been paused due to an authentication issue. Possible causes: you are not signed in to Sonderr, or your API key (BYOK) is invalid or missing. Please sign in again or check your provider API key settings.",
}
