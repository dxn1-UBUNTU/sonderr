import { useDialog } from "@sonderr/sonderr-ui/context/dialog"
import { Dialog } from "@sonderr/sonderr-ui/dialog"
import { List } from "@sonderr/sonderr-ui/list"
import { ProviderIcon } from "@sonderr/sonderr-ui/provider-icon"
import { Tag } from "@sonderr/sonderr-ui/tag"
import { Show, createMemo } from "solid-js"
import { useConfig } from "../../context/config"
import { useLanguage } from "../../context/language"
import { useProvider } from "../../context/provider"
import { useServer } from "../../context/server"
import type { Provider } from "../../types/messages"
import ProviderConnectDialog from "./ProviderConnectDialog"
import {
  CUSTOM_PROVIDER_ID,
  isPopularProvider,
  sonderrFallbackProvider,
  popularProviderIndex,
  providerIcon,
} from "./provider-catalog"
import CustomProviderDialog from "./CustomProviderDialog"
import { SONDERR_PROVIDER_ID } from "../../../../src/shared/provider-model"

type ProviderItem = {
  id: string
  name: string
  provider?: Provider
}

const ProviderSelectDialog = () => {
  const dialog = useDialog()
  const { config } = useConfig()
  const provider = useProvider()
  const server = useServer()
  const language = useLanguage()

  const items = createMemo<ProviderItem[]>(() => {
    language.locale()

    const disabled = new Set(config().disabled_providers ?? [])
    const connected = new Set(provider.connected())
    const all = Object.values(provider.providers())
    const withSonderr = all.some((item) => item.id === SONDERR_PROVIDER_ID) ? all : [sonderrFallbackProvider(), ...all]
    const available = withSonderr.filter((item) => !disabled.has(item.id) && !connected.has(item.id))

    return [
      {
        id: CUSTOM_PROVIDER_ID,
        name: language.t("settings.providers.tag.customProvider"),
      },
      ...available.map((item) => ({
        id: item.id,
        name: item.name,
        provider: item,
      })),
    ]
  })

  function open(item: ProviderItem) {
    if (item.id === CUSTOM_PROVIDER_ID) {
      dialog.show(() => <CustomProviderDialog onBack={() => dialog.show(() => <ProviderSelectDialog />)} />)
      return
    }

    if (item.id === SONDERR_PROVIDER_ID) {
      dialog.close()
      // Navigate to the Profile view so the full device-auth UI is visible.
      server.goToLogin()
      return
    }

    dialog.show(() => <ProviderConnectDialog providerID={item.id} />)
  }

  return (
    <Dialog title={language.t("command.provider.connect")} size="large" transition>
      <List<ProviderItem>
        search={{ placeholder: language.t("dialog.provider.search.placeholder"), autofocus: true }}
        emptyMessage={language.t("dialog.provider.empty")}
        activeIcon="plus-small"
        key={(item) => item.id}
        items={items()}
        filterKeys={["id", "name"]}
        groupBy={(item) =>
          item.id !== CUSTOM_PROVIDER_ID && isPopularProvider(item.provider ?? item.id)
            ? language.t("settings.providers.group.recommended")
            : language.t("dialog.provider.group.other")
        }
        sortBy={(a, b) => {
          if (a.id === CUSTOM_PROVIDER_ID) return -1
          if (b.id === CUSTOM_PROVIDER_ID) return 1

          const rank = popularProviderIndex(a.provider ?? a.id) - popularProviderIndex(b.provider ?? b.id)
          if (rank !== 0) return rank
          return a.name.localeCompare(b.name)
        }}
        sortGroupsBy={(a, b) => {
          const recommended = language.t("settings.providers.group.recommended")
          if (a.category === recommended && b.category !== recommended) return -1
          if (b.category === recommended && a.category !== recommended) return 1
          return 0
        }}
        onSelect={(item) => {
          if (!item) return
          open(item)
        }}
      >
        {(item) => (
          <div style={{ display: "flex", gap: "10px", "align-items": "center", width: "100%", "min-width": 0 }}>
            <ProviderIcon
              id={providerIcon(item.provider ?? item.id)}
              width={18}
              height={18}
              data-slot="list-item-extra-icon"
            />
            <div
              style={{
                display: "flex",
                gap: "8px",
                "align-items": "center",
                "min-width": 0,
                flex: 1,
                "flex-wrap": "wrap",
              }}
            >
              <span
                style={{
                  "font-size": "var(--sonderr-font-size-14)",
                  "line-height": "var(--sonderr-font-size-20)",
                  color: "var(--vscode-foreground)",
                }}
              >
                {item.name}
              </span>
              <Show when={item.id === SONDERR_PROVIDER_ID}>
                <Tag>{language.t("dialog.provider.tag.recommended")}</Tag>
              </Show>
              <Show when={item.id === CUSTOM_PROVIDER_ID}>
                <Tag>{language.t("settings.providers.tag.custom")}</Tag>
              </Show>
            </div>
          </div>
        )}
      </List>
    </Dialog>
  )
}

export default ProviderSelectDialog
