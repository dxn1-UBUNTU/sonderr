// sonderr_change start
import { plain } from "../kilocode/cli/logo"

export const logo = {
  left: ["", "", ""],
  right: plain(),
}
// sonderr_change end

export const go = {
  left: ["", "", "", ""], // sonderr_change
  right: ["", ...plain()], // sonderr_change
}

export const marks = "_^~,"
