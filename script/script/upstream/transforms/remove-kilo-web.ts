import { debug, warn } from "../utils/logger"

const INDEX = "packages/cli/src/index.ts"
const IMPORT = /^import \{ WebCommand \} from "\.\/cli\/cmd\/web"\n/m
const REGISTER = /^(\s*)\.command\(WebCommand\)\n/m
const REFERENCE = /\bWebCommand\b|["']\.\/cli\/cmd\/web["']/
const OMIT_IMPORT =
  "// sonderr_change - upstream web command intentionally omitted; Sonderr does not ship an embedded web UI\n"
const OMIT_REGISTER = "// sonderr_change - upstream web command intentionally omitted\n"

export type SonderrWebResult = {
  result: string
  removals: number
  review: boolean
}

export function removeSonderrWeb(file: string, content: string): SonderrWebResult {
  if (file !== INDEX) return { result: content, removals: 0, review: false }

  const result = content.replace(IMPORT, OMIT_IMPORT).replace(REGISTER, `$1${OMIT_REGISTER}`)
  const removals = Number(result !== content)
  const review = REFERENCE.test(result)
  return { result, removals, review }
}

export async function transformSonderrWeb(options: { dryRun?: boolean; verbose?: boolean } = {}): Promise<SonderrWebResult> {
  const file = Bun.file(INDEX)
  if (!(await file.exists())) return { result: "", removals: 0, review: false }

  const content = await file.text()
  const transformed = removeSonderrWeb(INDEX, content)
  if (transformed.removals > 0 && !options.dryRun) await Bun.write(INDEX, transformed.result)
  if (transformed.removals > 0 && options.verbose) debug("Removed unsupported Sonderr web command registration")
  if (transformed.review) {
    warn("Sonderr web command shape changed upstream — review packages/cli/src/index.ts; merge continues")
  }
  return transformed
}
