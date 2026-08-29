import { afterEach, beforeEach, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { $ } from "bun"
import {
  createCommit,
  findLatestCompatCommit,
  getCommitHash,
  getCommitParents,
  isAncestor,
  overlayCompatTree,
  recordAncestor,
  updateBranch,
  writeTree,
} from "./git"

const cwd = process.cwd()
let dir = ""

async function commit(message: string) {
  await $`git add -A`.quiet()
  await $`git -c user.name=Test -c user.email=test@example.com commit -m ${message}`.quiet()
  return getCommitHash("HEAD")
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "sonderr-upstream-git-"))
  process.chdir(dir)
  await $`git init -b upstream`.quiet()
  await $`git config user.name Test`.quiet()
  await $`git config user.email test@example.com`.quiet()
})

afterEach(async () => {
  process.chdir(cwd)
  await rm(dir, { recursive: true, force: true })
})

test("finds previous compatibility commit for transformed base", async () => {
  await Bun.write("brand.txt", "sonderr A\n")
  const old = await commit("release: v1.0.0")

  await Bun.write("brand.txt", "sonderr B\n")
  const target = await commit("release: v1.0.1")
  await $`git tag v1.0.1 ${target}`.quiet()

  await $`git checkout -b main ${old}`.quiet()
  await $`git tag v1.0.0 ${old}`.quiet()
  await Bun.write("brand.txt", "sonderr A\n")
  const prior = await commit("refactor: sonderr compat for v1.0.0")

  const found = await findLatestCompatCommit("main", target)
  expect(found?.commit).toBe(prior)
  expect(found?.upstream).toBe(old)

  await $`git checkout ${target}`.quiet()
  await $`git checkout -b sonderr-v1.0.1`.quiet()
  await Bun.write("brand.txt", "sonderr B\n")
  await $`git add -A`.quiet()
  const tree = await writeTree()
  const next = await createCommit(tree, "refactor: sonderr compat for v1.0.1", prior)
  await updateBranch("sonderr-v1.0.1", next)
  const base = (await $`git merge-base main sonderr-v1.0.1`.text()).trim()
  expect(base).toBe(prior)
  expect(await getCommitParents(next)).toEqual([prior])

  await $`git checkout main`.quiet()
  expect(await recordAncestor(target, "merge: record upstream v1.0.1")).toBe(true)
  const link = await getCommitHash("HEAD")
  expect(await getCommitParents(link)).toEqual([prior, target])
  expect(await isAncestor(target, link)).toBe(true)

  const linked = (await $`git merge-base main sonderr-v1.0.1`.text()).trim()
  expect(linked).toBe(prior)

  await $`git merge sonderr-v1.0.1`.quiet()
  const head = await getCommitHash("HEAD")
  expect(await getCommitParents(head)).toEqual([link, next])
  expect(await isAncestor(target, head)).toBe(true)
})

test("finds previous compatibility commit when upstream tags diverge", async () => {
  await Bun.write("brand.txt", "sonderr 1.4.9\n")
  const old = await commit("release: v1.4.9")
  await $`git tag v1.4.9 ${old}`.quiet()

  await $`git checkout -b release-30 ${old}`.quiet()
  await Bun.write("brand.txt", "sonderr 1.14.30\n")
  const side = await commit("release: v1.14.30")
  await $`git tag v1.14.30 ${side}`.quiet()

  await $`git checkout -b release-31 ${old}`.quiet()
  await Bun.write("brand.txt", "sonderr 1.14.31\n")
  const target = await commit("release: v1.14.31")
  await $`git tag v1.14.31 ${target}`.quiet()

  await $`git checkout -b main ${old}`.quiet()
  await Bun.write("brand.txt", "sonderr 1.4.9\n")
  const ancient = await commit("refactor: sonderr compat for v1.4.9")
  await Bun.write("brand.txt", "sonderr 1.14.30\n")
  const prior = await commit("refactor: sonderr compat for v1.14.30")

  expect(await isAncestor(side, target)).toBe(false)
  expect(await isAncestor(old, target)).toBe(true)

  const found = await findLatestCompatCommit("main", target)
  expect(found?.commit).toBe(prior)
  expect(found?.upstream).toBe(side)
  expect(found?.commit).not.toBe(ancient)
})

test("compatibility tree preserves Sonderr paths unchanged upstream", async () => {
  await Bun.write("shared.txt", "sonderr A\n")
  await Bun.write("unchanged.txt", "sonderr unchanged\n")
  await Bun.write("removed.txt", "remove me\n")
  const old = await commit("release: v1.0.0")

  await Bun.write("shared.txt", "sonderr B\n")
  await Bun.write("added.txt", "sonderr added\n")
  await rm("removed.txt")
  const target = await commit("release: v1.0.1")

  await $`git checkout -b main ${old}`.quiet()
  await Bun.write("shared.txt", "sonderr A\n")
  await Bun.write("unchanged.txt", "sonderr marker\n")
  await Bun.write("sonderr-only.txt", "keep me\n")
  const previous = await commit("refactor: sonderr compat for v1.0.0")

  await $`git checkout --detach ${target}`.quiet()
  await Bun.write("shared.txt", "sonderr B\n")
  await Bun.write("added.txt", "sonderr added\n")
  await Bun.write(".sonderr-version", "v1.0.1\n")
  await $`git add -A`.quiet()
  const transformed = await writeTree()
  const tree = await overlayCompatTree({
    previous,
    upstream: old,
    target,
    transformed,
    extra: [".sonderr-version"],
  })

  expect(await $`git show ${`${tree}:shared.txt`}`.text()).toBe("sonderr B\n")
  expect(await $`git show ${`${tree}:added.txt`}`.text()).toBe("sonderr added\n")
  expect(await $`git show ${`${tree}:unchanged.txt`}`.text()).toBe("sonderr marker\n")
  expect(await $`git show ${`${tree}:sonderr-only.txt`}`.text()).toBe("keep me\n")
  expect(await $`git show ${`${tree}:.sonderr-version`}`.text()).toBe("v1.0.1\n")
  expect((await $`git cat-file -e ${`${tree}:removed.txt`}`.quiet().nothrow()).exitCode).not.toBe(0)
})
