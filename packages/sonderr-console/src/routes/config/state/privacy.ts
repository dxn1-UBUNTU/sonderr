import type { Model, Provider } from "@sonderr/sdk/v2/client"

export function hasGateway(providers: Pick<Provider, "id">[]) {
  return providers.some((provider) => provider.id === "sonderr")
}

export function visible(
  provider: Pick<Provider, "id">,
  model: Pick<Model, "mayTrainOnYourPrompts">,
  privacy: boolean,
) {
  return !privacy || provider.id !== "sonderr" || model.mayTrainOnYourPrompts !== true
}
