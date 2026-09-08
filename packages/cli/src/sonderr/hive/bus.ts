import type { HiveID, HiveMemo, HiveProposal, HiveTodo } from "./model"
import { SONDERR_HIVE_TTL_MS } from "./model"
import { HiveEvents } from "./events"

type Subscriber = (memo: HiveMemo) => void

let proposalCounter = 0
let todoCounter = 0

function nextId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${(++proposalCounter).toString(36)}`
}

export class SonderrHiveBus {
  readonly hiveID: HiveID
  private readonly memos = new Map<string, HiveMemo[]>()
  private readonly subs = new Map<string, Set<Subscriber>>()
  private readonly proposals = new Map<string, HiveProposal>()
  private readonly todos = new Map<string, HiveTodo>()
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
    HiveEvents.memoSent({
      hiveID: this.hiveID,
      channel: input.channel,
      from: input.from,
      role: input.role,
      text: input.text,
    })
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
    const result = seen.slice(Math.max(0, seen.length - limit), seen.length)
    for (const memo of result) {
      HiveEvents.memoRecalled({
        hiveID: this.hiveID,
        channel: memo.channel,
        from: memo.from,
        role: memo.role,
        text: memo.text,
      })
    }
    return result
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
    this.proposals.clear()
    this.todos.clear()
  }

  createProposal(input: {
    title: string
    description: string
    createdBy: string
  }): HiveProposal {
    const proposal: HiveProposal = {
      id: nextId("prop"),
      hiveID: this.hiveID,
      title: input.title,
      description: input.description,
      status: "open",
      votes: {},
      createdBy: input.createdBy,
      createdAt: Date.now(),
    }
    this.proposals.set(proposal.id, proposal)
    this.publish({
      channel: "swarm",
      from: input.createdBy,
      role: "orchestrator",
      text: `[PROPOSAL] ${proposal.id}\nTitle: ${input.title}\nDescription: ${input.description}`,
    })
    return proposal
  }

  vote(proposalId: string, voter: string, vote: string): HiveProposal | undefined {
    const proposal = this.proposals.get(proposalId)
    if (!proposal || proposal.status !== "open") return proposal
    proposal.votes[voter] = vote
    this.publish({
      channel: "swarm",
      from: voter,
      role: "subagent",
      text: `[VOTE] ${proposalId}: ${vote}`,
    })
    return proposal
  }

  closeProposal(proposalId: string, status: "accepted" | "rejected" | "cancelled"): HiveProposal | undefined {
    const proposal = this.proposals.get(proposalId)
    if (!proposal || proposal.status !== "open") return proposal
    proposal.status = status
    proposal.closedAt = Date.now()
    this.publish({
      channel: "swarm",
      from: "orchestrator",
      role: "orchestrator",
      text: `[PROPOSAL_CLOSED] ${proposalId}: ${status}`,
    })
    return proposal
  }

  getProposal(proposalId: string): HiveProposal | undefined {
    return this.proposals.get(proposalId)
  }

  listProposals(): HiveProposal[] {
    return Array.from(this.proposals.values()).sort((a, b) => b.createdAt - a.createdAt)
  }

  createTodo(input: {
    title: string
    description?: string
    assignee?: string
    dependencies?: string[]
  }): HiveTodo {
    const todo: HiveTodo = {
      id: nextId("todo"),
      hiveID: this.hiveID,
      title: input.title,
      description: input.description,
      status: "pending",
      assignee: input.assignee,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      dependencies: input.dependencies,
    }
    this.todos.set(todo.id, todo)
    this.publish({
      channel: "swarm",
      from: input.assignee ?? "orchestrator",
      role: "orchestrator",
      text: `[TODO_CREATED] ${todo.id}\nTitle: ${todo.title}\nAssignee: ${todo.assignee ?? "unassigned"}`,
    })
    return todo
  }

  updateTodo(todoId: string, updates: Partial<Pick<HiveTodo, "status" | "assignee" | "description" | "dependencies">>): HiveTodo | undefined {
    const todo = this.todos.get(todoId)
    if (!todo) return todo
    const prev = todo.status
    if (updates.status) todo.status = updates.status
    if (updates.assignee !== undefined) todo.assignee = updates.assignee
    if (updates.description !== undefined) todo.description = updates.description
    if (updates.dependencies !== undefined) todo.dependencies = updates.dependencies
    if (updates.status === "completed") todo.completedAt = Date.now()
    todo.updatedAt = Date.now()
    if (prev !== todo.status) {
      this.publish({
        channel: "swarm",
        from: todo.assignee ?? "orchestrator",
        role: "orchestrator",
        text: `[TODO_UPDATED] ${todo.id}\nStatus: ${prev} -> ${todo.status}`,
      })
    }
    return todo
  }

  getTodo(todoId: string): HiveTodo | undefined {
    return this.todos.get(todoId)
  }

  listTodos(): HiveTodo[] {
    return Array.from(this.todos.values()).sort((a, b) => b.createdAt - a.createdAt)
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
