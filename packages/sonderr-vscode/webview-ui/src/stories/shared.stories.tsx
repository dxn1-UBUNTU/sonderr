/** @jsxImportSource solid-js */
/**
 * Stories for shared controls: ModelSelector.
 */

import { createSignal } from "solid-js"
import type { Meta, StoryObj } from "storybook-solidjs-vite"
import { StoryProviders, mockSessionValue } from "./StoryProviders"
import { ModelSelectorBase } from "../components/shared/ModelSelector"
import { SessionContext } from "../context/session"
import type { EnrichedModel } from "../context/provider"
import type { ModelSelection } from "../types/messages"
import { Markdown } from "@sonderr/sonderr-ui/markdown"

const meta: Meta = {
  title: "Shared",
  parameters: { layout: "fullscreen" },
}
export default meta
type Story = StoryObj

export const MarkdownMermaid: Story = {
  name: "Markdown - Mermaid diagram",
  render: () => (
    <StoryProviders>
      <Markdown
        text={`# Flow

\`\`\`mermaid
flowchart TD
  A[Prompt] --> B{Needs tools?}
  B -->|Yes| C[Run tool]
  B -->|No| D[Respond]
  C --> D
\`\`\`

Rendered after the diagram.`}
      />
    </StoryProviders>
  ),
}

// ---------------------------------------------------------------------------
// ModelSelector
// ---------------------------------------------------------------------------

export const ModelSelectorNoProviders: Story = {
  name: "ModelSelector — no providers",
  render: () => (
    <StoryProviders>
      <div style={{ display: "flex", "align-items": "center", gap: "8px" }}>
        <ModelSelectorBase
          value={{ providerID: "sonderr", modelID: "sonderr-auto/frontier" }}
          onSelect={() => {}}
          placement="bottom-start"
        />
      </div>
    </StoryProviders>
  ),
}

const ACCESSIBLE_MODELS: EnrichedModel[] = [
  {
    id: "sonderr-auto/efficient",
    name: "Sonderr Auto Efficient",
    providerID: "sonderr",
    providerName: "Sonderr",
    recommendedIndex: 0,
    options: {
      description:
        "Routes each request to the cheapest model that gets the job done, based on continuously benchmarked accuracy and cost.",
    },
    autoRouting: { models: ["google/gemini-2.5-flash", "anthropic/claude-sonnet-4.6"] },
  },
  {
    id: "sonderr-auto/frontier",
    name: "Sonderr Auto Frontier",
    providerID: "sonderr",
    providerName: "Sonderr",
    recommendedIndex: 1,
    options: {
      description: "Routes each request to the strongest available models.",
    },
    autoRouting: { models: ["openai/gpt-5.5", "anthropic/claude-opus-4.6"] },
  },
  { id: "omega", name: "Omega", providerID: "openai", providerName: "OpenAI", recommendedIndex: 2 },
  { id: "alpha", name: "Alpha", providerID: "sonderr", providerName: "Sonderr" },
  { id: "bravo", name: "Bravo", providerID: "sonderr", providerName: "Sonderr" },
  { id: "charlie", name: "Charlie", providerID: "sonderr", providerName: "Sonderr" },
  { id: "delta", name: "Delta", providerID: "sonderr", providerName: "Sonderr" },
  { id: "echo", name: "Echo", providerID: "sonderr", providerName: "Sonderr" },
  { id: "nova", name: "Nova", providerID: "nvidia", providerName: "NVIDIA" },
  { id: "nemotron", name: "Nemotron", providerID: "nvidia", providerName: "NVIDIA" },
]

const AccessibleModelSelector = () => {
  const [value, setValue] = createSignal<ModelSelection | null>({ providerID: "sonderr", modelID: "alpha" })

  return (
    <div style={{ display: "flex", "align-items": "center", gap: "12px" }}>
      <ModelSelectorBase
        value={value()}
        models={ACCESSIBLE_MODELS}
        label="Review model"
        description="Choose the model used for code review tasks."
        allowClear
        clearLabel="Use default model"
        placement="bottom-start"
        onSelect={(providerID, modelID) => {
          setValue(providerID && modelID ? { providerID, modelID } : null)
        }}
      />
      <output data-testid="model-selector-value">{value()?.modelID ?? "default"}</output>
    </div>
  )
}

export const ModelSelectorAccessible: Story = {
  name: "ModelSelector — accessible interaction",
  render: () => (
    <StoryProviders>
      <AccessibleModelSelector />
    </StoryProviders>
  ),
}

export const ModelSelectorSelectedFavorite: Story = {
  name: "ModelSelector — selected favorite",
  render: () => {
    const session = {
      ...mockSessionValue(),
      favoriteModels: () => [{ providerID: "sonderr", modelID: "alpha" }],
    }

    return (
      <StoryProviders>
        <SessionContext.Provider value={session as any}>
          <AccessibleModelSelector />
        </SessionContext.Provider>
      </StoryProviders>
    )
  },
}

export const ModelSelectorMostUsed: Story = {
  name: "ModelSelector - most used suggestions",
  render: () => {
    const session = {
      ...mockSessionValue(),
      modelUsageHistory: () => ({
        "sonderr/alpha": { count: 3, lastUsed: 100 },
        "sonderr/bravo": { count: 12, lastUsed: 200 },
        "nvidia/nova": { count: 7, lastUsed: 300 },
      }),
    }

    return (
      <StoryProviders>
        <SessionContext.Provider value={session as any}>
          <AccessibleModelSelector />
        </SessionContext.Provider>
      </StoryProviders>
    )
  },
}

const LARGE_MODELS: EnrichedModel[] = Array.from({ length: 600 }, (_, i) => {
  const id = String(i).padStart(3, "0")
  const provider = `provider-${i % 12}`
  return {
    id: `model-${id}`,
    name: `Model ${id}`,
    providerID: provider,
    providerName: `Provider ${i % 12}`,
  }
})

export const ModelSelectorLargeCatalog: Story = {
  name: "ModelSelector — large catalog",
  render: () => (
    <StoryProviders>
      <ModelSelectorBase
        value={{ providerID: "provider-0", modelID: "model-300" }}
        models={LARGE_MODELS}
        placement="bottom-start"
        onSelect={() => {}}
      />
    </StoryProviders>
  ),
}
