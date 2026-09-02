---
name: system-design
description: System design and architecture patterns. Covers microservices, event sourcing, CQRS, distributed systems, consensus algorithms, and scalability patterns. Use for designing large-scale systems.
---

# System Design Mastery

## Distributed Systems Fundamentals

### CAP Theorem
- **C**onsistency: All nodes see the same data at the same time
- **A**vailability: Every request gets a response (success or failure)
- **P**artition Tolerance: System continues despite network partitions
- **Tradeoff**: In a network partition (P), you must choose between consistency (C) or availability (A)

### Consensus Algorithms
```
Paxos/Raft: Leader election + log replication
  - Leader accepts writes, replicates to followers
  - Majority quorum required for commitment
  - Used in: etcd, Consul, ZooKeeper

Gossip Protocol: Epidemic broadcast
  - Nodes randomly share state with peers
  - Eventually consistent
  - Used in: Cassandra, DynamoDB, Consul
```

### Consistency Models
```
Strong Consistency    → All reads see latest write (highest latency)
Eventual Consistency  → Reads eventually see latest write (lowest latency)
Causal Consistency    → Causally related operations seen in order
Read-Your-Writes      → User always sees their own writes
Monotonic Reads       → Successive reads never go backward
```

## Microservices Patterns

### Service Decomposition
```
Domain-Driven Design (DDD):
  - Bounded Contexts define service boundaries
  - Each service owns its data
  - Ubiquitous language per context

Decompose by:
  - Business capability (Order Service, Payment Service)
  - Subdomain (Catalog, Inventory, Shipping)
  - Team boundaries (Conway's Law)
```

### Inter-Service Communication
```
Synchronous:
  - REST/HTTP: Simple, well-understood
  - gRPC: Binary, fast, streaming
  - GraphQL: Flexible queries

Asynchronous:
  - Message Queue (RabbitMQ, SQS): Point-to-point
  - Event Bus (Kafka, EventBridge): Pub/sub
  - Saga Pattern: Distributed transactions
```

### Saga Pattern (Distributed Transactions)
```
Choreography Saga:
  Service A → Event → Service B → Event → Service C
  (Each service listens and acts independently)

Orchestration Saga:
  Orchestrator → Command A → Response A → Command B → ...
  (Central coordinator drives the flow)

Compensating Transactions:
  If step 3 fails, undo steps 2 and 1 in reverse order
  Each service provides a compensating action
```

## Event Sourcing

```typescript
// Events are the source of truth
interface Event {
  id: string
  type: string
  aggregateId: string
  version: number
  timestamp: Date
  payload: Record<string, unknown>
}

// Aggregate rebuilds state from events
class OrderAggregate {
  private state: OrderState = { status: "pending", items: [], total: 0 }

  apply(event: Event): void {
    switch (event.type) {
      case "OrderCreated":
        this.state = { status: "pending", items: event.payload.items, total: 0 }
        break
      case "ItemAdded":
        this.state.items.push(event.payload.item)
        this.state.total += event.payload.price
        break
      case "OrderConfirmed":
        this.state.status = "confirmed"
        break
    }
  }

  static rebuild(events: Event[]): OrderAggregate {
    const aggregate = new OrderAggregate()
    for (const event of events) {
      aggregate.apply(event)
    }
    return aggregate
  }
}

// Event store
class EventStore {
  async append(aggregateId: string, events: Event[], expectedVersion: number): Promise<void> {
    // Append with optimistic concurrency check
    // Throw if version mismatch
  }

  async getEvents(aggregateId: string): Promise<Event[]> {
    // Return all events for aggregate
  }
}
```

## CQRS (Command Query Responsibility Segregation)

```typescript
// Write model (optimized for commands/commands)
class OrderCommandService {
  async createOrder(cmd: CreateOrderCommand): Promise<void> {
    const order = new Order(cmd.items)
    await eventStore.append(order.id, order.uncommittedEvents, 0)
  }

  async addItem(cmd: AddItemCommand): Promise<void> {
    const events = await eventStore.getEvents(cmd.orderId)
    const order = OrderAggregate.rebuild(events)
    order.addItem(cmd.item, cmd.price)
    await eventStore.append(cmd.orderId, order.uncommittedEvents, events.length)
  }
}

// Read model (optimized for queries)
class OrderQueryService {
  async getOrderSummary(orderId: string): Promise<OrderSummary> {
    // Denormalized read-optimized view
    return db.orderSummaries.findOne({ orderId })
  }

  async searchOrders(criteria: SearchCriteria): Promise<OrderSummary[]> {
    // Full-text search on read model
    return db.orderSummaries.find({ $text: { $search: criteria.query } })
  }
}

// Projection (syncs write → read model)
class OrderProjection {
  async handle(event: Event): Promise<void> {
    switch (event.type) {
      case "OrderCreated":
        await db.orderSummaries.insertOne({ orderId: event.aggregateId, status: "pending" })
        break
      case "OrderConfirmed":
        await db.orderSummaries.updateOne(
          { orderId: event.aggregateId },
          { $set: { status: "confirmed", confirmedAt: event.timestamp } }
        )
        break
    }
  }
}
```

## Scalability Patterns

### Horizontal Scaling
```
Load Balancer → [Instance 1] [Instance 2] [Instance 3] ...
                     ↓              ↓              ↓
                  [Database]   [Database]   [Database]
                  (Primary)    (Replica)    (Replica)

Strategies:
  - Round Robin: Distribute evenly
  - Least Connections: Send to least busy
  - Consistent Hashing: Same request → same server
  - Weighted: Based on capacity
```

