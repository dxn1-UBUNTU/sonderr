---
name: caching
description: Caching strategies and patterns. Covers cache invalidation, distributed caching, CDN, memoization, cache-aside, write-through, and read-through patterns. Use for performance optimization.
---

# Caching Mastery

## Cache Invalidation Strategies

```
The 3 Problems of Caching:
  1. Cache Invalidation — When to update cached data
  2. Naming — How to key cached entries
  3. Thundering Herd — Many requests hitting expired cache

Strategies:
  — TTL (Time to Live) — Expire after fixed duration
  — Write-Through — Write to cache and DB simultaneously
  — Write-Behind — Write to cache, async write to DB
  — Cache-Aside — App manages cache (most common)
  — Read-Through — Cache loads from DB on miss
  — Refresh-Ahead — Proactively refresh before expiry
```

## Cache-Aside Pattern

```typescript
// Cache-Aside (Lazy Loading)
class CacheAside<T> {
  constructor(
    private cache: Cache,
    private loader: (key: string) => Promise<T>,
    private options: { ttlMs: number; staleWhileRevalidateMs?: number }
  ) {}

  async get(key: string): Promise<T> {
    const cached = await this.cache.get(key)

    if (cached && !this.isExpired(cached)) {
      // Serve stale while refreshing in background
      if (this.isStale(cached)) {
        this.refreshInBackground(key)
      }
      return cached.value
    }

    return this.loadAndCache(key)
  }

  private async loadAndCache(key: string): Promise<T> {
    const value = await this.loader(key)
    await this.cache.set(key, { value, cachedAt: Date.now() }, this.options.ttlMs)
    return value
  }

  private async refreshInBackground(key: string): Promise<void> {
    try {
      const value = await this.loader(key)
      await this.cache.set(key, { value, cachedAt: Date.now() }, this.options.ttlMs)
    } catch {
      // Silently fail — stale data still served
    }
  }

  private isExpired(cached: CachedEntry<T>): boolean {
    return Date.now() - cached.cachedAt > this.options.ttlMs
  }

  private isStale(cached: CachedEntry<T>): boolean {
    if (!this.options.staleWhileRevalidateMs) return false
    return Date.now() - cached.cachedAt > this.options.ttlMs - this.options.staleWhileRevalidateMs
  }

  async invalidate(key: string): Promise<void> {
    await this.cache.delete(key)
  }

  async invalidatePattern(pattern: string): Promise<void> {
    await this.cache.deletePattern(pattern)
  }
}
```

## Write-Through Pattern

```typescript
// Write-Through Cache
class WriteThrough<T> {
  constructor(
    private cache: Cache,
    private db: Database,
    private options: { ttlMs: number }
  ) {}

  async get(key: string): Promise<T | null> {
    const cached = await this.cache.get(key)
    if (cached) return cached

    const value = await this.db.find(key)
    if (value) {
      await this.cache.set(key, value, this.options.ttlMs)
    }
    return value
  }

  async set(key: string, value: T): Promise<void> {
    // Write to DB first, then cache
    await this.db.save(key, value)
    await this.cache.set(key, value, this.options.ttlMs)
  }

  async delete(key: string): Promise<void> {
    await this.db.delete(key)
    await this.cache.delete(key)
  }
}

// Write-Behind (Write-Back) Cache
class WriteBehind<T> {
  private writeQueue: Array<{ key: string; value: T }> = []
  private flushing = false

  constructor(
    private cache: Cache,
    private db: Database,
    private options: { flushIntervalMs: number; maxQueueSize: number }
  ) {
    setInterval(() => this.flush(), this.options.flushIntervalMs)
  }

  async set(key: string, value: T): Promise<void> {
    // Write to cache immediately, queue for DB
    await this.cache.set(key, value, Infinity)
    this.writeQueue.push({ key, value })

    if (this.writeQueue.length >= this.options.maxQueueSize) {
      await this.flush()
    }
  }

  private async flush(): Promise<void> {
    if (this.flushing || this.writeQueue.length === 0) return
    this.flushing = true

    const batch = this.writeQueue.splice(0, this.options.maxQueueSize)
    try {
      await this.db.batchSave(batch)
    } catch (error) {
      // Re-queue on failure
      this.writeQueue.unshift(...batch)
    } finally {
      this.flushing = false
    }
  }
}
```

## Cache Key Design

