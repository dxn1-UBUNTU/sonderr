import { SonderrMarkdown } from "../config/markdown"

export namespace SonderrInstruction {
  export function content(text: string, item: string, options: SonderrMarkdown.Options) {
    return SonderrMarkdown.substitute(text, item, options)
  }

  export async function read(item: string, options: SonderrMarkdown.Options) {
    return content(await SonderrMarkdown.read(item, options), item, options)
  }
}
