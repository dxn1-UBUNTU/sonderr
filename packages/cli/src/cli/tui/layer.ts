import { run as runTui, type TuiInput } from "@sonderr/tui"
import { Global } from "@sonderr/core/global"
import { AppNodeBuilder } from "@sonderr/core/effect/app-node-builder"
import { Effect } from "effect"

export function run(input: TuiInput) {
  return runTui(input).pipe(Effect.provide(AppNodeBuilder.build(Global.node)))
}
