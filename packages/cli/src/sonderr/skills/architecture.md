---
name: architecture
description: Software architecture patterns. Covers microservices, event-driven architecture, CQRS, event sourcing, hexagonal architecture, monolith-first, and system decomposition. Use for designing complex systems.
---

# Architecture Mastery

## Architecture Decision Records (ADRs)

```markdown
# ADR 001: Use Event-Sourced Order Management

## Status
Accepted

## Context
Order management requires complete audit trail, temporal queries, and ability to reconstruct state at any point in time. Traditional CRUD with soft deletes loses intermediate states.

## Decision
Implement event sourcing for the order domain. All state changes are captured as immutable events in an event store.

## Consequences

### Positive
- Complete audit trail for compliance
- Temporal queries: "What was the order state at 3pm?"
- Event replay for debugging/debugging
- Natural fit for CQRS read models

### Negative
- Event schema evolution requires careful versioning
- Eventual consistency between write and read models
- Higher complexity than CRUD
- Need to handle snapshot optimization for long-lived aggregates

## Alternatives Considered
- CRUD with audit log: Loses intermediate states
- Temporal database: Limited ecosystem support
- Change Data Capture: Couples to database internals
```

## Microservices Patterns

```
Service Boundaries:
  — Align with bounded contexts (DDD)
  — Each service owns its data
  — Services communicate via APIs or events
  — Independent deployability

When to Split:
  — Teams stepping on each other
  — Different scaling requirements
  — Different technology needs
  — Independent release cadence needed

When NOT to Split:
  — Tight coupling (always changed together)
  — Distributed transactions required
  — Team too small to manage overhead
  — Network latency unacceptable
```

```typescript
// Saga pattern for distributed transactions
interface SagaStep<T> {
  name: string
  execute: (ctx: T) => Promise<void>
  compensate: (ctx: T) => Promise<void>
}

class Saga<T> {
  private executed: Array<SagaStep<T>> = []

  constructor(private steps: SagaStep<T>[]) {}

  async execute(ctx: T): Promise<void> {
    for (const step of this.steps) {
      try {
        await step.execute(ctx)
        this.executed.unshift(step)
      } catch (error) {
        await this.compensate(ctx)
        throw error
      }
    }
  }

  private async compensate(ctx: T): Promise<void> {
    for (const step of this.executed) {
      try {
        await step.compensate(ctx)
      } catch (compensationError) {
        // Log for manual intervention
        console.error(`Compensation failed for step ${step.name}:`, compensationError)
      }
    }
  }
}

// Usage
const orderSaga = new Saga<OrderContext>([
  {
    name: "reserveInventory",
    execute: (ctx) => inventoryService.reserve(ctx.items),
    compensate: (ctx) => inventoryService.release(ctx.items),
  },
  {
    name: "processPayment",
    execute: (ctx) => paymentService.charge(ctx.total, ctx.paymentMethod),
    compensate: (ctx) => paymentService.refund(ctx.paymentId),
  },
  {
    name: "createShipment",
    execute: (ctx) => shippingService.createShipment(ctx.address, ctx.items),
    compensate: (ctx) => shippingService.cancelShipment(ctx.shipmentId),
  },
])
```

## CQRS (Command Query Responsibility Segregation)

