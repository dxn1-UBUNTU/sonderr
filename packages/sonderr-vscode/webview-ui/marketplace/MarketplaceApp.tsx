import { type Component } from "solid-js"
import { ThemeProvider } from "@sonderr/sonderr-ui/theme"
import { DialogProvider } from "@sonderr/sonderr-ui/context/dialog"
import { Toast } from "@sonderr/sonderr-ui/toast"
import { MarketplaceView } from "../src/components/marketplace"
import { MarketplaceSessionProvider } from "../src/context/marketplace-session"
import { LanguageBridge } from "../src/context/language-bridge"
import { ServerProvider } from "../src/context/server"
import { VSCodeProvider } from "../src/context/vscode"
import "../src/styles/chat.css"

export const MarketplaceApp: Component = () => {
  return (
    <ThemeProvider defaultTheme="sonderr-vscode">
      <DialogProvider>
        <VSCodeProvider>
          <ServerProvider>
            <LanguageBridge>
              <MarketplaceSessionProvider>
                <MarketplaceView />
              </MarketplaceSessionProvider>
            </LanguageBridge>
          </ServerProvider>
        </VSCodeProvider>
        <Toast.Region />
      </DialogProvider>
    </ThemeProvider>
  )
}
