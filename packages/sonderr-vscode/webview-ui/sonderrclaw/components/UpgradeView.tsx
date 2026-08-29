// SonderrClaw upgrade view — shown when instance needs upgrade for chat

import { Button } from "@sonderr/sonderr-ui/button"
import { Card, CardTitle, CardDescription, CardActions } from "@sonderr/sonderr-ui/card"
import { useClaw } from "../context/claw"
import { useSonderrClawLanguage } from "../context/language"

export function UpgradeView() {
  const claw = useClaw()
  const { t } = useSonderrClawLanguage()

  return (
    <div class="sonderrclaw-center">
      <Card class="sonderrclaw-card">
        <CardTitle icon={false}>{t("sonderrClaw.upgrade.title")}</CardTitle>
        <CardDescription>
          <p class="sonderrclaw-card-text">{t("sonderrClaw.upgrade.description1")}</p>
          <p class="sonderrclaw-card-text">
            {t("sonderrClaw.upgrade.description2.before")}
            <strong>{t("sonderrClaw.upgrade.description2.bold")}</strong>
            {t("sonderrClaw.upgrade.description2.after")}
          </p>
        </CardDescription>
        <CardActions>
          <div />
          <Button variant="primary" onClick={() => claw.openExternal("https://app.kilo.ai/claw")}>
            {t("sonderrClaw.upgrade.openDashboard")}
          </Button>
        </CardActions>
      </Card>
    </div>
  )
}
