import { MEMORY_USAGE, parseMemoryCommand as parse } from "@sonderr/sonderr-memory/commands"
import type { ParsedMemoryCommand as SharedMemoryCommand } from "@sonderr/sonderr-memory/commands"

export type ParsedMemoryCommand = SharedMemoryCommand
export { MEMORY_USAGE }

export function parseMemoryCommand(input: string): ParsedMemoryCommand | undefined {
  const parsed = parse(input)
  if (parsed?.kind !== "usage") return parsed
  return { ...parsed, reason: `${parsed.reason}\n${MEMORY_USAGE}` }
}
