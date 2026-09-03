import type { HiveID, HiveMemo } from "./model"
import { SONDERR_HIVE_TTL_MS } from "./model"

type Subscriber = (memo: HiveMemo) => void

export class SonderrHiveBus {
  readonly hiveID: HiveID
  private readonly memos = new Map<string, HiveMemo[]>()
  private readonly subs = new Map<string, Set<Subscriber>>()
  private closed = false

  constructor(hiveID: HiveID) {
    this.hiveID = hiveID
  }

  publish(input: {
    channel: string
    from: string
    role: HiveMemo["role"]
    text: string
    ttl?: number
  }): HiveMemo {
    const memo = this.make(input)
    if (this.closed) return memo
    const list = this.memos.get(input.channel) ?? []
    list.push(memo)
    this.memos.set(input.channel, list)
    this.subs.get(input.channel)?.forEach((sub) => sub(memo))
    return memo
  }

  recall(input: { channel?: string; since?: number; limit?: number }): HiveMemo[] {
    const now = Date.now()
    this.evict(now)
    const channels = input.channel === undefined ? [...this.memos.keys()] : [input.channel]
    const seen: HiveMemo[] = []
    for (const channel of channels) {
      const list = this.memos.get(channel)
      if (!list) continue
      for (const memo of list) {
        if (input.since !== undefined && memo.ts < input.since) continue
        seen.push(memo)
      }
    }
    seen.sort((a, b) => a.ts - b.ts)
    const limit = input.limit ?? seen.length
    return seen.slice(Math.max(0, seen.length - limit), seen.length)
  }

  subscribe(channel: string, sub: Subscriber): () => void {
    if (this.closed) return () => {}
    let set = this.subs.get(channel)
    if (!set) {
      set = new Set()
      this.subs.set(channel, set)
    }
    set.add(sub)
    return () => set.delete(sub)
  }

  close(): void {
    this.closed = true
    this.memos.clear()
    this.subs.clear()
  }

  private make(input: {
    channel: string
    from: string
    role: HiveMemo["role"]
    text: string
    ttl?: number
  }): HiveMemo {
    return {
      hiveID: this.hiveID,
      channel: input.channel,
      from: input.from,
      role: input.role,
      text: input.text,
      ts: Date.now(),
      ...(input.ttl !== undefined ? { ttl: input.ttl } : { ttl: SONDERR_HIVE_TTL_MS }),
    }
  }

  private evict(now: number): void {
    for (const [channel, list] of this.memos) {
      const live = list.filter((memo) => memo.ttl === undefined || now - memo.ts <= memo.ttl)
      if (live.length === 0) this.memos.delete(channel)
      else this.memos.set(channel, live)
    }
  }
}