```typescript
// Command side (write model)
interface Command {
  type: string
  payload: unknown
  timestamp: Date
  userId: string
}

class CreateOrderCommand implements Command {
  type = "CREATE_ORDER"
  constructor(
    public payload: { items: OrderItem[]; address: Address },
    public timestamp: Date,
    public userId: string
  ) {}
}

class CommandHandler<C extends Command> {
  constructor(
    private handler: (command: C) => Promise<DomainEvent[]>,
    private eventStore: EventStore
  ) {}

  async handle(command: C): Promise<void> {
    const events = await this.handler(command)
    await this.eventStore.append(events[0].streamId, events)
    await this.eventBus.publish(events)
  }
}

// Query side (read model)
interface Query<T> {
  type: string
}

class GetOrderSummary implements Query<OrderSummary> {
  type = "GET_ORDER_SUMMARY"
  constructor(public orderId: string) {}
}

class QueryHandler<Q extends Query<T>, T> {
  constructor(private handler: (query: Q) => Promise<T>) {}

  async handle(query: Q): Promise<T> {
    return this.handler(query)
  }
}

// Read model projector (updates denormalized views)
class OrderSummaryProjector {
  constructor(private readDB: ReadDatabase, private eventBus: EventBus) {
    eventBus.on("OrderCreated", (e) => this.onOrderCreated(e))
    eventBus.on("OrderShipped", (e) => this.onOrderShipped(e))
    eventBus.on("OrderDelivered", (e) => this.onOrderDelivered(e))
  }

  private async onOrderCreated(event: OrderCreated): Promise<void> {
    await this.readDB.orderSummaries.insert({
      orderId: event.orderId,
      status: "created",
      total: event.total,
      itemCount: event.items.length,
      createdAt: event.timestamp,
    })
  }

  private async onOrderShipped(event: OrderShipped): Promise<void> {
    await this.readDB.orderSummaries.update(
      { orderId: event.orderId },
      { status: "shipped", shippedAt: event.timestamp, trackingNumber: event.trackingNumber }
    )
  }
}
```

## Event Sourcing

```typescript
// Domain events
interface DomainEvent {
  eventId: string
  streamId: string
  streamVersion: number
  eventType: string
  timestamp: Date
  payload: unknown
}

interface OrderCreated extends DomainEvent {
  eventType: "OrderCreated"
  payload: {
    customerId: string
    items: OrderItem[]
    total: number
  }
}

interface OrderItemAdded extends DomainEvent {
  eventType: "OrderItemAdded"
  payload: { item: OrderItem; newTotal: number }
}

interface OrderShipped extends DomainEvent {
  eventType: "OrderShipped"
  payload: { trackingNumber: string; carrier: string }
}

// Aggregate root
class Order {
  private events: DomainEvent[] = []
  private state: OrderState = { status: "draft", items: [], total: 0 }

  static create(id: string, customerId: string, items: OrderItem[]): Order {
    const order = new Order()
    order.apply({
      eventId: uuid(),
      streamId: id,
      streamVersion: 0,
      eventType: "OrderCreated",
      timestamp: new Date(),
      payload: { customerId, items, total: items.reduce((sum, i) => sum + i.price * i.quantity, 0) },
    })
    return order
  }

  static reconstitute(id: string, events: DomainEvent[]): Order {
    const order = new Order()
    for (const event of events) {
      order.apply(event)
    }
    return order
  }

  addItem(item: OrderItem): void {
    if (this.state.status !== "draft") {
      throw new Error("Cannot modify non-draft order")
    }
    this.apply({
      eventId: uuid(),
      streamId: this.state.id,
      streamVersion: this.state.version + 1,
      eventType: "OrderItemAdded",
      timestamp: new Date(),
      payload: { item, newTotal: this.state.total + item.price * item.quantity },
    })
  }

  ship(trackingNumber: string, carrier: string): void {
    if (this.state.status !== "confirmed") {
      throw new Error("Order must be confirmed before shipping")
    }
    this.apply({
      eventId: uuid(),
      streamId: this.state.id,
      streamVersion: this.state.version + 1,
      eventType: "OrderShipped",
      timestamp: new Date(),
      payload: { trackingNumber, carrier },
    })
  }

  private apply(event: DomainEvent): void {
    this.events.push(event)
    this.state = this.evolve(this.state, event)
  }

  private evolve(state: OrderState, event: DomainEvent): OrderState {
    switch (event.eventType) {
      case "OrderCreated":
        return {
          id: event.streamId,
          status: "confirmed",
          items: event.payload.items,
          total: event.payload.total,
          version: event.streamVersion,
        }
      case "OrderItemAdded":
        return {
          ...state,
          items: [...state.items, event.payload.item],
          total: event.payload.newTotal,
          version: event.streamVersion,
        }
      case "OrderShipped":
        return { ...state, status: "shipped", version: event.streamVersion }
      default:
        return state
    }
  }

  getUncommittedEvents(): DomainEvent[] {
    return [...this.events]
  }
}
```

