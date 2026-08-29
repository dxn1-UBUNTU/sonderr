import { AbsolutePath } from "@sonderr/core/schema"
import { Location } from "@sonderr/core/location"
import { Pty } from "@sonderr/core/pty"
import { Effect } from "effect"

export function clearPtys(directory: string, workspaceID: Location.Ref["workspaceID"]) {
  return Effect.promise(() =>
    Pty.terminateDirectory(
      Location.Ref.make({
        directory: AbsolutePath.make(directory),
        workspaceID,
      }),
    ),
  )
}
