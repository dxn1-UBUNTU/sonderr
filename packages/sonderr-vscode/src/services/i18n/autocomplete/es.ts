export const dict = {
  "sonderr:autocomplete.statusBar.enabled": "$(sonderr-logo) Autocompletado",
  "sonderr:autocomplete.statusBar.snoozed": "pospuesto",
  "sonderr:autocomplete.statusBar.warning": "$(warning) Autocompletado",
  "sonderr:autocomplete.statusBar.tooltip.basic": "Autocompletado de Sonderr",
  "sonderr:autocomplete.statusBar.tooltip.noUsableProvider":
    "**No hay ningún modelo de autocompletado configurado**\n\nPara habilitar el autocompletado, añade un perfil con uno de estos proveedores compatibles: {{providers}}.\n\n[Abrir configuración]({{command}})",
  "sonderr:autocomplete.statusBar.tooltip.completionSummary":
    "Se realizaron {{count}} completados entre {{startTime}} y {{endTime}}, con un coste total de {{cost}}.",
  "sonderr:autocomplete.statusBar.tooltip.providerInfo":
    "Autocompletados proporcionados por {{model}} mediante {{provider}}.",
  "sonderr:autocomplete.statusBar.cost.zero": "$0.00",
  "sonderr:autocomplete.statusBar.cost.lessThanCent": "<$0.01",
  "sonderr:autocomplete.codeAction.title": "Sonderr: Ediciones sugeridas",
  "sonderr:autocomplete.incompatibilityExtensionPopup.message":
    "El autocompletado de Sonderr está bloqueado por un conflicto con GitHub Copilot. Para solucionarlo, debes deshabilitar las sugerencias en línea de Copilot.",
  "sonderr:autocomplete.incompatibilityExtensionPopup.disableCopilot": "Deshabilitar Copilot",
  "sonderr:autocomplete.incompatibilityExtensionPopup.disableInlineAssist": "Deshabilitar autocompletado",
  "sonderr:autocomplete.creditsExhausted.message":
    "El autocompletado de Sonderr se ha pausado. Posibles causas: tu cuenta de Sonderr no tiene créditos restantes, o tu clave de API configurada (BYOK) alcanzó su límite de cuota. Agrega créditos de Sonderr o revisa la configuración de tu clave de API para reanudar el autocompletado.",
  "sonderr:autocomplete.creditsExhausted.addCredits": "Añadir créditos",
  "sonderr:autocomplete.authError.message":
    "El autocompletado de Sonderr se ha pausado por un problema de autenticación. Posibles causas: no has iniciado sesión en Sonderr, o tu clave de API (BYOK) no es válida o falta. Vuelve a iniciar sesión o revisa la configuración de la clave de API de tu proveedor.",
}