```typescript
// Cache key patterns
class CacheKey {
  static user(id: string): string {
    return `user:${id}`
  }

  static userByEmail(email: string): string {
    return `user:email:${email.toLowerCase()}`
  }

  static userPosts(userId: string, page: number, limit: number): string {
    return `user:${userId}:posts:${page}:${limit}`
  }

  static product(id: string): string {
    return `product:${id}`
  }

  static productList(filters: Record<string, unknown>, sort: string): string {
    const filterHash = hashObject(filters)
    return `products:${filterHash}:${sort}`
  }

  static rateLimit(ip: string, action: string): string {
    const window = Math.floor(Date.now() / 60000) // 1-minute window
    return `ratelimit:${ip}:${action}:${window}`
  }
}

// Key versioning for cache invalidation
class VersionedCache {
  private versions: Map<string, number> = new Map()

  async get<T>(namespace: string, key: string): Promise<T | null> {
    const version = this.versions.get(namespace) ?? 0
    const fullKey = `${namespace}:v${version}:${key}`
    return this.cache.get<T>(fullKey)
  }

  async set<T>(namespace: string, key: string, value: T, ttlMs: number): Promise<void> {
    const version = this.versions.get(namespace) ?? 0
    const fullKey = `${namespace}:v${version}:${key}`
    await this.cache.set(fullKey, value, ttlMs)
  }

  // Invalidate entire namespace by bumping version
  async invalidateNamespace(namespace: string): Promise<void> {
    const current = this.versions.get(namespace) ?? 0
    this.versions.set(namespace, current + 1)
  }
}
```

## Distributed Caching

```typescript
// Redis cluster caching with fallback
class DistributedCache {
  private localCache = new Map<string, { value: unknown; expiresAt: number }>()

  constructor(
    private redis: Redis,
    private options: {
      localCacheTtlMs: number
      remoteCacheTtlMs: number
      lockTimeoutMs: number
    }
  ) {}

  async get<T>(key: string): Promise<T | null> {
    // Check local cache first
    const local = this.localCache.get(key)
    if (local && local.expiresAt > Date.now()) {
      return local.value as T
    }

    // Check Redis
    const remote = await this.redis.get(key)
    if (remote) {
      const value = JSON.parse(remote)
      this.localCache.set(key, { value, expiresAt: Date.now() + this.options.localCacheTtlMs })
      return value
    }

    return null
  }

  async getOrSet<T>(key: string, producer: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key)
    if (cached) return cached

    // Prevent thundering herd with distributed lock
    const lockKey = `lock:${key}`
    const acquired = await this.redis.set(lockKey, "1", "PX", this.options.lockTimeoutMs, "NX")

    if (acquired) {
      try {
        const value = await producer()
        await this.set(key, value)
        return value
      } finally {
        await this.redis.del(lockKey)
      }
    } else {
      // Wait and retry
      await sleep(50)
      return this.getOrSet(key, producer)
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    const serialized = JSON.stringify(value)
    await this.redis.set(key, serialized, "PX", this.options.remoteCacheTtlMs)
    this.localCache.set(key, { value, expiresAt: Date.now() + this.options.localCacheTtlMs })
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(key)
    this.localCache.delete(key)
  }
}
```

## Cache Stampede Prevention

```typescript
// Probabilistic early expiration (prevents thundering herd)
class ProbabilisticCache<T> {
  constructor(
    private cache: Cache,
    private options: {
      ttlMs: number
      beta: number = 1.0
      refreshProbability: number = 0.1
    }
  ) {}

  async get(key: string, loader: () => Promise<T>): Promise<T> {
    const cached = await this.cache.get<{
      value: T
      expiresAt: number
      createdAt: number
    }>(key)

    if (cached) {
      const now = Date.now()
      const age = now - cached.createdAt
      const ttl = cached.expiresAt - cached.createdAt

      // Probabilistic early refresh
      const shouldRefresh = this.shouldRefresh(age, ttl)
      if (shouldRefresh && Math.random() < this.options.refreshProbability) {
        // Refresh in background
        this.refresh(key, loader)
      }

      if (now < cached.expiresAt) {
        return cached.value
      }
    }

    return this.loadAndCache(key, loader)
  }

  private shouldRefresh(age: number, ttl: number): boolean {
    const remaining = ttl - age
    const probability = this.options.beta * Math.exp(age / ttl)
    return remaining < ttl * 0.2 && probability > 0.5
  }

  private async refresh<T>(key: string, loader: () => Promise<T>): Promise<void> {
    try {
      const value = await loader()
      await this.cache.set(key, { value, createdAt: Date.now(), expiresAt: Date.now() + this.options.ttlMs }, this.options.ttlMs)
    } catch {
      // Ignore refresh failures
    }
  }

  private async loadAndCache<T>(key: string, loader: () => Promise<T>): Promise<T> {
    const value = await loader()
    await this.cache.set(key, { value, createdAt: Date.now(), expiresAt: Date.now() + this.options.ttlMs }, this.options.ttlMs)
    return value
  }
}
```

