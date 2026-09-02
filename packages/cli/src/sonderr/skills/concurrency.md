---
name: concurrency
description: Concurrency patterns and parallel execution. Covers async/await best practices, worker threads, race conditions, deadlocks, cancellation, and concurrent data structures. Use for multi-threaded or async-heavy code.
---

# Concurrency Mastery

## Async/Await Patterns

```typescript
// Sequential vs Parallel
// Bad: sequential when independent
const user = await getUser(id)
const posts = await getPosts(id)  // Doesn't depend on user
const comments = await getComments(id)  // Doesn't depend on user

// Good: parallelize independent work
const [user, posts, comments] = await Promise.all([
  getUser(id),
  getPosts(id),
  getComments(id),
])

// Partial failure handling
const [userResult, postsResult] = await Promise.allSettled([
  getUser(id),
  getPosts(id),
])

if (userResult.status === "fulfilled") {
  console.log(userResult.value)
} else {
  console.error(userResult.reason)
}
```

## Error Boundaries in Parallel Work

```typescript
// Fail-fast with Promise.all
async function loadDashboard(userId: string) {
  const [user, orders, notifications] = await Promise.all([
    getUser(userId),
    getOrders(userId),
    getNotifications(userId),
  ])
  return { user, orders, notifications }
}

// Graceful degradation with Promise.allSettled
async function loadDashboardSafe(userId: string) {
  const results = await Promise.allSettled([
    getUser(userId),
    getOrders(userId),
    getNotifications(userId),
  ])

  return {
    user: results[0].status === "fulfilled" ? results[0].value : null,
    orders: results[1].status === "fulfilled" ? results[1].value : [],
    notifications: results[2].status === "fulfilled" ? results[2].value : [],
    errors: results
      .map((r, i) => (r.status === "rejected" ? { index: i, error: r.reason } : null))
      .filter(Boolean),
  }
}
```

## Concurrency Limiting

```typescript
// Semaphore pattern
class Semaphore {
  private permits: number
  private queue: Array<() => void> = []

  constructor(permits: number) {
    this.permits = permits
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--
      return
    }
    return new Promise((resolve) => this.queue.push(resolve))
  }

  release(): void {
    this.permits++
    const next = this.queue.shift()
    if (next) {
      this.permits--
      next()
    }
  }
}

// Usage
const semaphore = new Semaphore(5)  // Max 5 concurrent

async function limitedTask<T>(fn: () => Promise<T>): Promise<T> {
  await semaphore.acquire()
  try {
    return await fn()
  } finally {
    semaphore.release()
  }
}

// Map with concurrency limit
async function mapConcurrent<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  const executing: Set<Promise<void>> = new Set()

  for (let i = 0; i < items.length; i++) {
    const p = fn(items[i], i).then((result) => {
      results[i] = result
      executing.delete(p)
    })
    executing.add(p)

    if (executing.size >= limit) {
      await Promise.race(executing)
    }
  }

  await Promise.all(executing)
  return results
}
```

## Cancellation Patterns

```typescript
// AbortController for fetch cancellation
async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, { signal: controller.signal })
    return response
  } finally {
    clearTimeout(timeout)
  }
}

// Cooperative cancellation with AbortSignal
async function processItems(
  items: string[],
  signal: AbortSignal
): Promise<void> {
  for (const item of items) {
    if (signal.aborted) return
    await processItem(item)
  }
}

// Timeout wrapper
async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string = "Operation timed out"
): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(message)), ms)
  )
  return Promise.race([promise, timeout])
}
```

## Race Conditions and Atomic Operations

```typescript
// Compare-and-swap pattern
class AtomicCounter {
  private value: number = 0

  async increment(): Promise<number> {
    const current = this.value
    // Simulate potential race
    await Promise.resolve()
    this.value = current + 1
    return this.value
  }
}

// Proper atomic with mutex
class SafeCounter {
  private value: number = 0
  private mutex = new Mutex()

  async increment(): Promise<number> {
    return thisMutex.runExclusive(() => {
      this.value++
      return this.value
    })
  }
}

// Optimistic concurrency control
async function updateWithRetry<T>(
  fetch: () => Promise<T>,
  update: (current: T) => T,
  save: (updated: T) => Promise<void>,
  maxRetries: number = 5
): Promise<void> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const current = await fetch()
    const updated = update(current)
    try {
      await save(updated)
      return
    } catch (e) {
      if (isConflictError(e)) continue
      throw e
    }
  }
  throw new Error("Max retries exceeded due to conflicts")
}
```

## Worker Threads

