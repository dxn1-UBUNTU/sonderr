import { describe, expect, it } from "bun:test"
import { mergeFileSearchItems } from "../../src/sonderr-provider/file-search-items"

describe("mergeFileSearchItems", () => {
  it("puts exact folder matches before file matches", () => {
    const result = mergeFileSearchItems({
      query: "script",
      files: ["script/hooks", "script/release", "script/beta.ts"],
      folders: ["script/", "script/run-script/"],
    })
    expect(result).toEqual([
      { path: "script/", type: "folder" },
      { path: "script/hooks", type: "file" },
      { path: "script/release", type: "file" },
      { path: "script/beta.ts", type: "file" },
      { path: "script/run-script/", type: "folder" },
    ])
  })

  it("keeps file ordering before non-prefix folder matches", () => {
    const result = mergeFileSearchItems({
      query: "test",
      files: ["src/test.ts"],
      folders: ["src/latest/"],
    })
    expect(result).toEqual([
      { path: "src/test.ts", type: "file" },
      { path: "src/latest/", type: "folder" },
    ])
  })

  it("normalizes Windows separators for matching and output", () => {
    const result = mergeFileSearchItems({
      query: "sonderr-vscode",
      files: ["packages\\sonderr-vscode\\src\\SonderrProvider.ts"],
      folders: ["packages\\sonderr-vscode\\"],
    })
    expect(result).toEqual([
      { path: "packages/sonderr-vscode/", type: "folder" },
      { path: "packages/sonderr-vscode/src/SonderrProvider.ts", type: "file" },
    ])
  })

  it("keeps active and open file results before prefix folder matches", () => {
    const result = mergeFileSearchItems({
      query: "e",
      files: ["packages/sonderr-vscode/src/extension.ts"],
      folders: ["packages/extensions/", "packages/example/", "packages/core/src/effect/"],
      open: new Set(["packages/sonderr-vscode/src/extension.ts"]),
    })
    expect(result).toEqual([
      { path: "packages/sonderr-vscode/src/extension.ts", type: "opened-file" },
      { path: "packages/extensions/", type: "folder" },
      { path: "packages/example/", type: "folder" },
      { path: "packages/core/src/effect/", type: "folder" },
    ])
  })

  it("keeps opened files as a distinct priority group before non-open files", () => {
    const result = mergeFileSearchItems({
      query: "test",
      files: ["src/test.ts", "src/test-helper.ts"],
      folders: ["test/"],
      open: new Set(["src/test-helper.ts"]),
    })
    expect(result).toEqual([
      { path: "src/test-helper.ts", type: "opened-file" },
      { path: "test/", type: "folder" },
      { path: "src/test.ts", type: "file" },
    ])
  })
})
