export const dict = {
  "sonderr:autocomplete.statusBar.enabled": "$(sonderr-logo) オートコンプリート",
  "sonderr:autocomplete.statusBar.snoozed": "一時停止中",
  "sonderr:autocomplete.statusBar.warning": "$(warning) オートコンプリート",
  "sonderr:autocomplete.statusBar.tooltip.basic": "Sonderr オートコンプリート",
  "sonderr:autocomplete.statusBar.tooltip.noUsableProvider":
    "**オートコンプリートモデルが設定されていません**\n\nオートコンプリートを有効にするには、次の対応プロバイダーのいずれかを含むプロファイルを追加してください: {{providers}}。\n\n[設定を開く]({{command}})",
  "sonderr:autocomplete.statusBar.tooltip.completionSummary":
    "{{startTime}} から {{endTime}} までに {{count}} 件の補完を実行し、合計コストは {{cost}} でした。",
  "sonderr:autocomplete.statusBar.tooltip.providerInfo":
    "オートコンプリートは {{provider}} 経由の {{model}} によって提供されています。",
  "sonderr:autocomplete.statusBar.cost.zero": "$0.00",
  "sonderr:autocomplete.statusBar.cost.lessThanCent": "<$0.01",
  "sonderr:autocomplete.codeAction.title": "Sonderr: 提案された編集",
  "sonderr:autocomplete.incompatibilityExtensionPopup.message":
    "Sonderr オートコンプリートは GitHub Copilot との競合によりブロックされています。修正するには、Copilot のインライン提案を無効にする必要があります。",
  "sonderr:autocomplete.incompatibilityExtensionPopup.disableCopilot": "Copilot を無効化",
  "sonderr:autocomplete.incompatibilityExtensionPopup.disableInlineAssist": "オートコンプリートを無効化",
  "sonderr:autocomplete.creditsExhausted.message":
    "Sonderr オートコンプリートは一時停止されました。考えられる原因: Sonderr アカウントに残りクレジットがない、または設定済みの API キー (BYOK) がクォータ上限に達しています。オートコンプリートを再開するには、Sonderr クレジットを追加するか API キー設定を確認してください。",
  "sonderr:autocomplete.creditsExhausted.addCredits": "クレジットを追加",
  "sonderr:autocomplete.authError.message":
    "Sonderr オートコンプリートは認証の問題により一時停止されました。考えられる原因: Sonderr にサインインしていない、または API キー (BYOK) が無効または不足しています。再度サインインするか、プロバイダーの API キー設定を確認してください。",
}
