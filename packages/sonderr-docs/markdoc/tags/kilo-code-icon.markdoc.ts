import { SonderrIcon } from "../../components"

export const sonderrCodeIcon = {
  render: SonderrIcon,
  selfClosing: true,
  attributes: {
    size: {
      type: String,
      default: "1.2em",
      description: "Size of the icon (CSS height value)",
    },
  },
}
