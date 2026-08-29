import { makeDefaultApi } from "@sonderr/protocol/api"
import { LocationMiddleware } from "./location"
import { SessionLocationMiddleware } from "./middleware/session-location"

export const Api = makeDefaultApi({
  locationMiddleware: LocationMiddleware,
  sessionLocationMiddleware: SessionLocationMiddleware,
})
