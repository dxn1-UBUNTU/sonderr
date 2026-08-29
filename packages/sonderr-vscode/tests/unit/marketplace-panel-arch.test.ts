import { describe, expect, it } from "bun:test"
import fs from "node:fs"
import path from "node:path"

const root = path.resolve(import.meta.dir, "../..")
const sonderr = fs.readFileSync(path.join(root, "src/SonderrProvider.ts"), "utf-8")
const panel = fs.readFileSync(path.join(root, "src/MarketplacePanelProvider.ts"), "utf-8")
const remove = fs.readFileSync(path.join(root, "src/sonderr-provider/remove-config-item.ts"), "utf-8")

describe("standalone Marketplace architecture", () => {
  it("keeps Marketplace webview cases out of SonderrProvider", () => {
    for (const type of [
      "fetchMarketplaceData",
      "installMarketplaceItem",
      "removeInstalledMarketplaceItem",
      "dismissAgentMigrationBanner",
    ]) {
      expect(sonderr).not.toContain(`case \"${type}\"`)
      expect(panel).toContain(`case \"${type}\"`)
    }
  })

  it("uses a dedicated Marketplace webview bundle", () => {
    expect(panel).toContain('"dist", "marketplace.js"')
    expect(panel).not.toContain('"dist", "webview.js"')
  })

  it("keeps sidebar removal behind a narrow adapter", () => {
    expect(sonderr).toContain("removeMcp(this.removeConfigItemCtx, name)")
    expect(remove).toContain("createMarketplaceRemover")
    expect(remove).not.toContain("new MarketplaceService()")
    expect(remove).not.toContain("AgentMarketplaceItem")
    expect(remove).not.toContain("McpMarketplaceItem")
  })
})
