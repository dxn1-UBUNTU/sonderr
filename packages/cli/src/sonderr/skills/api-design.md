---
name: api-design
description: API design patterns and best practices. Covers REST, GraphQL, gRPC, WebSocket, versioning, authentication, rate limiting, and error handling. Use for building any API.
---

# API Design Mastery

## REST API Design

```typescript
// Resource naming conventions
// Good:
GET    /users              // List users
GET    /users/:id          // Get single user
POST   /users              // Create user
PUT    /users/:id          // Replace user (full update)
PATCH  /users/:id          // Partial update
DELETE /users/:id          // Delete user

// Nested resources
GET    /users/:id/posts    // Get user's posts
POST   /users/:id/posts    // Create post for user
GET    /users/:id/posts/:postId

// Actions as sub-resources (when not CRUD)
POST   /orders/:id/cancel
POST   :/orders/:id/refund
POST   :/users/:id/activate
```

## Response Format Standards

```typescript
// Success response
{
  "data": {
    "id": "usr_123",
    "name": "Alice",
    "email": "alice@example.com"
  },
  "meta": {
    "requestId": "req_abc123"
  }
}

// Collection response
{
  "data": [
    { "id": "usr_123", "name": "Alice" },
    { "id": "usr_456", "name": "Bob" }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "perPage": 20,
    "hasMore": true
  },
  "links": {
    "self": "/users?page=1",
    "next": "/users?page=2",
    "last": "/users?page=8"
  }
}

// Error response
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "email",
        "message": "Must be a valid email address",
        "code": "INVALID_FORMAT"
      }
    ],
    "requestId": "req_abc123"
  }
}
```

## HTTP Status Code Usage

```
200 OK           — Successful GET, PUT, PATCH, DELETE
201 Created      — Successful POST (resource created)
202 Accepted     — Request accepted for async processing
204 No Content   — Successful DELETE, empty response
301 Moved        — Resource permanently moved
304 Not Modified — Cached version is still valid

400 Bad Request  — Malformed request syntax
401 Unauthorized — Authentication required
403 Forbidden    — Authenticated but not permitted
404 Not Found    — Resource doesn't exist
405 Method Not Allowed — HTTP method not supported
409 Conflict     — Resource state conflict (duplicate, version mismatch)
422 Unprocessable — Validation errors
429 Too Many Requests — Rate limit exceeded

500 Internal Server Error — Unexpected server error
502 Bad Gateway  — Upstream server error
503 Service Unavailable — Server temporarily unavailable
504 Gateway Timeout — Upstream server timeout
```

## Pagination Patterns

```typescript
// Cursor-based pagination (preferred for APIs)
interface CursorPaginatedResponse<T> {
  data: T[]
  pagination: {
    nextCursor: string | null
    hasMore: boolean
  }
}

async function listUsers(cursor?: string, limit: number = 20): Promise<CursorPaginatedResponse<User>> {
  const users = await db.users.findMany({
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    orderBy: { createdAt: "desc" },
  })

  const hasMore = users.length > limit
  const data = hasMore ? users.slice(0, -1) : users
  const nextCursor = hasMore ? data[data.length - 1]?.id : null

  return { data, pagination: { nextCursor, hasMore } }
}

// Offset pagination (for admin/internal APIs)
interface OffsetPaginatedResponse<T> {
  data: T[]
  pagination: {
    total: number
    page: number
    perPage: number
    totalPages: number
  }
}
```

## Rate Limiting

```typescript
// Token bucket rate limiter
class TokenBucket {
  private tokens: number
  private lastRefill: number

  constructor(
    private capacity: number,
    private refillRate: number  // tokens per second
  ) {
    this.tokens = capacity
    this.lastRefill = Date.now()
  }

  consume(tokens: number = 1): boolean {
    this.refill()
    if (this.tokens >= tokens) {
      this.tokens -= tokens
      return true
    }
    return false
  }

  private refill(): void {
    const now = Date.now()
    const elapsed = (now - this.lastRefill) / 1000
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillRate)
    this.lastRefill = now
  }
}

// Sliding window log rate limiter
class SlidingWindowLog {
  private logs: number[] = []

  constructor(
    private limit: number,
    private windowMs: number
  ) {}

  allow(): boolean {
    const now = Date.now()
    const windowStart = now - this.windowMs
    this.logs = this.logs.filter((t) => t > windowStart)

    if (this.logs.length < this.limit) {
      this.logs.push(now)
      return true
    }
    return false
  }
}

// Rate limit headers
function rateLimitHeaders(limit: number, remaining: number, reset: number) {
  return {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(Math.ceil(reset / 1000)),
    "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)),
  }
}
```

## Authentication Patterns

```typescript
// JWT with refresh tokens
interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

async function authenticate(credentials: Credentials): Promise<TokenPair> {
  const user = await verifyCredentials(credentials)
  const accessToken = await signJwt(
    { sub: user.id, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: "15m" }
  )
  const refreshToken = await signJwt(
    { sub: user.id, type: "refresh" },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: "7d" }
  )
  await storeRefreshToken(user.id, refreshToken)
  return { accessToken, refreshToken, expiresIn: 900 }
}

// API key authentication
async function authenticateApiKey(key: string): Promise<ApiKeyAuth> {
  const hash = crypto.createHash("sha256").update(key).digest("hex")
  const apiKey = await db.apiKeys.findUnique({
    where: { hash },
    include: { user: true, permissions: true },
  })
  if (!apiKey || !apiKey.active) throw new UnauthorizedError()
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) throw new UnauthorizedError("Key expired")
  return { user: apiKey.user, permissions: apiKey.permissions }
}

// OAuth 2.0 authorization code flow
// 1. GET /oauth/authorize?client_id=...&redirect_uri=...&scope=...&state=...
// 2. User authenticates and consents
// 3. Redirect to redirect_uri?code=...&state=...
// 4. POST /oauth/token with code → access_token
```

