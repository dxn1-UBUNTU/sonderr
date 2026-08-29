export type SonderrEmbeddingModel = {
  id: string
  name: string
  dimension: number
  scoreThreshold: number
  note?: string
}

export type SonderrEmbeddingModelCatalog = {
  defaultModel: string
  models: SonderrEmbeddingModel[]
  aliases: Record<string, string>
}

export const EMPTY_SONDERR_EMBEDDING_MODEL_CATALOG: SonderrEmbeddingModelCatalog = {
  defaultModel: "",
  models: [],
  aliases: {},
}

export function normalizeSonderrEmbeddingModelId(model: string | undefined, catalog = EMPTY_SONDERR_EMBEDDING_MODEL_CATALOG) {
  if (!model) return undefined
  return catalog.aliases[model] ?? model
}

export function getSonderrEmbeddingModel(model: string | undefined, catalog = EMPTY_SONDERR_EMBEDDING_MODEL_CATALOG) {
  const id = normalizeSonderrEmbeddingModelId(model, catalog)
  return catalog.models.find((item) => item.id === id)
}

export function formatSonderrEmbeddingModelLabel(model: SonderrEmbeddingModel): string {
  const note = model.note ? `${model.note}, ` : ""
  return `${model.name} (${note}${model.dimension}d)`
}