## Hexagonal Architecture (Ports & Adapters)

```
┌─────────────────────────────────────────┐
│              Application                │
│  ┌─────────────────────────────────┐    │
│  │         Domain Model            │    │
│  │    (Entities, Value Objects)    │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌───────────────┐  ┌───────────────┐  │
│  │  Input Port   │  │  Output Port  │  │
│  │  (Use Cases)  │  │  (Interfaces) │  │
│  └───────┬───────┘  └───────┬───────┘  │
└──────────┼─────────────────┼───────────┘
           │                 │
┌──────────┼─────────────────┼───────────┐
│  ┌───────▼───────┐  ┌───────▼───────┐  │
│  │  Input Adapter │  │ Output Adapter│  │
│  │  (REST, CLI)   │  │ (DB, Queue)  │  │
│  └───────────────┘  └───────────────┘  │
│           Infrastructure               │
└─────────────────────────────────────────┘
```

```typescript
// Domain layer (pure, no dependencies)
interface User {
  id: string
  email: Email
  name: string
  status: "active" | "inactive"
}

// Output port (interface)
interface UserRepository {
  findById(id: string): Promise<User | null>
  findByEmail(email: Email): Promise<User | null>
  save(user: User): Promise<void>
  delete(id: string): Promise<void>
}

// Input port (use case)
interface CreateUserUseCase {
  execute(input: CreateUserInput): Promise<Either<UserError, User>>
}

// Application service
class CreateUserService implements CreateUserUseCase {
  constructor(
    private userRepo: UserRepository,
    private eventBus: EventBus,
    private idGenerator: IdGenerator
  ) {}

  async execute(input: CreateUserInput): Promise<Either<UserError, User>> {
    const existing = await this.userRepo.findByEmail(input.email)
    if (existing) {
      return err(new UserError("EMAIL_TAKEN", "Email already registered"))
    }

    const user: User = {
      id: this.idGenerator.generate(),
      email: input.email,
      name: input.name,
      status: "active",
    }

    await this.userRepo.save(user)
    await this.eventBus.publish(new UserCreated(user.id, user.email))

    return ok(user)
  }
}

// Infrastructure adapter (implements output port)
class PostgresUserRepository implements UserRepository {
  constructor(private db: Knex) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.db("users").where({ id }).first()
    return row ? this.mapToUser(row) : null
  }

  async save(user: User): Promise<void> {
    await this.db("users").insert(this.mapFromUser(user))
  }

  private mapToUser(row: Record<string, unknown>): User {
    return { id: row.id as string, email: new Email(row.email as string), name: row.name as string, status: row.status as User["status"] }
  }
}
```

## Domain-Driven Design Patterns

```typescript
// Value Object
class Email {
  private constructor(public readonly value: string) {
    if (!this.isValid(value)) {
      throw new InvalidEmailError(value)
    }
  }

  static create(value: string): Email {
    return new Email(value.toLowerCase().trim())
  }

  private isValid(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  equals(other: Email): boolean {
    return this.value === other.value
  }
}

// Entity
class Order {
  private constructor(
    public readonly id: string,
    private _status: OrderStatus,
    private _items: OrderItem[],
    private _shippingAddress?: Address
  ) {}

  static create(id: string, items: OrderItem[]): Order {
    if (items.length === 0) throw new EmptyOrderError()
    return new Order(id, "draft", items)
  }

  confirm(shippingAddress: Address): void {
    if (this._status !== "draft") throw new InvalidOrderStateError()
    this._status = "confirmed"
    this._shippingAddress = shippingAddress
  }

  get status(): OrderStatus {
    return this._status
  }

  get items(): readonly OrderItem[] {
    return this._items
  }
}

// Aggregate root invariant enforcement
class ShoppingCart {
  private items: CartItem[] = []

  addItem(productId: string, quantity: number): void {
    if (this.items.length >= 100) {
      throw new CartLimitExceededError(100)
    }
    const existing = this.items.find(i => i.productId === productId)
    if (existing) {
      existing.quantity += quantity
    } else {
      this.items.push({ productId, quantity })
    }
  }
}

// Domain event
class OrderConfirmed {
  constructor(
    public readonly orderId: string,
    public readonly customerId: string,
    public readonly total: number,
    public readonly timestamp: Date = new Date()
  ) {}
}

// Repository interface
interface OrderRepository {
  findById(id: string): Promise<Order | null>
  findCustomerOrders(customerId: string): Promise<Order[]>
  save(order: Order): Promise<void>
  nextId(): string
}
```

