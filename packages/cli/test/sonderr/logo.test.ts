import { describe, expect, test } from "bun:test"
import { plain, session, supports, tui } from "../../src/sonderr/cli/logo"

describe("sonderr logo", () => {
  test("falls back for unknown terminals, including remote sessions", () => {
    // sonderr_change - the modern logo needs Unicode 13 sextant glyphs; an
    // unknown (or remote) terminal defaults to the fallback art, never tofu.
    expect(supports({ SSH_TTY: "/dev/pts/0" }, "linux")).toBe(false)
    expect(supports({ SSH_CLIENT: "127.0.0.1 12345 22" }, "linux")).toBe(false)
    expect(supports({ SSH_CONNECTION: "127.0.0.1 12345 127.0.0.1 22" }, "linux")).toBe(false)
    expect(supports({}, "linux")).toBe(false)
    expect(supports({ TERM_PROGRAM: "Apple_Terminal" }, "darwin")).toBe(false)
    expect(supports({ TERM: "alacritty" }, "linux")).toBe(false)
  })

  test("allows terminals with confirmed sextant coverage", () => {
    expect(supports({ WT_SESSION: "session" }, "linux")).toBe(true)
    expect(supports({ TERM_PROGRAM: "WezTerm" }, "linux")).toBe(true)
    expect(supports({ WEZTERM_PANE: "1" }, "linux")).toBe(true)
    expect(supports({ TERM_PROGRAM: "ghostty" }, "linux")).toBe(true)
    expect(supports({ TERM_PROGRAM: "iTerm.app" }, "darwin")).toBe(true)
    expect(supports({ KITTY_WINDOW_ID: "1" }, "linux")).toBe(true)
    expect(supports({ TERM: "xterm-kitty" }, "linux")).toBe(true)
    expect(supports({ TERM_PROGRAM: "vscode" }, "linux")).toBe(true)
  })

  test("falls back on old Windows terminals", () => {
    expect(supports({}, "win32")).toBe(false)
    expect(supports({ ANSICON: "1" }, "win32")).toBe(false)
    expect(supports({ ConEmuPID: "123" }, "win32")).toBe(false)
  })

  test("allows modern Windows terminals", () => {
    expect(supports({ WT_SESSION: "session" }, "win32")).toBe(true)
    expect(supports({ TERM_PROGRAM: "vscode" }, "win32")).toBe(true)
    expect(supports({ WEZTERM_PANE: "1" }, "win32")).toBe(true)
    expect(supports({ TERM_PROGRAM: "WezTerm" }, "win32")).toBe(true)
  })

  test("an explicit override always wins", () => {
    expect(supports({ SONDERR_UNICODE_LOGO: "1", SSH_TTY: "/dev/pts/0" }, "linux")).toBe(true)
    expect(supports({ SONDERR_UNICODE_LOGO: "0" }, "linux")).toBe(false)
    expect(supports({ SONDERR_UNICODE_LOGO: "0", WT_SESSION: "s" }, "win32")).toBe(false)
    expect(supports({ SONDERR_UNICODE_LOGO: "1", TERM: "dumb" }, "linux")).toBe(true)
  })

  test("uses modern and fallback logo variants", () => {
    expect(tui({ SONDERR_UNICODE_LOGO: "1" }, "linux").join("\n")).toContain("🬺🬏")
    expect(tui({}, "linux").join("\n")).not.toContain("🬺🬏")
    expect(tui({}, "win32").join("\n")).not.toContain("🬺🬏")
    expect(plain({}, "win32").join("\n")).not.toContain("🬁🬬")
    expect(plain({ TERM_PROGRAM: "iTerm.app" }, "darwin").join("\n")).toContain("🬁🬬")
  })

  test("formats child session exit logo", () => {
    const out = session("Title", "ses_test", "<dim>", "<reset>", {}, "win32")
    expect(out).toContain("<dim>Title<reset>")
    expect(out).not.toContain("🬺🬏")
  })
})
