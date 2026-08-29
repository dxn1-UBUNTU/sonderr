import { createContext, createSignal, onCleanup, useContext, type Accessor, type ParentComponent } from "solid-js"
import {
  EMPTY_SONDERR_EMBEDDING_MODEL_CATALOG,
  type SonderrEmbeddingModelCatalog,
} from "@sonderr/sonderr-indexing/embedding-models"
import { useVSCode } from "./vscode"
import type { ExtensionMessage } from "../types/messages"

type SonderrEmbeddingModelsContextValue = {
  catalog: Accessor<SonderrEmbeddingModelCatalog>
}

export const SonderrEmbeddingModelsContext = createContext<SonderrEmbeddingModelsContextValue>()

export const SonderrEmbeddingModelsProvider: ParentComponent = (props) => {
  const vscode = useVSCode()
  const [catalog, setCatalog] = createSignal<SonderrEmbeddingModelCatalog>(EMPTY_SONDERR_EMBEDDING_MODEL_CATALOG)

  const unsubscribe = vscode.onMessage((message: ExtensionMessage) => {
    if (message.type !== "sonderrEmbeddingModelsLoaded") return
    setCatalog(message.catalog)
  })

  vscode.postMessage({ type: "requestSonderrEmbeddingModels" })

  onCleanup(unsubscribe)

  return <SonderrEmbeddingModelsContext.Provider value={{ catalog }}>{props.children}</SonderrEmbeddingModelsContext.Provider>
}

export function useSonderrEmbeddingModels(): SonderrEmbeddingModelsContextValue {
  const context = useContext(SonderrEmbeddingModelsContext)
  if (!context) {
    throw new Error("useSonderrEmbeddingModels must be used within a SonderrEmbeddingModelsProvider")
  }
  return context
}
