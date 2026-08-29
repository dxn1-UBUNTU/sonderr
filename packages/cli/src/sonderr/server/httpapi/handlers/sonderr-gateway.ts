import {
  GatewayError,
  fetchCloudSession,
  fetchSonderrImageModels,
  fetchSonderrTranscriptionModels,
  getCloudSessions,
  getOrganizationId,
  getToken,
  normalizeClawStatus,
} from "@sonderr/sonderr-gateway"
import {
  HEADER_FEATURE,
  HEADER_ORGANIZATIONID,
  SONDERR_API_BASE,
  SONDERR_CHAT_URL,
  SONDERR_EVENT_SERVICE_URL,
  clearModesCache,
  fetchBalance,
  fetchSonderrNotifications,
  fetchSonderrPassState,
  fetchOrganizationModes,
  fetchProfile,
} from "@sonderr/sonderr-gateway"
import { DIRECT_FIM_ENV, requestMistralFim, resolveFimTarget } from "@sonderr/sonderr-gateway/fim"
import { DIRECT_EDIT_ENV, extractFencedBody, resolveEditTarget } from "@sonderr/sonderr-gateway/edit"
import { buildMercuryEditPrompt } from "@sonderr/sonderr-gateway/edit-prompt"
import { buildSonderrHeaders } from "@sonderr/sonderr-gateway"
import { Effect, Schema } from "effect"
import * as Stream from "effect/Stream"
import { HttpServerRequest, HttpServerResponse } from "effect/unstable/http"
import { HttpApiBuilder, HttpApiError } from "effect/unstable/httpapi"
import * as Log from "@sonderr/core/util/log"
import { Flag } from "@sonderr/core/flag/flag"
import { Database } from "@sonderr/core/database/database"
import { SonderrConfig } from "@/sonderr/config/config"
import { Auth } from "@/auth"
import { EventV2Bridge } from "@/event-v2-bridge"
import { Storage } from "@/storage/storage"
import { Instance } from "@/sonderr/instance"
import { InstanceStore } from "@/project/instance-store"
import { ModelCache } from "@/provider/model-cache"
import { InstanceHttpApi } from "@/server/routes/instance/httpapi/api"
import { AudioTranscriptionsBody, ClawStatus, CloudSessionImportError, EditBody, FimBody } from "../groups/sonderr-gateway"

const FIM_TIMEOUT_MS = 30_000
const log = Log.create({ service: "sonderr-gateway" })

function jsonError(error: string, status: number) {
  return HttpServerResponse.jsonUnsafe({ error }, { status })
}

function logError(route: string, err: unknown) {
  log.error("unhandled error", { route, err })
}

