import path from "path"
import type { FSUtil } from "@sonderr/core/fs-util"
import { Effect } from "effect"

export namespace SonderrGlobalConfigStamp {
  const files = ["config.json", "sonderr.json", "sonderr.jsonc", "sonderr.json", "sonderr.jsonc", "config"]

  export const read = Effect.fnUntraced(function* (
    fs: Pick<FSUtil.Interface, "readFileStringSafe">,
    dir: string,
  ) {
    const entries = yield* Effect.forEach(
      files,
      Effect.fnUntraced(function* (file) {
        const source = path.join(dir, file)
        const text = yield* fs.readFileStringSafe(source).pipe(Effect.catch(() => Effect.succeed(undefined)))
        return [source, text ?? null] as const
      }),
      { concurrency: "unbounded" },
    )
    return JSON.stringify(entries)
  })
}
