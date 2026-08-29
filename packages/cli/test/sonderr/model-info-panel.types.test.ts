import type { Model as SDKModel } from "@sonderr/sdk/v2"
import { ModelInfoPanel } from "@/sonderr/components/model-info-panel"

type Assert<T extends true> = T
type Props = Parameters<typeof ModelInfoPanel>[0]

type _SyncModelMatchesPanel = Assert<SDKModel extends Props["model"] ? true : false>
