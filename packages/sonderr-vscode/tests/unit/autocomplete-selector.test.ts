import { describe, expect, it } from "bun:test"
import { notebookModel, selector } from "../../src/services/autocomplete/AutocompleteServiceManager"

describe("autocomplete document selector", () => {
  it("registers classic autocomplete for files and notebook cells", () => {
    expect(selector("classic")).toEqual([{ scheme: "file" }, { scheme: "vscode-notebook-cell" }])
  })

  it("keeps Next Edit limited to files", () => {
    expect(selector("next-edit")).toEqual([{ scheme: "file" }])
  })

  it("uses the matching FIM model for notebook fallback", () => {
    expect(notebookModel("sonderr", "inception/mercury-next-edit").id).toBe("sonderr/inception/mercury-edit-2")
    expect(notebookModel("inception", "mercury-next-edit").id).toBe("inception/mercury-edit-2")
    expect(notebookModel("sonderr", "mistralai/codestral-2508").id).toBe("sonderr/mistralai/codestral-2508")
  })
})
