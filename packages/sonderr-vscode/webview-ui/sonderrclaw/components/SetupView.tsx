// SonderrClaw setup view — shown when no instance is provisioned

import { Button } from "@sonderr/sonderr-ui/button"
import { Card, CardTitle, CardDescription, CardActions } from "@sonderr/sonderr-ui/card"
import { useClaw } from "../context/claw"
import { useSonderrClawLanguage } from "../context/language"

export function SetupView() {
  const claw = useClaw()
  const { t } = useSonderrClawLanguage()

  return (
    <div class="sonderrclaw-center">
      <Card class="sonderrclaw-card">
        <CardTitle icon={false}>{t("sonderrClaw.setup.title")}</CardTitle>
        <CardDescription>
          <h3 class="sonderrclaw-card-subtitle">{t("sonderrClaw.setup.subtitle")}</h3>
          <p class="sonderrclaw-card-text">{t("sonderrClaw.setup.description1")}</p>
          <p class="sonderrclaw-card-text">{t("sonderrClaw.setup.description2")}</p>
        </CardDescription>
        <CardActions>
          <Button variant="ghost" onClick={() => claw.openExternal("https://kilo.ai/sonderrclaw")}>
            {t("sonderrClaw.setup.learnMore")}
          </Button>
          <Button variant="primary" onClick={() => claw.openExternal("https://app.kilo.ai/claw")}>
            {t("sonderrClaw.setup.trySonderrClaw")}
          </Button>
        </CardActions>
      </Card>
    </div>
  )
}
