import { afterEach, describe, expect, test } from "bun:test"
import { Flag } from "@sonderr/core/flag/flag"
import { ConfigProvider, Layer } from "effect"
import { HttpRouter } from "effect/unstable/http"
import path from "path"
import { ServerAuth } from "../../../src/server/auth"
import { HttpApiApp } from "../../../src/server/routes/instance/httpapi/server"
import { resetDatabase } from "../../fixture/db"
import { disposeAllInstances, tmpdir } from "../../fixture/fixture"

const original = {
  password: Flag.SONDERR_SERVER_PASSWORD,
  username: Flag.SONDERR_SERVER_USERNAME,
  envPassword: process.env.SONDERR_SERVER_PASSWORD,
  envUsername: process.env.SONDERR_SERVER_USERNAME,
}

afterEach(async () => {
  Flag.SONDERR_SERVER_PASSWORD = original.password
  Flag.SONDERR_SERVER_USERNAME = original.username
  if (original.envPassword === undefined) delete process.env.SONDERR_SERVER_PASSWORD
  else process.env.SONDERR_SERVER_PASSWORD = original.envPassword
  if (original.envUsername === undefined) delete process.env.SONDERR_SERVER_USERNAME
  else process.env.SONDERR_SERVER_USERNAME = original.envUsername
  await disposeAllInstances()
  await resetDatabase()
})

function app(input: { password?: string; username?: string }) {
  const handler = HttpRouter.toWebHandler(
    HttpApiApp.routes.pipe(
      Layer.provide(
        ConfigProvider.layer(
          ConfigProvider.fromUnknown({
            SONDERR_SERVER_PASSWORD: input.password,
            SONDERR_SERVER_USERNAME: input.username,
            SONDERR_EXPERIMENTAL_DISABLE_FILEWATCHER: process.env.SONDERR_EXPERIMENTAL_DISABLE_FILEWATCHER ?? "true",
          }),
        ),
      ),
    ),
    { disableLogger: true },
  ).handler

  return {
    request(input: string | URL | Request, init?: RequestInit) {
      return handler(
        input instanceof Request ? input : new Request(new URL(input, "http://localhost"), init),
        HttpApiApp.context,
      )
    },
  }
}

function basic(username: string, password: string) {
  return ServerAuth.header({ username, password }) ?? ""
}

function setAuth(password: string) {
  Flag.SONDERR_SERVER_PASSWORD = password
  Flag.SONDERR_SERVER_USERNAME = undefined
  process.env.SONDERR_SERVER_PASSWORD = password
  delete process.env.SONDERR_SERVER_USERNAME
}

describe("POST /sonderr/snapshot/remove authorization", () => {
  test("fails closed without configured auth and requires valid credentials when configured", async () => {
    await using tmp = await tmpdir({ git: true, config: { formatter: false, lsp: false } })
    const worktree = path.join(tmp.path, ".sonderr", "worktrees", "snapshot-auth")
    const route = `/sonderr/snapshot/remove?directory=${encodeURIComponent(tmp.path)}`
    const init = (authorization?: string): RequestInit => ({
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-sonderr-directory": tmp.path,
        ...(authorization ? { authorization } : {}),
      },
      body: JSON.stringify({ worktree }),
    })

    const noAuth = app({})
    const unsecured = await noAuth.request(route, init())
    expect(unsecured.status).toBe(401)

    setAuth("secret")
    const secured = app({ password: "secret" })
    const missing = await secured.request(route, init())
    const invalid = await secured.request(route, init(basic("sonderr", "wrong")))
    expect(missing.status).toBe(401)
    expect(invalid.status).toBe(401)

    const valid = await secured.request(route, init(basic("sonderr", "secret")))
    expect(valid.status).toBe(200)
    expect(await valid.json()).toBe(true)
  })
})
