import { createMemo, createSignal, For, onCleanup, Show } from "solid-js"
import type { Component } from "solid-js"
import { CodeComponentProvider } from "@sonderr/sonderr-ui/context/code"
import { DiffComponentProvider } from "@sonderr/sonderr-ui/context/diff"
import { FileComponentProvider } from "@sonderr/sonderr-ui/context/file"
import { MarkedProvider } from "@sonderr/sonderr-ui/context/marked"
import { Code } from "@sonderr/sonderr-ui/code"
import { Diff } from "@sonderr/sonderr-ui/diff"
import { File } from "@sonderr/sonderr-ui/file"
import { ThemeProvider } from "@sonderr/sonderr-ui/theme"
import { RadioGroup } from "@sonderr/sonderr-ui/radio-group"
import { LanguageProvider, useLanguage } from "../src/context/language"
import { ServerProvider, useServer } from "../src/context/server"
import { getVSCodeAPI, VSCodeProvider } from "../src/context/vscode"
import { VirtualDiffView, type VirtualDiffFile } from "../diff-viewer/VirtualDiffView"

type DiffStyle = "unified" | "split"

const DiffVirtualContent: Component = () => {
  const { t } = useLanguage()
  const [diff, setDiff] = createSignal<VirtualDiffFile | null>(null)
  const [style, setStyle] = createSignal<DiffStyle>("unified")
  const [markdown, setMarkdown] = createSignal(false)
  const files = createMemo(() => {
    const current = diff()
    return current?.files?.length ? current.files : current ? [current] : []
  })

  const handler = (event: MessageEvent) => {
    const msg = event.data as {
      type: string
      diff?: VirtualDiffFile
      initialDiffStyle?: DiffStyle
      markdownRender?: boolean
    }
    if (msg?.type === "diffVirtual.data" && msg.diff) {
      setDiff(msg.diff)
      setStyle(msg.initialDiffStyle ?? "unified")
      setMarkdown(msg.markdownRender === true)
    }
  }

  window.addEventListener("message", handler)
  onCleanup(() => window.removeEventListener("message", handler))

  return (
    <Show when={files().length > 0}>
      <div class="am-review-layout">
        <div class="am-review-toolbar">
          <div class="am-review-toolbar-left">
            <RadioGroup
              options={["unified", "split"] as const}
              current={style()}
              value={(value) => value}
              label={(value) =>
                value === "unified" ? t("ui.sessionReview.diffStyle.unified") : t("ui.sessionReview.diffStyle.split")
              }
              size="small"
              onSelect={(value) => {
                if (value) {
                  setStyle(value)
                }
              }}
            />
          </div>
        </div>
        <div class="am-edit-preview-files">
          <For each={files()}>
            {(current) => (
              <VirtualDiffView
                diff={current}
                diffStyle={style()}
                onDiffStyleChange={setStyle}
                markdownRender={markdown()}
                onMarkdownRenderChange={(render) => {
                  setMarkdown(render)
                  getVSCodeAPI().postMessage({ type: "diffVirtual.setMarkdownRender", render })
                }}
                styleSelect={false}
              />
            )}
          </For>
        </div>
      </div>
    </Show>
  )
}

const DiffVirtualShell: Component = () => {
  const server = useServer()

  return (
    <LanguageProvider vscodeLanguage={server.vscodeLanguage} languageOverride={server.languageOverride}>
      <DiffComponentProvider component={Diff}>
        <CodeComponentProvider component={Code}>
          <FileComponentProvider component={File}>
            <MarkedProvider>
              <DiffVirtualContent />
            </MarkedProvider>
          </FileComponentProvider>
        </CodeComponentProvider>
      </DiffComponentProvider>
    </LanguageProvider>
  )
}

export const DiffVirtualApp: Component = () => {
  return (
    <ThemeProvider defaultTheme="sonderr-vscode">
      <VSCodeProvider>
        <ServerProvider>
          <DiffVirtualShell />
        </ServerProvider>
      </VSCodeProvider>
    </ThemeProvider>
  )
}