export const sonderrGatewayHandlers = HttpApiBuilder.group(InstanceHttpApi, "sonderrGateway", (handlers) =>
  Effect.gen(function* () {
    const auth = yield* Auth.Service
    const store = yield* InstanceStore.Service
    const cache = yield* ModelCache.Service
    const events = yield* EventV2Bridge.Service
    const database = yield* Database.Service
    const storage = yield* Storage.Service

    const profile = Effect.fn("SonderrGatewayHttpApi.profile")(function* () {
      const info = yield* auth.get("sonderr").pipe(Effect.mapError(() => new HttpApiError.BadRequest({})))
      if (!info || info.type !== "oauth") return yield* Effect.fail(new HttpApiError.Unauthorized({}))

      const currentOrgId = info.accountId ?? null
      const [profile, balance, sonderrPass] = yield* Effect.tryPromise({
        try: () =>
          Promise.all([
            fetchProfile(info.access),
            fetchBalance(info.access, currentOrgId ?? undefined),
            fetchSonderrPassState(info.access),
          ]),
        catch: () => new HttpApiError.BadRequest({}),
      })
      return { profile, balance, sonderrPass, currentOrgId }
    })

    const authStatus = Effect.fn("SonderrGatewayHttpApi.authStatus")(function* () {
      const info = yield* auth.get("sonderr").pipe(Effect.mapError(() => new HttpApiError.BadRequest({})))
      const type = getToken(info) && (info?.type === "api" || info?.type === "oauth") ? info.type : undefined
      if (!type) return { authenticated: false }
      return { authenticated: true, type }
    })

    const proxyAuth = Effect.fn("SonderrGatewayHttpApi.proxyAuth")(function* () {
      const info = yield* auth.get("sonderr").pipe(Effect.mapError(() => new HttpApiError.Unauthorized({})))
      return {
        auth: info,
        token: getToken(info),
        organizationId: getOrganizationId(info),
      }
    })

    const modes = Effect.fn("SonderrGatewayHttpApi.modes")(function* () {
      const info = yield* auth.get("sonderr").pipe(Effect.catch(() => Effect.succeed(undefined)))
      if (!info || info.type !== "oauth" || !info.access || !info.accountId) return { modes: [] }

      const org = info.accountId
      return yield* Effect.promise(() => fetchOrganizationModes(info.access, org)).pipe(
        Effect.map((modes) => ({ modes })),
        Effect.catch(() => Effect.succeed({ modes: [] })),
      )
    })

    const fim = Effect.fn("SonderrGatewayHttpApi.fim")(function* (ctx: { payload: typeof FimBody.Type }) {
      const target = resolveFimTarget(ctx.payload.provider, ctx.payload.model)
      const info = target.provider === "sonderr" ? yield* proxyAuth() : undefined
      const token = yield* Effect.gen(function* () {
        if (target.provider === "sonderr") return info?.token
        const item = yield* auth.get(target.provider).pipe(Effect.mapError(() => new HttpApiError.Unauthorized({})))
        if (item?.type === "api") return item.key
        return DIRECT_FIM_ENV[target.provider].map((key) => process.env[key]).find(Boolean)
      })

      if (target.provider === "sonderr" && !info?.auth) return yield* Effect.fail(new HttpApiError.Unauthorized({}))
      if (!token) return yield* Effect.fail(new HttpApiError.Unauthorized({}))

      const request = yield* HttpServerRequest.HttpServerRequest
      const signal =
        request.source instanceof Request
          ? AbortSignal.any([request.source.signal, AbortSignal.timeout(FIM_TIMEOUT_MS)])
          : AbortSignal.timeout(FIM_TIMEOUT_MS)
      const response = yield* Effect.promise(async () => {
        try {
          const run = async (url: string): Promise<Response> => {
            console.info(`[FIM] request provider=${target.provider} model=${target.model} url=${url}`)
            return fetch(url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                ...(target.provider === "sonderr"
                  ? buildSonderrHeaders(undefined, { sonderrOrganizationId: info?.organizationId })
                  : {}),
                ...(target.provider === "sonderr" ? { [HEADER_FEATURE]: "autocomplete" } : {}),
              },
              signal,
              body: JSON.stringify({
                model: target.model,
                prompt: ctx.payload.prefix,
                suffix: ctx.payload.suffix,
                max_tokens: ctx.payload.maxTokens ?? 256,
                temperature: ctx.payload.temperature ?? 0.2,
                stream: true,
              }),
            })
          }
          if (target.provider === "mistral") return requestMistralFim(run)
          return run(target.url)
        } catch (err) {
          if (err instanceof DOMException && err.name === "TimeoutError")
            return Response.json({ error: "FIM request timed out" }, { status: 504 })
          if (signal.aborted) return Response.json({ error: "FIM request canceled" }, { status: 499 })
          throw err
        }
      })
      if (!response.ok) {
        const text = yield* Effect.promise(() => response.text())
        return HttpServerResponse.jsonUnsafe(
          { error: `FIM request failed: ${response.status} ${text}` },
          { status: response.status },
        )
      }
      if (!response.body) return HttpServerResponse.raw(null, { status: response.status })

      return HttpServerResponse.stream(
        Stream.fromReadableStream({
          evaluate: () => response.body!,
          onError: (err) => err,
        }),
        {
          contentType: "text/event-stream",
          headers: {
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        },
      )
    })

    const edit = Effect.fn("SonderrGatewayHttpApi.edit")(function* (ctx: { payload: typeof EditBody.Type }) {
      const target = resolveEditTarget(ctx.payload.provider, ctx.payload.model)
      if (target.provider === "sonderr" && !target.url) {
        return yield* Effect.fail(new HttpApiError.BadRequest({}))
      }
      const proxy = target.provider === "sonderr" ? yield* proxyAuth() : undefined
      const token = yield* Effect.gen(function* () {
        if (target.provider === "sonderr") return proxy?.token
        const item = yield* auth.get(target.provider).pipe(Effect.mapError(() => new HttpApiError.Unauthorized({})))
        if (item?.type === "api") return item.key
        return DIRECT_EDIT_ENV[target.provider].map((key) => process.env[key]).find(Boolean)
      })
      if (target.provider === "sonderr" && !proxy?.auth) return yield* Effect.fail(new HttpApiError.Unauthorized({}))
      if (!token) return yield* Effect.fail(new HttpApiError.Unauthorized({}))

      const request = yield* HttpServerRequest.HttpServerRequest
      const signal =
        request.source instanceof Request
          ? AbortSignal.any([request.source.signal, AbortSignal.timeout(FIM_TIMEOUT_MS)])
          : AbortSignal.timeout(FIM_TIMEOUT_MS)

      // Assemble the Mercury sentinel prompt from the structured context the
      // client sent — same builder every editor frontend shares.
      const content = buildMercuryEditPrompt({
        currentFilePath: ctx.payload.currentFilePath,
        currentFileContent: ctx.payload.currentFileContent,
        cursorLine: ctx.payload.cursorLine,
        cursorCharacter: ctx.payload.cursorCharacter,
        editableRegionStartLine: ctx.payload.editableRegionStartLine,
        editableRegionEndLine: ctx.payload.editableRegionEndLine,
        recentlyViewedSnippets: [...ctx.payload.recentlyViewedSnippets],
        editDiffHistory: [...ctx.payload.editDiffHistory],
      })

      const response = yield* Effect.promise(async () => {
        try {
          return await fetch(target.url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
              ...(target.provider === "sonderr"
                ? buildSonderrHeaders(undefined, { sonderrOrganizationId: proxy?.organizationId })
                : {}),
              ...(target.provider === "sonderr" ? { [HEADER_FEATURE]: "autocomplete" } : {}),
            },
            signal,
            body: JSON.stringify({
              model: target.model,
              max_tokens: ctx.payload.maxTokens ?? 512,
              // Mercury rejects role:"system" on this endpoint — must be a single user message.
              messages: [{ role: "user", content }],
            }),
          })
        } catch (err) {
          if (err instanceof DOMException && err.name === "TimeoutError")
            return Response.json({ error: "Edit request timed out" }, { status: 504 })
          if (signal.aborted) return Response.json({ error: "Edit request canceled" }, { status: 499 })
          throw err
        }
      })

      if (!response.ok) {
        // Pass the upstream status through (mirrors the FIM handler) so the
        // client can distinguish auth/credit/rate-limit/server failures
        // instead of collapsing everything to 400.
        const text = yield* Effect.promise(async () => {
          try {
            return await response.text()
          } catch {
            return "<unreadable>"
          }
        })
        return HttpServerResponse.jsonUnsafe(
          { error: `Edit request failed: ${response.status} ${text}` },
          { status: response.status },
        )
      }

      const json = yield* Effect.promise(
        () =>
          response.json() as Promise<{
            choices?: Array<{ message?: { content?: string } }>
            usage?: { prompt_tokens?: number; completion_tokens?: number }
          }>,
      )
      const raw = json.choices?.[0]?.message?.content ?? ""
      const body = extractFencedBody(raw)
      return {
        content: body,
        usage: json.usage
          ? {
              prompt_tokens: json.usage.prompt_tokens,
              completion_tokens: json.usage.completion_tokens,
            }
          : undefined,
      }
    })

    const audioTranscriptions = Effect.fn("SonderrGatewayHttpApi.audioTranscriptions")(function* (ctx: {
      payload: typeof AudioTranscriptionsBody.Type
    }) {
      const info = yield* proxyAuth()
      if (!info.auth) return yield* Effect.fail(new HttpApiError.Unauthorized({}))
      if (!info.token) return yield* Effect.fail(new HttpApiError.Unauthorized({}))

      const request = yield* HttpServerRequest.HttpServerRequest
      const response = yield* Effect.tryPromise({
        try: () =>
          fetch(`${SONDERR_API_BASE}/api/gateway/v1/audio/transcriptions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${info.token}`,
              ...buildSonderrHeaders(undefined, { sonderrOrganizationId: info.organizationId }),
              [HEADER_FEATURE]: "vscode-extension",
            },
            signal: request.source instanceof Request ? request.source.signal : undefined,
            body: JSON.stringify(ctx.payload),
          }),
        catch: () => new HttpApiError.BadRequest({}),
      })
      const text = yield* Effect.promise(() => response.text())
      return HttpServerResponse.raw(text, {
        status: response.status,
        contentType: response.headers.get("Content-Type") ?? "application/json",
      })
    })

    const notifications = Effect.fn("SonderrGatewayHttpApi.notifications")(function* () {
      // Locally-detected notice about leftover sonderr config; appended so it reuses each client's dismissal path.
      const notice = SonderrConfig.sonderrConfigNotification({
        directory: Instance.directory,
        worktree: Instance.worktree,
        scanProject: !Flag.SONDERR_DISABLE_PROJECT_CONFIG,
      })
      const append = <T>(list: T[]) => (notice ? [...list, notice] : list)

      const info = yield* auth.get("sonderr").pipe(Effect.mapError(() => new HttpApiError.BadRequest({})))
      const token = getToken(info)
      if (!token) return append([])

      const cloud = yield* Effect.promise(() =>
        fetchSonderrNotifications({
          sonderrToken: token,
          sonderrOrganizationId: getOrganizationId(info),
        }),
      )
      return append(cloud)
    })

    const organization = Effect.fn("SonderrGatewayHttpApi.organization")(function* (ctx) {
      const info = yield* auth.get("sonderr").pipe(Effect.mapError(() => new HttpApiError.Unauthorized({})))
      if (!info || info.type !== "oauth") return yield* Effect.fail(new HttpApiError.Unauthorized({}))

      yield* auth
        .set("sonderr", {
          type: "oauth",
          refresh: info.refresh,
          access: info.access,
          expires: info.expires,
          ...(ctx.payload.organizationId && { accountId: ctx.payload.organizationId }),
        })
        .pipe(Effect.mapError(() => new HttpApiError.Unauthorized({})))

      yield* cache.clear("sonderr")
      clearModesCache()
      yield* store.disposeAll().pipe(Effect.mapError(() => new HttpApiError.Unauthorized({})))
      return true
    })

    const clawStatus = Effect.fn("SonderrGatewayHttpApi.clawStatus")(function* () {
      const info = yield* auth.get("sonderr").pipe(Effect.mapError(() => new HttpApiError.ServiceUnavailable({})))
      const token = getToken(info)
      if (!token) return yield* Effect.fail(new HttpApiError.Unauthorized({}))

      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      }
      const org = getOrganizationId(info)
      if (org) headers[HEADER_ORGANIZATIONID] = org

      return yield* Effect.tryPromise({
        try: async () => {
          const response = await fetch(`${SONDERR_API_BASE}/api/sonderrclaw/status`, { headers })
          if (!response.ok) throw new GatewayError(await response.text(), response.status)
          return Schema.decodeUnknownPromise(ClawStatus)(normalizeClawStatus(await response.json()))
        },
        catch: (err) => err,
      }).pipe(
        Effect.match({
          onFailure: (err) => {
            if (err instanceof GatewayError)
              return jsonError(`SonderrClaw request failed: ${err.status} ${err.message}`, err.status)
            logError("claw/status", err)
            return jsonError("Failed to reach SonderrClaw", 502)
          },
          onSuccess: (result) => result,
        }),
      )
    })

    const clawChatCredentials = Effect.fn("SonderrGatewayHttpApi.clawChatCredentials")(function* () {
      const info = yield* auth.get("sonderr").pipe(Effect.mapError(() => new HttpApiError.Unauthorized({})))
      const token = getToken(info)
      if (!token) return yield* Effect.fail(new HttpApiError.Unauthorized({}))

      const expires = info?.type === "oauth" ? info.expires : Date.now() + 365 * 24 * 60 * 60 * 1000
      return {
        token,
        expiresAt: new Date(expires).toISOString(),
        sonderrChatUrl: SONDERR_CHAT_URL,
        eventServiceUrl: SONDERR_EVENT_SERVICE_URL,
      }
    })

    const cloudSessions = Effect.fn("SonderrGatewayHttpApi.cloudSessions")(function* (ctx) {
      const info = yield* auth.get("sonderr").pipe(Effect.mapError(() => new HttpApiError.BadRequest({})))
      const token = getToken(info)
      if (!token) return yield* Effect.fail(new HttpApiError.Unauthorized({}))

      const query = {
        ...ctx.query,
        limit: ctx.query.limit === undefined ? undefined : Number(ctx.query.limit),
      }

      return yield* Effect.tryPromise({
        try: () => getCloudSessions(token, query),
        catch: (err) => err,
      }).pipe(
        Effect.match({
          onFailure: (err) => {
            if (err instanceof GatewayError) return jsonError(err.message, err.status)
            logError("cloud-sessions", err)
            return jsonError("Internal error", 500)
          },
          onSuccess: (result) => result,
        }),
      )
    })

    const cloudSession = Effect.fn("SonderrGatewayHttpApi.cloudSession")(function* (ctx) {
      const info = yield* auth.get("sonderr").pipe(Effect.mapError(() => new HttpApiError.Unauthorized({})))
      const token = getToken(info)
      if (!token) return yield* Effect.fail(new HttpApiError.Unauthorized({}))

      const result = yield* Effect.tryPromise({
        try: () => fetchCloudSession(token, ctx.params.id),
        catch: (err) => err,
      }).pipe(
        Effect.catch((err) =>
          Effect.sync(() => {
            logError("cloud/session/get", err)
            return undefined
          }),
        ),
      )
      if (!result) return jsonError("Internal error", 500)
      if (!result.ok) return jsonError(result.error, result.status)
      return result.data
    })

    const cloudSessionImport = Effect.fn("SonderrGatewayHttpApi.cloudSessionImport")(function* (ctx) {
      // Load the helper lazily: a static top-level import pulls the HTTP
      // handler graph into the remote-sender module graph and breaks the
      // create_session test's module init. Run the helper's Effect on the
      // request Effect (yield*) so the request-scoped InstanceRef/WorkspaceRef
      // reach the persistence path instead of the AppRuntime default context.
      const { CloudSessionImportInProcess } = yield* Effect.promise(() =>
        import("@/sonderr/server/import-cloud-session-in-process"),
      )
      const outcome = yield* CloudSessionImportInProcess.importSession(ctx.payload.sessionId).pipe(
        Effect.provideService(Auth.Service, auth),
        Effect.provideService(EventV2Bridge.Service, events),
        Effect.provideService(Database.Service, database),
        Effect.provideService(Storage.Service, storage),
        Effect.match({
          onFailure: (err) => {
            if (err instanceof CloudSessionImportInProcess.Unauthorized) return { tag: "unauthorized" as const }
            if (err instanceof CloudSessionImportInProcess.Upstream) {
              return { tag: "upstream" as const, error: err.error, status: err.status }
            }
            if (err instanceof CloudSessionImportInProcess.BadRequest) return { tag: "badrequest" as const }
            return { tag: "internal" as const }
          },
          onSuccess: (session) => ({ tag: "ok" as const, session }),
        }),
      )
      switch (outcome.tag) {
        case "unauthorized":
          return yield* Effect.fail(new HttpApiError.Unauthorized({}))
        case "upstream":
          return jsonError(outcome.error, outcome.status)
        case "badrequest":
          return yield* Effect.fail(new HttpApiError.BadRequest({}))
        case "internal":
          return yield* Effect.fail(new CloudSessionImportError({ error: "Internal error" }))
        case "ok":
          return outcome.session
      }
    })

    const imageModels = Effect.fn("SonderrGatewayHttpApi.imageModels")(function* () {
      const info = yield* proxyAuth()
      if (!info.auth) return yield* Effect.fail(new HttpApiError.Unauthorized({}))
      if (!info.token) return yield* Effect.fail(new HttpApiError.Unauthorized({}))

      const result = yield* Effect.tryPromise({
        try: () =>
          fetchSonderrImageModels({
            sonderrToken: info.token,
            sonderrOrganizationId: info.organizationId,
          }),
        catch: () => new HttpApiError.BadRequest({}),
      })

      if (result.error) {
        const err =
          result.error.kind === "unauthorized" ? new HttpApiError.Unauthorized({}) : new HttpApiError.BadRequest({})
        return yield* Effect.fail(err)
      }

      return result.models
    })

    const transcriptionModels = Effect.fn("SonderrGatewayHttpApi.transcriptionModels")(function* () {
      const info = yield* proxyAuth()
      if (!info.auth) return yield* Effect.fail(new HttpApiError.Unauthorized({}))
      if (!info.token) return yield* Effect.fail(new HttpApiError.Unauthorized({}))

      const result = yield* Effect.tryPromise({
        try: () =>
          fetchSonderrTranscriptionModels({
            sonderrToken: info.token,
            sonderrOrganizationId: info.organizationId,
          }),
        catch: () => new HttpApiError.BadRequest({}),
      })

      if (result.error) {
        const err =
          result.error.kind === "unauthorized" ? new HttpApiError.Unauthorized({}) : new HttpApiError.BadRequest({})
        return yield* Effect.fail(err)
      }

      return result.models
    })

    return handlers
      .handle("profile", profile)
      .handle("authStatus", authStatus)
      .handle("modes", modes)
      .handle("fim", fim)
      .handle("edit", edit)
      .handle("audioTranscriptions", audioTranscriptions)
      .handle("imageModels", imageModels)
      .handle("transcriptionModels", transcriptionModels)
      .handle("notifications", notifications)
      .handle("organization", organization)
      .handle("clawStatus", clawStatus)
      .handle("clawChatCredentials", clawChatCredentials)
      .handle("cloudSessions", cloudSessions)
      .handle("cloudSession", cloudSession)
      .handle("cloudSessionImport", cloudSessionImport)
  }),
)
