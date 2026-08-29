export const dict = {
  "sonderr:autocomplete.statusBar.enabled": "$(sonderr-logo) 自動完成",
  "sonderr:autocomplete.statusBar.snoozed": "已暫停",
  "sonderr:autocomplete.statusBar.warning": "$(warning) 自動完成",
  "sonderr:autocomplete.statusBar.tooltip.basic": "Sonderr 自動完成",
  "sonderr:autocomplete.statusBar.tooltip.noUsableProvider":
    "**尚未設定自動完成模型**\n\n若要啟用自動完成，請新增包含下列其中一個支援提供者的設定檔：{{providers}}。\n\n[開啟設定]({{command}})",
  "sonderr:autocomplete.statusBar.tooltip.completionSummary":
    "在 {{startTime}} 到 {{endTime}} 之間執行了 {{count}} 次完成，總成本為 {{cost}}。",
  "sonderr:autocomplete.statusBar.tooltip.providerInfo": "自動完成由 {{provider}} 透過 {{model}} 提供。",
  "sonderr:autocomplete.statusBar.cost.zero": "$0.00",
  "sonderr:autocomplete.statusBar.cost.lessThanCent": "<$0.01",
  "sonderr:autocomplete.codeAction.title": "Sonderr：建議的編輯",
  "sonderr:autocomplete.incompatibilityExtensionPopup.message":
    "Sonderr 自動完成因與 GitHub Copilot 衝突而被封鎖。若要修正此問題，必須停用 Copilot 的內嵌建議。",
  "sonderr:autocomplete.incompatibilityExtensionPopup.disableCopilot": "停用 Copilot",
  "sonderr:autocomplete.incompatibilityExtensionPopup.disableInlineAssist": "停用自動完成",
  "sonderr:autocomplete.creditsExhausted.message":
    "Sonderr 自動完成已暫停。可能原因：你的 Sonderr 帳戶沒有剩餘額度，或你設定的 API 金鑰（BYOK）已達到配額限制。請新增 Sonderr 額度或檢查 API 金鑰設定以恢復自動完成。",
  "sonderr:autocomplete.creditsExhausted.addCredits": "新增額度",
  "sonderr:autocomplete.authError.message":
    "Sonderr 自動完成因驗證問題已暫停。可能原因：你尚未登入 Sonderr，或你的 API 金鑰（BYOK）無效或遺失。請重新登入或檢查提供者 API 金鑰設定。",
}
