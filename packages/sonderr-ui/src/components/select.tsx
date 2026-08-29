import { Select as Base, type SelectProps } from "@sonderr/ui/select"
import type { ButtonProps } from "@sonderr/ui/button"
import { changed } from "./select-change"

export * from "@sonderr/ui/select"

export function Select<T>(props: SelectProps<T> & Omit<ButtonProps, "children">) {
  const key = (item: T) => (props.value ? props.value(item) : (item as string))

  return (
    <Base
      {...props}
      onSelect={(next) => {
        if (!changed(props.current, next, key)) return
        props.onSelect?.(next)
      }}
    />
  )
}