```typescript
// Main thread
import { Worker } from "worker_threads"

function runWorker<T, R>(workerData: T): Promise<R> {
  return new Promise((resolve, reject) => {
    const worker = new Worker("./worker.js", { workerData })
    worker.on("message", resolve)
    worker.on("error", reject)
    worker.on("exit", (code) => {
      if (code !== 0) reject(new Error(`Worker exited with code ${code}`))
    })
  })
}

// Worker pool
class WorkerPool<T, R> {
  private workers: Worker[] = []
  private queue: Array<{ data: T; resolve: (r: R) => void; reject: (e: Error) => void }> = []
  private available: Set<Worker> = new Set()

  constructor(private size: number, private workerScript: string) {
    for (let i = 0; i < size; i++) {
      const worker = new Worker(workerScript)
      worker.on("message", (result) => {
        const task = (worker as any).currentTask
        if (task) {
          task.resolve(result)
          ;(worker as any).currentTask = null
          this.available.add(worker)
          this.processNext()
        }
      })
      this.workers.push(worker)
      this.available.add(worker)
    }
  }

  private processNext() {
    if (this.queue.length === 0 || this.available.size === 0) return
    const worker = this.available.values().next().value as Worker
    this.available.delete(worker)
    const task = this.queue.shift()!
    ;(worker as any).currentTask = task
    worker.postMessage(task.data)
  }

  execute(data: T): Promise<R> {
    return new Promise((resolve, reject) => {
      this.queue.push({ data, resolve, reject })
      this.processNext()
    })
  }

  terminate(): Promise<void[]> {
    return Promise.all(this.workers.map((w) => w.terminate()))
  }
}
```

## Event-Driven Patterns

```typescript
// Typed EventEmitter
type EventMap = {
  "user:created": (user: User) => void
  "user:deleted": (id: string) => void
  "order:completed": (order: Order) => void
}

class TypedEmitter<T extends Record<string, (...args: any[]) => void>> {
  private listeners: { [K in keyof T]?: Set<T[K]> } = {}

  on<K extends keyof T>(event: K, listener: T[K]): () => void {
    if (!this.listeners[event]) this.listeners[event] = new Set()
    this.listeners[event]!.add(listener)
    return () => this.off(event, listener)
  }

  off<K extends keyof T>(event: K, listener: T[K]): void {
    this.listeners[event]?.delete(listener)
  }

  emit<K extends keyof T>(event: K, ...args: Parameters<T[K]>): void {
    this.listeners[event]?.forEach((listener) => listener(...args))
  }
}

// Async iterator from events
async function* onEvents<T>(emitter: EventEmitter, event: string): AsyncGenerator<T> {
  const queue: T[] = []
  let resolver: (() => void) | null = null

  const handler = (data: T) => {
    queue.push(data)
    if (resolver) {
      resolver()
      resolver = null
    }
  }

  emitter.on(event, handler)

  try {
    while (true) {
      if (queue.length > 0) {
        yield queue.shift()!
      } else {
        await new Promise<void>((resolve) => { resolver = resolve })
      }
    }
  } finally {
    emitter.off(event, handler)
  }
}
```

## Lock-Free Patterns

```typescript
// Lock-free queue (multi-producer, single-consumer)
class LockFreeQueue<T> {
  private head: Node<T> = { value: undefined, next: null }
  private tail: Node<T> = this.head

  enqueue(value: T): void {
    const node: Node<T> = { value, next: null }
    while (true) {
      const tail = this.tail
      const next = tail.next
      if (tail === this.tail) {
        if (next === null) {
          if (cas(&tail.next, next, node)) {
            cas(&this.tail, tail, node)
            return
          }
        } else {
          cas(&this.tail, tail, next)
        }
      }
    }
  }

  dequeue(): T | undefined {
    while (true) {
      const head = this.head
      const tail = this.tail
      const next = head.next
      if (head === this.head) {
        if (head === tail) {
          if (next === null) return undefined
          cas(&this.tail, tail, next)
        } else {
          const value = next!.value
          if (cas(&this.head, head, next)) {
            return value
          }
        }
      }
    }
  }
}
```

## Deadlock Prevention

```
Deadlock Conditions (Coffman Conditions):
  1. Mutual Exclusion — resources are non-shareable
  2. Hold and Wait — thread holds resources while waiting for others
  3. No Preemption — resources cannot be forcibly taken
  4. Circular Wait — circular chain of threads waiting

Prevention Strategies:
  — Lock ordering: always acquire locks in same order (by resource ID)
  — Lock timeout: tryLock with timeout, back off and retry
  — Lock hierarchy: define levels, only acquire higher-level locks
  — Avoid nested locks: refactor to need only one lock at a time
```

```typescript
// Lock ordering to prevent deadlock
async function transfer(
  from: Account,
  to: Account,
  amount: number
): Promise<void> {
  // Always lock by ID order to prevent deadlock
  const [first, second] = from.id < to.id ? [from, to] : [to, from]

  await first.lock.acquire()
  try {
    await second.lock.acquire()
    try {
      from.balance -= amount
      to.balance += amount
    } finally {
      second.lock.release()
    }
  } finally {
    first.lock.release()
  }
}
```

## Reactive Programming

```typescript
// Observable pattern
type Observer<T> = (value: T) => void

class Observable<T> {
  private observers: Set<Observer<T>> = new Set()
  private value: T

  constructor(initial: T) {
    this.value = initial
  }

  get(): T {
    return this.value
  }

  set(newValue: T): void {
    if (this.value === newValue) return
    this.value = newValue
    this.observers.forEach((obs) => obs(newValue))
  }

  subscribe(observer: Observer<T>): () => void {
    this.observers.add(observer)
    return () => this.observers.delete(observer)
  }

  map<R>(fn: (value: T) => R): Observable<R> {
    const mapped = new Observable(fn(this.value))
    this.subscribe((v) => mapped.set(fn(v)))
    return mapped
  }

  filter(predicate: (value: T) => boolean): Observable<T> {
    const filtered = new Observable<T>(this.value)
    this.subscribe((v) => {
      if (predicate(v)) filtered.set(v)
    })
    return filtered
  }
}
```