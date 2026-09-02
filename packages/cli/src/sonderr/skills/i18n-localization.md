---
name: i18n-localization
description: Internationalization and localization patterns. Covers translation management, pluralization, date/number formatting, RTL support, and locale detection. Use for multi-language applications.
---

# Internationalization Mastery

## i18n Setup

```typescript
// react-i18next configuration
import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import LanguageDetector from "i18next-browser-languagedetector"

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    resources: {
      en: { translation: require("./locales/en.json") },
      es: { translation: require("./locales/es.json") },
      ja: { translation: require("./locales/ja.json") },
    },
  })

// Usage
import { useTranslation } from "react-i18next"

function Greeting() {
  const { t } = useTranslation()
  return <h1>{t("greeting")}</h1>
}
```

## Translation Keys Structure

```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "loading": "Loading..."
  },
  "errors": {
    "network": "Network error. Please try again.",
    "unauthorized": "You must log in to continue.",
    "notFound": "The requested resource was not found."
  },
  "user": {
    "greeting": "Hello, {{name}}!",
    "profile": "Profile",
    "settings": "Settings"
  },
  "items": {
    "count": "{{count}} item",
    "count_plural": "{{count}} items"
  }
}
```

## Pluralization

```typescript
// ICU message format
{
  "items": {
    "count": "{{count}} item",
    "count_plural": "{{count}} items"
  },
  "messages": {
    "unread": "You have {{count}} unread message",
    "unread_plural": "You have {{count}} unread messages"
  }
}

// Usage
t("items.count", { count: 1 })  // "1 item"
t("items.count", { count: 5 })  // "5 items"

// Complex pluralization (different languages have different rules)
{
  "days": {
    "one": "{{count}} day",
    "two": "{{count}} days",
    "few": "{{count}} days",
    "many": "{{count}} days",
    "other": "{{count}} days"
  }
}
```

## Date & Number Formatting

```typescript
// Intl.DateTimeFormat
const formatDate = (date: Date, locale: string) => {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date)
}

formatDate(new Date(), "en-US")  // "January 15, 2024"
formatDate(new Date(), "de-DE")  // "15. Januar 2024"
formatDate(new Date(), "ja-JP")  // "2024年1月15日"

// Intl.NumberFormat
const formatNumber = (num: number, locale: string, options?: Intl.NumberFormatOptions) => {
  return new Intl.NumberFormat(locale, options).format(num)
}

formatNumber(1234567.89, "en-US")                    // "1,234,567.89"
formatNumber(1234567.89, "de-DE")                    // "1.234.567,89"
formatNumber(0.15, "en-US", { style: "percent" })    // "15%"
formatNumber(1234.56, "en-US", { style: "currency", currency: "USD" })  // "$1,234.56"

// RelativeTimeFormat
const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" })
rtf.format(-1, "day")    // "yesterday"
rtf.format(3, "month")   // "in 3 months"
```

## RTL (Right-to-Left) Support

```typescript
// Detect RTL
const RTL_LANGUAGES = new Set(["ar", "he", "fa", "ur"])
const isRTL = (locale: string) => RTL_LANGUAGES.has(locale.split("-")[0])

// Apply direction
<html dir={isRTL(locale) ? "rtl" : "ltr"} lang={locale}>

// CSS logical properties (prefer over physical)
margin-inline-start: 1rem;  /* instead of margin-left */
padding-inline-end: 1rem;   /* instead of padding-right */
border-inline-start: 1px solid;  /* instead of border-left */
text-align: start;          /* instead of text-align: left */

// Flip icons that imply direction
const Icon = styled.svg`
  [dir="rtl"] & {
    transform: scaleX(-1);
  }
`
```

## Locale Detection

```typescript
// Detect user locale
function detectLocale(): string {
  // 1. Check URL parameter (?lang=es)
  const urlParams = new URLSearchParams(window.location.search)
  const urlLocale = urlParams.get("lang")
  if (urlLocale) return urlLocale

  // 2. Check stored preference
  const stored = localStorage.getItem("locale")
  if (stored) return stored

  // 3. Check browser language
  const browserLang = navigator.language || (navigator as any).userLanguage
  return browserLang || "en"
}

// Match against supported locales
function matchLocale(preferred: string, supported: string[]): string {
  // Exact match
  if (supported.includes(preferred)) return preferred

  // Language match (e.g., "en-US" → "en")
  const lang = preferred.split("-")[0]
  const match = supported.find((s) => s.startsWith(lang))
  if (match) return match

  return "en" // fallback
}
```

## Translation Management

```typescript
// Extract keys (using i18next-scanner or similar)
// npx i18next-scanner --config i18next-scanner.config.js

// Namespace organization
const namespaces = {
  common: "Shared across all features",
  auth: "Login, signup, password reset",
  dashboard: "Dashboard-specific strings",
  settings: "Settings page strings",
  errors: "Error messages",
}

// Lazy load namespaces
i18n.loadNamespaces("dashboard").then(() => {
  // Dashboard translations loaded
})

// Fallback chain
// 1. Try current namespace
// 2. Try "common" namespace
// 3. Show key name (development) or fallback language (production)
```

## Best Practices

```
1. Never concatenate strings: t("hello") + " " + name → t("greeting", { name })
2. Never split sentences: t("youHave") + " " + count + " " + t("messages")
3. Use full sentences for translation context
4. Avoid gender-specific constructs when possible
5. Leave comments for translators: {t('orderTotal', 'Total price including tax')}
6. Test with pseudo-localization (replace chars: Héllö Wörld)
7. Plan for text expansion: German can be 30% longer than English
8. Don't put text in images
9. Use placeholder variables for dynamic content
10. Always test RTL layouts
```