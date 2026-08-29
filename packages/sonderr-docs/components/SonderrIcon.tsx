import React from "react"
import { Icon } from "./Icon"

interface SonderrIconProps {
  size?: string
}

export function SonderrIcon({ size = "1.2em" }: SonderrIconProps) {
  return <Icon src="/docs/img/sonderr-v1.svg" srcDark="/docs/img/sonderr-v1-white.svg" alt="Sonderr Icon" size={size} />
}
