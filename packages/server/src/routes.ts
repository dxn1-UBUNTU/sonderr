import { Database } from "@sonderr/core/database/database"
import { LayerNode } from "@sonderr/core/effect/layer-node"
import { httpClient } from "@sonderr/core/effect/app-node-platform"
import { AppNodeBuilder } from "@sonderr/core/effect/app-node-builder"
import { EventV2 } from "@sonderr/core/event"
import { Credential } from "@sonderr/core/credential"
import { PermissionSaved } from "@sonderr/core/permission/saved"
import { PtyTicket } from "@sonderr/core/pty/ticket"
import { Pty } from "@sonderr/core/pty" // sonderr_change
import { SessionV2 } from "@sonderr/core/session"
import { SessionExecution } from "@sonderr/core/session/execution"
import { LocationServiceMap } from "@sonderr/core/location-service-map"
import { SessionExecutionLocal } from "@sonderr/core/session/execution/local"
import { ToolOutputStore } from "@sonderr/core/tool-output-store"
import { HttpRouter, HttpServer } from "effect/unstable/http"
import { HttpApiBuilder } from "effect/unstable/httpapi"
import { Layer, Option } from "effect"
import { Api } from "./api"
import { ServerAuth } from "./auth"
import { handlers } from "./handlers"
import { authorizationLayer } from "./middleware/authorization"
import * as ReferenceReconciler from "./sonderr/reference-reconciler" // sonderr_change
import { schemaErrorLayer } from "./middleware/schema-error"
import { PtyEnvironment } from "./pty-environment"
import { layer as locationLayer } from "./location"
import { sessionLocationLayer } from "./middleware/session-location"

const applicationServices = LayerNode.group([
  Database.node,
  EventV2.node,
  httpClient,
  ToolOutputStore.cleanupNode,
  SessionV2.node,
  PermissionSaved.node,
  PtyTicket.node,
  Pty.shutdownNode, // sonderr_change
  Credential.node,
  PtyEnvironment.node,
  LocationServiceMap.node,
])

export function createRoutes(password?: string) {
  return makeRoutes(
    password
      ? ServerAuth.Config.configLayer({ username: "sonderr", password: Option.some(password) })
      : ServerAuth.Config.layer,
  )
}

export function createEmbeddedRoutes() {
  return makeRoutes(ServerAuth.Config.configLayer({ username: "sonderr", password: Option.none() }))
}

function makeRoutes<AuthError, AuthServices>(auth: Layer.Layer<ServerAuth.Config, AuthError, AuthServices>) {
  const serviceLayer = AppNodeBuilder.build(applicationServices, [[SessionExecution.node, SessionExecutionLocal.node]])

  return HttpApiBuilder.layer(Api, { openapiPath: "/openapi.json" }).pipe(
    Layer.provide(handlers),
    Layer.provide(sessionLocationLayer),
    Layer.provide(locationLayer), // sonderr_change - standalone server has no Sonderr config reconciler
    Layer.provide(authorizationLayer),
    Layer.provide(schemaErrorLayer),
    Layer.provide(auth),
    Layer.provide(serviceLayer),
    HttpRouter.provideRequest(ReferenceReconciler.noop), // sonderr_change - request-scoped; no Sonderr reconciler outside the CLI
  )
}

export const routes = createRoutes()

export const webHandler = () =>
  HttpRouter.toWebHandler(routes.pipe(Layer.provide(HttpServer.layerServices)), { disableLogger: true })
