import { expect, test } from "bun:test"
import { SonderrToolRegistry } from "@/sonderr/tool/registry"
import type * as Tool from "@/tool/tool"

// Minimal stub — select() only reads .id from each Tool.Def
const stub = (id: string) => ({ id }) as unknown as Tool.Def

const tools = {
  recall: stub("recall"),
  managerModels: stub("managerModels"),
  memory: stub("memory"),
  save: stub("save"),
  manager: stub("manager"),
  process: stub("process"),
  chart: stub("chart"),
  image: stub("image"),
  notify: stub("notify"),
  send: stub("send_file"),
}

function ids(client: string) {
  const prev = process.env.SONDERR_CLIENT
  try {
    process.env.SONDERR_CLIENT = client
    return SonderrToolRegistry.extra(tools, {}).map((t) => t.id)
  } finally {
    if (prev === undefined) delete process.env.SONDERR_CLIENT
    else process.env.SONDERR_CLIENT = prev
  }
}

test("chart tool is included for vscode", () => {
  expect(ids("vscode")).toContain("chart")
})

test("chart tool is excluded for cli", () => {
  expect(ids("cli")).not.toContain("chart")
})

test("chart tool is excluded for jetbrains", () => {
  expect(ids("jetbrains")).not.toContain("chart")
})