### Database Scaling
```
Vertical Scaling: Bigger machine (simpler, has ceiling)
Horizontal Scaling: More machines (complex, near-infinite)

Read Scaling:
  - Read replicas (async replication)
  - Caching layer (Redis, Memcached)
  - CQRS (separate read/write models)

Write Scaling:
  - Sharding (partition data across machines)
  - Event sourcing (append-only log)
  - Saga pattern (distributed transactions)

Sharding Strategies:
  - Range-based: User IDs 1-1000 → Shard 1
  - Hash-based: hash(id) % num_shards
  - Directory-based: Lookup table maps key → shard
```

### Caching Strategies
```
Cache-Aside:
  App → Check Cache → Miss → Load DB → Populate Cache → Return

Write-Through:
  App → Write Cache → Cache writes to DB → Return

Write-Behind:
  App → Write Cache → Return → Cache writes to DB async

Refresh-Ahead:
  Cache auto-refreshes before expiry based on usage patterns

Cache Invalidation:
  - TTL: Auto-expire after duration
  - Event-based: Invalidate on data change
  - Versioned: Key includes version number
```

## Resilience Patterns

### Circuit Breaker
```typescript
type CircuitState = "closed" | "open" | "half-open"

class CircuitBreaker {
  private state: CircuitState = "closed"
  private failures = 0
  private lastFailureTime = 0

  constructor(
    private threshold: number = 5,
    private resetTimeout: number = 30000
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = "half-open"
      } else {
        throw new Error("Circuit is open")
      }
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess(): void {
    this.failures = 0
    this.state = "closed"
  }

  private onFailure(): void {
    this.failures++
    this.lastFailureTime = Date.now()
    if (this.failures >= this.threshold) {
      this.state = "open"
    }
  }
}
```

### Retry with Exponential Backoff
```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number
    baseDelay?: number
    maxDelay?: number
    retryable?: (error: Error) => boolean
  } = {}
): Promise<T> {
  const { maxAttempts = 3, baseDelay = 100, maxDelay = 10000, retryable = () => true } = options

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      if (attempt === maxAttempts || !retryable(error)) throw error
      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  throw new Error("Unreachable")
}
```

### Bulkhead
```typescript
class Bulkhead {
  private running = 0
  private queue: Array<() => void> = []

  constructor(private maxConcurrent: number = 10, private maxQueue: number = 100) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.running >= this.maxConcurrent) {
      if (this.queue.length >= this.maxQueue) {
        throw new Error("Bulkhead queue full")
      }
      await new Promise<void>(resolve => this.queue.push(resolve))
    }

    this.running++
    try {
      return await fn()
    } finally {
      this.running--
      const next = this.queue.shift()
      next?.()
    }
  }
}
```

## API Gateway Patterns

```typescript
// API Gateway responsibilities
class ApiGateway {
  // Request routing
  async route(request: Request): Promise<Response> {
    const service = this.router.resolve(request.path)
    return service.handle(request)
  }

  // Authentication/authorization
  async authenticate(request: Request): Promise<AuthContext> {
    const token = request.headers.authorization?.replace("Bearer ", "")
    if (!token) throw new UnauthorizedError()
    return this.auth.verify(token)
  }

  // Rate limiting
  async rateLimit(clientId: string): Promise<void> {
    const count = await this.redis.incr(`rate:${clientId}`)
    if (count === 1) await this.redis.expire(`rate:${clientId}`, 60)
    if (count > 100) throw new RateLimitError()
  }

  // Request/response transformation
  async transform(request: Request): Promise<Request> {
    // Convert external API format to internal format
    return {
      ...request,
      body: this.transformBody(request.body),
    }
  }

  // Response aggregation
  async aggregate(request: Request): Promise<Response> {
    const [user, orders, recommendations] = await Promise.all([
      this.userService.get(request.userId),
      this.orderService.list(request.userId),
      this.recommendationService.get(request.userId),
    ])
    return { user, orders, recommendations }
  }
}
```

## Observability Patterns

### Distributed Tracing
```typescript
// Trace context propagation
interface TraceContext {
  traceId: string      // Unique trace ID (propagated across services)
  spanId: string       // Current span ID
  parentSpanId?: string // Parent span ID
  sampled: boolean     // Whether to record this trace
}

// Span represents a unit of work
class Span {
  private startTime = Date.now()
  private tags: Record<string, string> = {}
  private logs: Array<{ timestamp: Date; fields: Record<string, unknown> }> = []

  setTag(key: string, value: string): this {
    this.tags[key] = value
    return this
  }

  log(fields: Record<string, unknown>): this {
    this.logs.push({ timestamp: new Date(), fields })
    return this
  }

  finish(): void {
    const duration = Date.now() - this.startTime
    this.tracer.report({ ...this, duration })
  }
}
```

### Health Checks
```typescript
interface HealthCheck {
  name: string
  check: () => Promise<HealthStatus>
}

type HealthStatus = "healthy" | "degraded" | "unhealthy"

class HealthChecker {
  private checks: HealthCheck[] = []

  register(check: HealthCheck): void {
    this.checks.push(check)
  }

  async check(): Promise<Record<string, HealthStatus>> {
    const results: Record<string, HealthStatus> = {}
    for (const { name, check } of this.checks) {
      results[name] = await Promise.race([
        check(),
        new Promise<HealthStatus>(resolve =>
          setTimeout(() => resolve("unhealthy"), 5000)
        ),
      ])
    }
    return results
  }
}

// Usage
const health = new HealthChecker()
health.register({ name: "database", check: () => db.ping() })
health.register({ name: "redis", check: () => redis.ping() })
health.register({ name: "external-api", check: () => fetch("https://api.example.com/health") })
```