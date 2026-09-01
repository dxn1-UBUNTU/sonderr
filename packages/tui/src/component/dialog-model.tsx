/** @jsxImportSource @opentui/solid */
import { useTerminalDimensions } from "@opentui/solid" // sonderr_change
import { createEffect, createMemo, createSignal, Show } from "solid-js" // sonderr_change
import { useLocal } from "../context/local"
import { useSync } from "../context/sync"
import { map, pipe, sortBy, take } from "remeda" // sonderr_change
import { DialogSelect } from "../ui/dialog-select"
import { useDialog } from "../ui/dialog"
import { createDialogProviderOptions, DialogProvider } from "./dialog-provider"
import { DialogVariant } from "./dialog-variant"
import type { Model } from "@sonderr/sdk/v2" // sonderr_change
import { useConnected } from "./use-connected"
import { ModelInfoPanel } from "@/sonderr/components/model-info-panel" // sonderr_change
import { FreeModelDisclosure } from "@/sonderr/components/free-model-disclosure" // sonderr_change
import { buildModelPickerOptions, rankProviderOptions } from "../sonderr/model-picker" // sonderr_change

export function DialogModel(props: { providerID?: string }) {
  const local = useLocal()
  const sync = useSync()
  const dialog = useDialog()
  const [query, setQuery] = createSignal("")
  const dimensions = useTerminalDimensions() // sonderr_change

  const connected = useConnected()
  const providers = createDialogProviderOptions()
  // sonderr_change start
  // Memoize anything that iterates all Sonderr models to avoid calculating it for
  // each Sonderr model and tanking the UI at a couple hundred models
  const sonderrRank = createMemo(() => {
    const provider = sync.data.provider.find((provider) => provider.id === "sonderr")
    const models = provider?.models ?? {}
    return new Map(Object.entries(models).map(([id, info]) => [id, info.recommendedIndex ?? Infinity] as const))
  })
  // sonderr_change end

  const showExtra = createMemo(() => connected() && !props.providerID)

  // sonderr_change start
  const wide = createMemo(() => dimensions().width >= 108)
  const [preview, setPreview] = createSignal<{
    model: Model
    provider: string
  }>()

  const lookup = (providerID: string, modelID: string) => {
    const provider = sync.data.provider.find((x) => x.id === providerID)
    const model = provider?.models[modelID]
    if (!provider || !model) return
    return {
      model,
      provider: provider.name,
    }
  }

  createEffect(() => {
    dialog.setSize(wide() ? "xlarge" : "large")
  })

  createEffect(() => {
    const current = local.model.current()
    if (!current) return
    const next = lookup(current.providerID, current.modelID)
    if (!next) return
    setPreview(next)
  })

  const footer = (providerID: string, model: Model) => {
    const labels = [
      providerID === "sonderr" && FreeModelDisclosure.hasByok(model) ? FreeModelDisclosure.byok : undefined,
      providerID === "sonderr" && FreeModelDisclosure.collectsData(model) ? FreeModelDisclosure.label : undefined,
      model.cost?.input === 0 && providerID === "sonderr" ? "Free" : undefined,
    ].filter((label) => label !== undefined)
    return labels.length > 0 ? labels.join(" · ") : undefined
  }
  // sonderr_change end

  // sonderr_change start
  type ModelOption = ReturnType<typeof options>[number]
  const ADD_PROVIDER_VALUE = "__add_provider__" as const

  const addProviderOption: ModelOption = {
    key: ADD_PROVIDER_VALUE,
    value: ADD_PROVIDER_VALUE as any,
    title: "+ Add new provider",
    description: "Connect a new AI provider with your API key",
    category: "Actions",
    releaseDate: "",
    disabled: false,
    providerName: "",
    providerID: ADD_PROVIDER_VALUE,
    modelID: "",
    onSelect() {
      dialog.replace(() => <DialogProvider />)
    },
  }
  // sonderr_change end

  // sonderr_change start - option building lives in sonderr/model-picker so the
  // Sonderr Gateway grouping/search rules can be unit tested
  const options = createMemo(() => {
    const needle = query().trim()
    const modelOptions = buildModelPickerOptions({
      providers: sync.data.provider,
      favorites: connected() ? local.model.favorite() : [],
      recents: local.model.recent(),
      connected: connected(),
      showExtra: showExtra(),
      providerID: props.providerID,
      query: needle,
      footer,
      onSelect,
      sort: (items) => sortModelOptions(items, props.providerID !== undefined, sonderrRank()),
    })

    const popularProviders = !connected()
      ? pipe(
          providers(),
          map((option) => ({
            ...option,
            category: "Popular providers",
          })),
          take(6),
        )
      : []

    return [
      addProviderOption,
      ...modelOptions,
      ...(needle ? rankProviderOptions(needle, popularProviders) : popularProviders),
    ]
  })
  // sonderr_change end

  const provider = createMemo(() =>
    props.providerID ? sync.data.provider.find((item) => item.id === props.providerID) : null,
  )

  const title = createMemo(() => {
    const value = provider()
    if (!value) return "Select model"
    return value.name
  })

  function onSelect(providerID: string, modelID: string) {
    local.model.set({ providerID, modelID }, { recent: true })
    const list = local.model.variant.list()
    const cur = local.model.variant.selected()
    if (cur === "default" || (cur && list.includes(cur))) {
      dialog.clear()
      return
    }
    if (list.length > 0) {
      dialog.replace(() => <DialogVariant />)
      return
    }
    dialog.clear()
  }

  // sonderr_change start
  return (
    <box flexDirection="row">
      <box flexGrow={1} flexShrink={1}>
        <DialogSelect<ReturnType<typeof options>[number]["value"]>
          options={options()}
          actions={[
            {
              command: "model.dialog.provider",
              title: connected() ? "+ Add provider" : "View all providers",
              onTrigger() {
                dialog.replace(() => <DialogProvider />)
              },
            },
            {
              command: "model.dialog.favorite",
              title: "Favorite",
              hidden: !connected(),
              onTrigger: (option) => {
                local.model.toggleFavorite(option.value as { providerID: string; modelID: string })
              },
            },
          ]}
          onFilter={setQuery}
          onMove={(option) => {
            if (option.value === ADD_PROVIDER_VALUE) {
              setPreview(undefined)
              return
            }
            if (typeof option.value === "string") {
              setPreview(undefined)
              return
            }
            const next = lookup(option.value.providerID, option.value.modelID)
            if (!next) return
            setPreview(next)
          }}
          // sonderr_change: removed flat={true} to keep section headers visible while filtering
          skipFilter={true}
          title={title()}
          current={local.model.current()}
        />
      </box>
      <Show when={wide() && preview()}>
        {(item) => <ModelInfoPanel model={item().model} provider={item().provider} />}
      </Show>
    </box>
  )
  // sonderr_change end
}

export function sortModelOptions<
  T extends {
    footer?: string
    releaseDate: string | number
    title: string
    value?: { providerID: string; modelID: string } // sonderr_change
  },
>(
  options: T[],
  newestFirst: boolean,
  rank: ReadonlyMap<string, number> = new Map(), // sonderr_change
) {
  // sonderr_change start - Sort within Recommended / Sonderr Gateway
  const recommended = (option: T) =>
    option.value?.providerID === "sonderr" ? (rank.get(option.value.modelID) ?? Infinity) : 0
  // sonderr_change end
  if (newestFirst)
    return sortBy(
      options,
      recommended, // sonderr_change
      [(option) => option.releaseDate, "desc"],
      (option) => option.title,
    )
  return sortBy(
    options,
    recommended, // sonderr_change
    (option) => option.footer === undefined,
    [(option) => option.releaseDate, "desc"], // sonderr_change - free model footers include Sonderr disclosure labels
    (option) => option.title,
  )
}