## System Decomposition

```
Decomposition Process:
  1. Identify business capabilities
  2. Group related capabilities
  3. Define bounded contexts
  4. Map context relationships
  5. Design integration patterns
  6. Validate with event storming

Context Map Patterns:
  — Partnership: Services collaborate on shared goal
  — Customer-Supplier: One depends on another
  — Conformist: Downstream conforms to upstream model
  — Anticorruption Layer: Translate between contexts
  — Open Host Service: Published language for integration
  — Published Language: Standardized interchange format
```

## Monolith-First Strategy

```
When to Start with Monolith:
  — Small team (< 8 engineers)
  — Uncertain domain boundaries
  — Speed to market is critical
  — Limited operational expertise
  — Revenue model not yet validated

How to Structure for Future Extraction:
  — Modular monolith with clear boundaries
  — Internal APIs between modules
  — Separate schemas per module
  — Event bus for inter-module communication
  — No shared database tables
  — Each module could become a service

Extraction Criteria:
  — Module needs independent scaling
  — Different technology requirements
  — Separate team ownership
  — Independent release cadence
  — Performance isolation needed
```

## Event-Driven Architecture

```
Event Flow:
  Producer → Event Channel → Event Router → Consumer(s)

Event Types:
  — Event Notification: Lightweight, no payload ("order placed")
  — Event-Carried State Transfer: Full payload ("order details")
  — Event Sourcing: All state changes as events
  — CQRS: Separate read/write models

Event Schema Evolution:
  — Backward compatible: New schema reads old data
  — Forward compatible: Old schema reads new data
  — Full compatible: Both directions
  — Use schema registry (Confluent, AWS Glue)
```

```typescript
// Event schema with versioning
interface EventEnvelope<T = unknown> {
  eventId: string
  eventType: string
  eventVersion: number
  timestamp: string
  source: string
  correlationId: string
  payload: T
}

class EventBus {
  private handlers: Map<string, Array<(event: EventEnvelope) => Promise<void>>> = new Map()

  subscribe<T>(eventType: string, handler: (event: EventEnvelope<T>) => Promise<void>): () => void {
    if (!this.handlers.has(eventType)) this.handlers.set(eventType, [])
    this.handlers.get(eventType)!.push(handler as any)
    return () => {
      const handlers = this.handlers.get(eventType)!
      const idx = handlers.indexOf(handler as any)
      if (idx >= 0) handlers.splice(idx, 1)
    }
  }

  async publish<T>(eventType: string, payload: T, metadata: Partial<EventEnvelope> = {}): Promise<void> {
    const envelope: EventEnvelope<T> = {
      eventId: metadata.eventId ?? randomUUID(),
      eventType,
      eventVersion: metadata.eventVersion ?? 1,
      timestamp: metadata.timestamp ?? new Date().toISOString(),
      source: metadata.source ?? "unknown",
      correlationId: metadata.correlationId ?? randomUUID(),
      payload,
    }

    const handlers = this.handlers.get(eventType) ?? []
    await Promise.all(handlers.map((h) => h(envelope)))
  }
}
```