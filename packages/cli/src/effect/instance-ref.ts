import { Context } from "effect"
import type { InstanceContext } from "@/project/instance-context"
import type { WorkspaceV2 } from "@sonderr/core/workspace"

export const InstanceRef = Context.Reference<InstanceContext | undefined>("~sonderr/InstanceRef", {
  defaultValue: () => undefined,
})

export const WorkspaceRef = Context.Reference<WorkspaceV2.ID | undefined>("~sonderr/WorkspaceRef", {
  defaultValue: () => undefined,
})
