// SonderrClaw root component

import { Switch, Match } from "solid-js"
import { ThemeProvider } from "@sonderr/sonderr-ui/theme"
import { MarkedProvider } from "@sonderr/sonderr-ui/context/marked"
import { Button } from "@sonderr/sonderr-ui/button"
import { Spinner } from "@sonderr/sonderr-ui/spinner"
import { Toast } from "@sonderr/sonderr-ui/toast"
import { ClawProvider, useClaw } from "./context/claw"
import { SonderrClawLanguageProvider, useSonderrClawLanguage } from "./context/language"
import { ConversationList } from "./components/ConversationList"
import { MessageArea } from "./components/MessageArea"
import { StatusSidebar } from "./components/StatusSidebar"
import { SetupView } from "./components/SetupView"
import { UpgradeView } from "./components/UpgradeView"

function Content() {
  const claw = useClaw()
  const { t } = useSonderrClawLanguage()

  return (
    <div class="sonderrclaw-root">
      <Switch>
        <Match when={claw.phase() === "loading"}>
          <div class="sonderrclaw-center">
            <div class="sonderrclaw-loading">
              <Spinner />
              <span>{t("sonderrClaw.loading")}</span>
            </div>
          </div>
        </Match>
        <Match when={claw.phase() === "noInstance"}>
          <SetupView />
        </Match>
        <Match when={claw.phase() === "needsUpgrade"}>
          <UpgradeView />
        </Match>
        <Match when={claw.phase() === "error"}>
          <div class="sonderrclaw-center">
            <div class="sonderrclaw-error-view">
              <span class="sonderrclaw-error-text">{claw.error()}</span>
              <Button variant="primary" onClick={() => claw.retry()}>
                {t("sonderrClaw.error.retry")}
              </Button>
            </div>
          </div>
        </Match>
        <Match when={claw.phase() === "ready"}>
          <div class="sonderrclaw-layout">
            <ConversationList />
            <MessageArea />
            <StatusSidebar />
          </div>
        </Match>
      </Switch>
      <Toast.Region />
    </div>
  )
}

export function SonderrClawApp() {
  return (
    <ThemeProvider defaultTheme="sonderr-vscode">
      <ClawProvider>
        <LanguageBridge>
          <MarkedProvider>
            <Content />
          </MarkedProvider>
        </LanguageBridge>
      </ClawProvider>
    </ThemeProvider>
  )
}

/** Bridges the claw context locale into the language provider. Must be below ClawProvider. */
function LanguageBridge(props: { children: any }) {
  const claw = useClaw()
  return <SonderrClawLanguageProvider locale={claw.locale}>{props.children}</SonderrClawLanguageProvider>
}
