import { type ComponentProps, splitProps } from "solid-js"

export * from "@sonderr/ui/card"

export function CardHeader(props: ComponentProps<"div">) {
  const [local, rest] = splitProps(props, ["children", "class", "classList"])
  return (
    <div {...rest} data-slot="card-header" classList={{ ...local.classList, [local.class ?? ""]: !!local.class }}>
      {local.children}
    </div>
  )
}
