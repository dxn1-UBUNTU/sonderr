import { cmd } from "@/cli/cmd/cmd"

export const PtySmokeCommand = cmd({
  command: "__pty-smoke",
  describe: false,
  async handler() {
    if (process.env.SONDERR_PTY_SMOKE !== "1") throw new Error("PTY smoke command is release-only")
    const { PtySmoke } = await import("@sonderr/core/sonderr/pty/smoke")
    await PtySmoke.smoke()
  },
})
