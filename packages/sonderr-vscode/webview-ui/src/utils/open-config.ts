import type { LanguageContextValue } from "../context/language"
import type { OpenConfigFileRequest } from "../types/messages"

export function configMessage(scope: "local" | "global", t: LanguageContextValue["t"]): OpenConfigFileRequest {
  const label = t(scope === "global" ? "settings.config.scope.global" : "settings.config.scope.local")
  return {
    type: "openConfigFile",
    scope,
    labels: {
      scope: label,
      statusLoaded: t("settings.config.status.loaded"),
      statusLoadedLegacy: t("settings.config.status.loadedLegacy"),
      statusNotLoaded: t("settings.config.status.notLoaded"),
      statusCreate: t("settings.config.status.create"),
      title: t("settings.config.title", { scope: label }),
      placeholder: t("settings.config.placeholder"),
      noWorkspace: t("settings.config.noWorkspace"),
      openFailed: t("settings.config.openFailed", { scope: label, message: "{{message}}" }),
      sourceXdg: t("settings.config.source.xdg"),
      sourceHomeSonderr: t("settings.config.source.homeSonderr"),
      sourceEnvFile: t("settings.config.source.envFile"),
      sourceEnvDir: t("settings.config.source.envDir"),
      sourceEnvContent: t("settings.config.source.envContent"),
      sourceProjectSonderr: t("settings.config.source.projectSonderr"),
      sourceProjectRoot: t("settings.config.source.projectRoot"),
    },
  }
}
