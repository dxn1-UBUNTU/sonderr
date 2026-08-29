// SonderrClaw SolidJS webview entry point

import { render } from "solid-js/web"
import "@sonderr/sonderr-ui/styles"
import "./sonderrclaw.css"
import { SonderrClawApp } from "./SonderrClawApp"

const root = document.getElementById("root")
if (root) {
  render(() => <SonderrClawApp />, root)
}
