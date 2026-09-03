import { describe, expect, test } from "bun:test"
import { SonderrHiveBus } from "../../../src/sonderr/hive/bus"
import { HiveID } from "../../../src/sonderr/hive/model"

function freshBus() {
  return new SonderrHiveBus(`hive_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}` as HiveID)
}

describe("SonderrHiveBus", () => {
  test("publish and recall returns memos", () => {
    const bus = freshBus()
    bus.publish({ channel: "swarm", from: "agent-1", role: "subagent", text: "hello" })
    const memos = bus.recall({})
    expect(memos).toHaveLength(1)
    expect(memos[0].text).toBe("hello")
    expect(memos[0].from).toBe("agent-1")
  })

  test("recall filters by channel", () => {
    const bus = freshBus()
    bus.publish({ channel: "alpha", from: "a", role: "subagent", text: "a" })
    bus.publish({ channel: "beta", from: "b", role: "subagent", text: "b" })
    const memos = bus.recall({ channel: "alpha" })
    expect(memos).toHaveLength(1)
    expect(memos[0].channel).toBe("alpha")
  })

  test("recall filters by since", () => {
    const bus = freshBus()
    bus.publish({ channel: "swarm", from: "a", role: "subagent", text: "old" })
    bus.publish({ channel: "swarm", from: "b", role: "subagent", text: "new" })
    const all = bus.recall({})
    const future = all[0].ts + 10000
    const filtered = bus.recall({ since: future })
    expect(filtered).toHaveLength(0)
    const recent = bus.recall({ since: all[0].ts })
    expect(recent).toHaveLength(2)
  })

  test("recall respects limit", () => {
    const bus = freshBus()
    bus.publish({ channel: "swarm", from: "a", role: "subagent", text: "1" })
    bus.publish({ channel: "swarm", from: "b", role: "subagent", text: "2" })
    bus.publish({ channel: "swarm", from: "c", role: "subagent", text: "3" })
    const memos = bus.recall({ limit: 2 })
    expect(memos).toHaveLength(2)
    expect(memos[0].text).toBe("2")
    expect(memos[1].text).toBe("3")
  })

  test("subscribe receives new memos", () => {
    const bus = freshBus()
    const received: string[] = []
    bus.subscribe("swarm", (m) => received.push(m.text))
    bus.publish({ channel: "swarm", from: "x", role: "subagent", text: "msg" })
    expect(received).toHaveLength(1)
    expect(received[0]).toBe("msg")
  })

  test("unsubscribe stops delivery", () => {
    const bus = freshBus()
    const received: string[] = []
    const off = bus.subscribe("swarm", (m) => received.push(m.text))
    bus.publish({ channel: "swarm", from: "x", role: "subagent", text: "1" })
    off()
    bus.publish({ channel: "swarm", from: "x", role: "subagent", text: "2" })
    expect(received).toHaveLength(1)
  })

  test("eviction removes expired memos", async () => {
    const bus = freshBus()
    const memo = bus.publish({ channel: "swarm", from: "x", role: "subagent", text: "old", ttl: 10 })
    expect(bus.recall({})).toHaveLength(1)
    await new Promise((r) => setTimeout(r, 20))
    bus.recall({})
    expect(bus.recall({})).toHaveLength(0)
  })

  test("close clears state", () => {
    const bus = freshBus()
    bus.publish({ channel: "swarm", from: "x", role: "subagent", text: "msg" })
    bus.close()
    expect(bus.recall({})).toHaveLength(0)
    bus.subscribe("swarm", () => {})
    bus.publish({ channel: "swarm", from: "x", role: "subagent", text: "ignored" })
  })
})
