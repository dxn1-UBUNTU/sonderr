// SonderrClaw conversation sidebar — mirrors the web UI in
// cloud/apps/web/src/app/(app)/claw/sonderr-chat/components/ConversationList.tsx

import { For, Show, createMemo, createSignal, onCleanup, onMount } from "solid-js"
import { useClaw } from "../context/claw"
import { useSonderrClawLanguage } from "../context/language"
import type { ConversationListItem } from "../lib/types"
import { isEnterKeyCommitNotIme } from "../../src/utils/ime-enter"

type Group = { label: string; items: ConversationListItem[] }

function groupConversations(convs: ConversationListItem[], labels: Record<string, string>): Group[] {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterdayStart = todayStart - 86_400_000
  const weekStart = todayStart - 6 * 86_400_000

  const buckets: Record<string, ConversationListItem[]> = {
    today: [],
    yesterday: [],
    week: [],
    older: [],
  }

  for (const c of convs) {
    const ts = c.lastActivityAt ?? c.joinedAt
    if (ts >= todayStart) buckets.today.push(c)
    else if (ts >= yesterdayStart) buckets.yesterday.push(c)
    else if (ts >= weekStart) buckets.week.push(c)
    else buckets.older.push(c)
  }

  const order: Array<[keyof typeof buckets, string]> = [
    ["today", labels.today],
    ["yesterday", labels.yesterday],
    ["week", labels.week],
    ["older", labels.older],
  ]
  return order.filter(([key]) => buckets[key].length > 0).map(([key, label]) => ({ label, items: buckets[key] }))
}

export function ConversationList() {
  const claw = useClaw()
  const { t } = useSonderrClawLanguage()

  const groups = createMemo(() =>
    groupConversations(claw.conversations(), {
      today: t("sonderrClaw.conversations.groupToday"),
      yesterday: t("sonderrClaw.conversations.groupYesterday"),
      week: t("sonderrClaw.conversations.groupThisWeek"),
      older: t("sonderrClaw.conversations.groupOlder"),
    }),
  )

  let scrollEl!: HTMLDivElement

  const onScroll = () => {
    if (!scrollEl) return
    if (!claw.hasMoreConversations()) return
    if (scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight < 80) {
      claw.loadMoreConversations()
    }
  }

  onMount(() => scrollEl?.addEventListener("scroll", onScroll))
  onCleanup(() => scrollEl?.removeEventListener("scroll", onScroll))

  return (
    <div class="sonderrclaw-convlist">
      <div class="sonderrclaw-convlist-header">
        <span class="sonderrclaw-convlist-title">{t("sonderrClaw.conversations.title")}</span>
        <button
          type="button"
          class="sonderrclaw-iconbtn"
          onClick={() => claw.createConversation()}
          aria-label={t("sonderrClaw.conversations.new")}
          title={t("sonderrClaw.conversations.new")}
        >
          +
        </button>
      </div>
      <div class="sonderrclaw-convlist-scroll" ref={scrollEl}>
        <Show
          when={claw.conversations().length > 0}
          fallback={<div class="sonderrclaw-convlist-empty">{t("sonderrClaw.conversations.empty")}</div>}
        >
          <For each={groups()}>
            {(group) => (
              <div class="sonderrclaw-convlist-group">
                <div class="sonderrclaw-convlist-grouplabel">{group.label}</div>
                <For each={group.items}>{(conv) => <ConversationItem conversation={conv} />}</For>
              </div>
            )}
          </For>
        </Show>
      </div>
    </div>
  )
}

function ConversationItem(props: { conversation: ConversationListItem }) {
  const claw = useClaw()
  const { t } = useSonderrClawLanguage()
  const [isRenaming, setIsRenaming] = createSignal(false)
  const [renameText, setRenameText] = createSignal("")
  let inputEl: HTMLInputElement | undefined

  const isActive = createMemo(() => claw.activeConversationId() === props.conversation.conversationId)
  const isUnread = createMemo(() => {
    const { lastActivityAt, lastReadAt } = props.conversation
    if (!lastActivityAt) return false
    return lastReadAt === null || lastReadAt < lastActivityAt
  })

  const startRename = (e: MouseEvent) => {
    e.stopPropagation()
    setRenameText(props.conversation.title ?? "")
    setIsRenaming(true)
    queueMicrotask(() => inputEl?.focus())
  }

  const commitRename = () => {
    const title = renameText().trim()
    if (title && title !== (props.conversation.title ?? "")) {
      claw.renameConversation(props.conversation.conversationId, title)
    }
    setIsRenaming(false)
  }

  const cancelRename = () => {
    setRenameText("")
    setIsRenaming(false)
  }

  const onKey = (e: KeyboardEvent) => {
    if (isEnterKeyCommitNotIme(e)) {
      e.preventDefault()
      commitRename()
    } else if (e.key === "Escape") {
      e.preventDefault()
      cancelRename()
    }
  }

  return (
    <div
      class={`sonderrclaw-convitem ${isActive() ? "sonderrclaw-convitem-active" : ""}`}
      onClick={() => {
        if (isRenaming()) return
        claw.selectConversation(props.conversation.conversationId)
      }}
      role="button"
      tabindex={0}
    >
      <Show
        when={!isRenaming()}
        fallback={
          <input
            ref={inputEl}
            class="sonderrclaw-convitem-renameinput"
            value={renameText()}
            onInput={(e) => setRenameText(e.currentTarget.value)}
            onKeyDown={onKey}
            onBlur={commitRename}
            onClick={(e) => e.stopPropagation()}
            maxLength={200}
          />
        }
      >
        <span class="sonderrclaw-convitem-title">
          <Show when={isUnread()}>
            <span class="sonderrclaw-convitem-unread" aria-hidden="true" />
          </Show>
          {props.conversation.title ?? t("sonderrClaw.conversations.untitled")}
        </span>
      </Show>
      <div class="sonderrclaw-convitem-actions" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          class="sonderrclaw-iconbtn-sm"
          onClick={startRename}
          title={t("sonderrClaw.conversations.rename")}
          aria-label={t("sonderrClaw.conversations.rename")}
        >
          ✎
        </button>
        <button
          type="button"
          class="sonderrclaw-iconbtn-sm sonderrclaw-iconbtn-danger"
          onClick={() => claw.leaveConversation(props.conversation.conversationId)}
          title={t("sonderrClaw.conversations.leave")}
          aria-label={t("sonderrClaw.conversations.leave")}
        >
          ×
        </button>
      </div>
    </div>
  )
}