## API Versioning

```typescript
// URL path versioning (most common)
// /v1/users, /v2/users

// Header versioning
// Accept: application/vnd.api+json;version=2

// Query parameter versioning
// /users?version=2

// Version negotiation middleware
function versionedApi(versions: Record<string, Router>) {
  return async (req: Request, res: Response) => {
    const version = req.headers["api-version"] ?? "1"
    const router = versions[version as string]
    if (!router) {
      res.status(400).json({
        error: {
          code: "UNSUPPORTED_VERSION",
          message: `API version ${version} is not supported`,
          supportedVersions: Object.keys(versions),
        },
      })
      return
    }
    return router(req, res)
  }
}
```

## GraphQL Best Practices

```typescript
// Schema design
const typeDefs = gql`
  type Query {
    user(id: ID!): User
    users(first: Int, after: String): UserConnection!
  }

  type Mutation {
    createUser(input: CreateUserInput!): CreateUserPayload!
    updateUser(id: ID!, input: UpdateUserInput!): UpdateUserPayload!
  }

  type User {
    id: ID!
    name: String!
    email: String!
    posts(first: Int, after: String): PostConnection!
  }

  input CreateUserInput {
    name: String!
    email: String!
  }

  type CreateUserPayload {
    user: User
    errors: [UserError!]!
  }

  type UserError {
    field: [String!]!
    message: String!
  }
`

// DataLoader for N+1 prevention
const userLoader = new DataLoader<string, User>(async (ids) => {
  const users = await db.users.findMany({ where: { id: { in: ids as string[] } } })
  const userMap = new Map(users.map(u => [u.id, u]))
  return ids.map(id => userMap.get(id) || new Error(`User ${id} not found`))
})

// Resolver with authorization
const resolvers = {
  Query: {
    user: async (_: any, { id }: { id: string }, ctx: Context) => {
      await ctx.authorize("user:read", { userId: id })
      return userLoader.load(id)
    },
  },
}
```

## WebSocket Patterns

```typescript
// Connection management
class WebSocketManager {
  private connections: Map<string, WebSocket> = new Map()
  private rooms: Map<string, Set<string>> = new Map()

  add(id: string, ws: WebSocket): void {
    this.connections.set(id, ws)
    ws.on("close", () => this.remove(id))
  }

  remove(id: string): void {
    this.connections.delete(id)
    this.rooms.forEach((members) => members.delete(id))
  }

  joinRoom(connectionId: string, room: string): void {
    if (!this.rooms.has(room)) this.rooms.set(room, new Set())
    this.rooms.get(room)!.add(connectionId)
  }

  broadcast(room: string, message: any): void {
    const members = this.rooms.get(room)
    if (!members) return
    const payload = JSON.stringify(message)
    members.forEach((id) => {
      const ws = this.connections.get(id)
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(payload)
      }
    })
  }
}

// Heartbeat pattern
function setupHeartbeat(ws: WebSocket, intervalMs: number = 30000): void {
  let isAlive = true

  ws.on("pong", () => { isAlive = true })

  const interval = setInterval(() => {
    if (!isAlive) {
      ws.terminate()
      clearInterval(interval)
      return
    }
    isAlive = false
    ws.ping()
  }, intervalMs)

  ws.on("close", () => clearInterval(interval))
}
```

## Error Handling Middleware

```typescript
// Centralized error handling
interface ApiError extends Error {
  code: string
  statusCode: number
  details?: unknown
}

class ValidationError extends Error implements ApiError {
  code = "VALIDATION_ERROR"
  statusCode = 422
  constructor(public details: FieldError[]) {
    super("Validation failed")
  }
}

class NotFoundError extends Error implements ApiError {
  code = "NOT_FOUND"
  statusCode = 404
  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`)
  }
}

function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        requestId: req.id,
      },
    })
    return
  }

  // Unexpected error — log full details, return generic message
  logger.error("Unhandled error", { error: err, requestId: req.id })
  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
      requestId: req.id,
    },
  })
}
```

## Idempotency

```typescript
// Idempotent POST with idempotency key
async function createOrder(req: Request, res: Response) {
  const idempotencyKey = req.headers["idempotency-key"] as string
  if (!idempotencyKey) {
    res.status(400).json({ error: { code: "MISSING_IDEMPOTENCY_KEY" } })
    return
  }

  // Check if already processed
  const existing = await redis.get(`idempotency:${idempotencyKey}`)
  if (existing) {
    res.status(200).json(JSON.parse(existing))
    return
  }

  // Process and cache result
  const order = await processOrder(req.body)
  await redis.set(
    `idempotency:${idempotencyKey}`,
    JSON.stringify(order),
    "EX",
    86400  // 24 hour TTL
  )

  res.status(201).json(order)
}
```