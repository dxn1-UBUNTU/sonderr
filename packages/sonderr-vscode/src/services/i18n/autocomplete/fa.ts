// English runtime translations for autocomplete (sonderr:autocomplete.* namespace)
// Source: src/i18n/locales/en/sonderr.json → "autocomplete" section

export const dict = {
  "sonderr:autocomplete.statusBar.enabled": "$(sonderr-logo) تکمیل خودکار",
  "sonderr:autocomplete.statusBar.snoozed": "به تعویق افتاده",
  "sonderr:autocomplete.statusBar.warning": "$(warning) تکمیل خودکار",
  "sonderr:autocomplete.statusBar.tooltip.basic": "تکمیل خودکار Sonderr",
  "sonderr:autocomplete.statusBar.tooltip.noUsableProvider":
    "**هیچ مدل تکمیل خودکاری پیکربندی نشده است**\n\nبرای فعال‌سازی تکمیل خودکار، یک پروفایل با یکی از ارائه‌دهندگان پشتیبانی‌شده زیر اضافه کنید: {{providers}}.\n\n[باز کردن تنظیمات]({{command}})",
  "sonderr:autocomplete.statusBar.tooltip.completionSummary":
    "{{count}} تکمیل بین {{startTime}} و {{endTime}} انجام شد، با هزینه کل {{cost}}.",
  "sonderr:autocomplete.statusBar.tooltip.providerInfo":
    "تکمیل خودکار توسط {{model}} از طریق {{provider}} ارائه می‌شود.",
  "sonderr:autocomplete.statusBar.cost.zero": "۰.۰۰$",
  "sonderr:autocomplete.statusBar.cost.lessThanCent": "<۰.۰۱$",
  "sonderr:autocomplete.codeAction.title": "Sonderr: ویرایش‌های پیشنهادی",
  "sonderr:autocomplete.incompatibilityExtensionPopup.message":
    "تکمیل خودکار Sonderr به دلیل تعارض با GitHub Copilot مسدود شده است. برای رفع این مشکل، باید پیشنهادات درون‌خطی Copilot را غیرفعال کنید.",
  "sonderr:autocomplete.incompatibilityExtensionPopup.disableCopilot": "غیرفعال کردن Copilot",
  "sonderr:autocomplete.incompatibilityExtensionPopup.disableInlineAssist": "غیرفعال کردن تکمیل خودکار",
  "sonderr:autocomplete.creditsExhausted.message":
    "تکمیل خودکار Sonderr متوقف شده است. دلایل احتمالی: حساب Sonderr شما اعتبار کافی ندارد، یا کلید API پیکربندی‌شده (BYOK) به سقف مجاز خود رسیده است. برای از سرگیری تکمیل خودکار، اعتبار Sonderr اضافه کنید یا تنظیمات کلید API خود را بررسی کنید.",
  "sonderr:autocomplete.creditsExhausted.addCredits": "افزودن اعتبار",
  "sonderr:autocomplete.authError.message":
    "تکمیل خودکار Sonderr به دلیل مشکل احراز هویت متوقف شده است. دلایل احتمالی: وارد Sonderr نشده‌اید، یا کلید API (BYOK) شما نامعتبر یا وارد نشده است. لطفاً دوباره وارد شوید یا تنظیمات کلید API ارائه‌دهنده خود را بررسی کنید.",
}