## CDN Caching

```typescript
// CDN cache headers
function cdnCacheHeaders(options: {
  maxAge: number
  sMaxAge?: number
  staleWhileRevalidate?: number
  staleIfError?: number
  isPublic?: boolean
}): Record<string, string> {
  const directives: string[] = [
    options.isPublic !== false ? "public" : "private",
    `max-age=${options.maxAge}`,
  ]

  if (options.sMaxAge !== undefined) {
    directives.push(`s-maxage=${options.sMaxAge}`)
  }
  if (options.staleWhileRevalidate !== undefined) {
    directives.push(`stale-while-revalidate=${options.staleWhileRevalidate}`)
  }
  if (options.staleIfError !== undefined) {
    directives.push(`stale-if-error=${options.staleIfError}`)
  }

  return {
    "Cache-Control": directives.join(", "),
  }
}

// Usage examples
const staticAssetHeaders = cdnCacheHeaders({
  maxAge: 31536000,        // 1 year
  staleWhileRevalidate: 86400,  // 1 day
})

const apiResponseHeaders = cdnCacheHeaders({
  maxAge: 0,
  sMaxAge: 300,            // 5 minutes at CDN
  staleWhileRevalidate: 60,  // 1 minute
  isPublic: false,
})

const pageHeaders = cdnCacheHeaders({
  maxAge: 0,
  sMaxAge: 60,             // 1 minute at CDN
  staleWhileRevalidate: 3600,  // 1 hour
})
```

## Memoization

```typescript
// Memoization with TTL
function memoize<T extends (...args: any[]) => any>(
  fn: T,
  options: { ttlMs?: number; keyFn?: (...args: Parameters<T>) => string; maxSize?: number }
): T {
  const cache = new Map<string, { value: ReturnType<T>; expiresAt: number }>()

  const keyFn = options.keyFn ?? ((...args) => JSON.stringify(args))
  const ttlMs = options.ttlMs ?? Infinity

  const memoized = ((...args: Parameters<T>): ReturnType<T> => {
    const key = keyFn(...args)
    const cached = cache.get(key)

    if (cached && cached.expiresAt > Date.now()) {
      return cached.value
    }

    const value = fn(...args)
    cache.set(key, { value, expiresAt: Date.now() + ttlMs })

    // LRU eviction
    if (options.maxSize && cache.size > options.maxSize) {
      const firstKey = cache.keys().next().value
      if (firstKey) cache.delete(firstKey)
    }

    return value
  }) as T

  memoized.clear = () => cache.clear()
  memoized.delete = (...args: Parameters<T>) => cache.delete(keyFn(...args))

  return memoized
}

// Usage
const expensiveCalculation = memoize(
  (n: number) => {
    // ... expensive computation
    return fibonacci(n)
  },
  { ttlMs: 60000, maxSize: 1000 }
)

// Async memoization
function memoizeAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: { ttlMs?: number; keyFn?: (...args: Parameters<T>) => string; maxSize?: number }
): T {
  const cache = new Map<string, { promise: Awaited<ReturnType<T>>; expiresAt: number }>()
  const keyFn = options.keyFn ?? ((...args) => JSON.stringify(args))
  const ttlMs = options.ttlMs ?? Infinity

  const memoized = (async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    const key = keyFn(...args)
    const cached = cache.get(key)

    if (cached && cached.expiresAt > Date.now()) {
      return cached.promise
    }

    const promise = fn(...args)
    cache.set(key, { promise, expiresAt: Date.now() + ttlMs })

    if (options.maxSize && cache.size > options.maxSize) {
      const firstKey = cache.keys().next().value
      if (firstKey) cache.delete(firstKey)
    }

    return promise
  }) as T

  return memoized
}
```

## Cache Warming

```typescript
// Cache warming strategy
class CacheWarmer {
  constructor(
    private cache: Cache,
    private registry: Array<{
      key: string
      loader: () => Promise<unknown>
      ttlMs: number
      priority: number
    }>
  ) {}

  async warm(keys?: string[]): Promise<void> {
    const entries = keys
      ? this.registry.filter(e => keys.includes(e.key))
      : [...this.registry].sort((a, b) => b.priority - a.priority)

    await mapConcurrent(entries, 5, async (entry) => {
      try {
        const value = await entry.loader()
        await this.cache.set(entry.key, value, entry.ttlMs)
      } catch (error) {
        console.error(`Failed to warm cache for ${entry.key}:`, error)
      }
    })
  }

  // Scheduled warming
  schedule(intervalMs: number): () => void {
    const interval = setInterval(() => this.warm(), intervalMs)
    return () => clearInterval(interval)
  }
}
```