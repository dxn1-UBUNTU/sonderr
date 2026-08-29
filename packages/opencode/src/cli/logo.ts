// sonderr_change start
import { plain } from "../sonderr/cli/logo"

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
