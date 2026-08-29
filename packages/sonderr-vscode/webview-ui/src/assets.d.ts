declare module "*.svg" {
  const src: string
  export default src
}

declare module "*.css"
declare module "@sonderr/sonderr-ui/styles"

declare module "*?worker&url" {
  const src: string
  export default src
}
