---
name: patterns
description: Design patterns and refactoring catalog. Covers creational, structural, behavioral patterns, and common refactorings with examples. Use when designing systems or improving existing code.
---

# Design Patterns & Refactoring Catalog

## Creational Patterns

### Singleton
```typescript
class Database {
  private static instance: Database

  private constructor() {}

  static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database()
    }
    return Database.instance
  }
}
```

### Factory
```typescript
interface Notification {
  send(message: string): Promise<void>
}

class EmailNotification implements Notification {
  async send(message: string) { /* ... */ }
}

class SMSNotification implements Notification {
  async send(message: string) { /* ... */ }
}

class NotificationFactory {
  static create(type: "email" | "sms"): Notification {
    switch (type) {
      case "email": return new EmailNotification()
      case "sms": return new SMSNotification()
    }
  }
}
```

### Builder
```typescript
class QueryBuilder {
  private parts: string[] = []

  select(...cols: string[]) { this.parts.push(`SELECT ${cols.join(", ")}`); return this }
  from(table: string) { this.parts.push(`FROM ${table}`); return this }
  where(cond: string) { this.parts.push(`WHERE ${cond}`); return this }
  build() { return this.parts.join(" ") }
}

const sql = new QueryBuilder()
  .select("id", "name")
  .from("users")
  .where("active = true")
  .build()
```

## Structural Patterns

### Adapter
```typescript
interface ModernLogger {
  log(level: string, message: string): void
}

class LegacyLoggerAdapter implements ModernLogger {
  constructor(private legacy: LegacyLogger) {}

  log(level: string, message: string) {
    this.legacy.writeLog(`[${level.toUpperCase()}] ${message}`)
  }
}
```

### Decorator
```typescript
function logged<T extends (...args: any[]) => any>(fn: T): T {
  return ((...args: any[]) => {
    console.log(`Calling ${fn.name} with`, args)
    const result = fn(...args)
    console.log(`${fn.name} returned`, result)
    return result
  }) as T
}
```

### Facade
```typescript
class OrderFacade {
  constructor(
    private payment: PaymentService,
    private inventory: InventoryService,
    private shipping: ShippingService
  ) {}

  async placeOrder(order: Order): Promise<Result> {
    const payment = await this.payment.charge(order.total)
    if (!payment.ok) return { ok: false, error: "Payment failed" }

    await this.inventory.reserve(order.items)
    await this.shipping.schedule(order.address)
    return { ok: true }
  }
}
```

## Behavioral Patterns

### Observer
```typescript
type Listener<T> = (event: T) => void

class EventEmitter<T> {
  private listeners: Set<Listener<T>> = new Set()

  subscribe(listener: Listener<T>): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  emit(event: T) {
    for (const listener of this.listeners) {
      listener(event)
    }
  }
}
```

### Strategy
```typescript
interface SortStrategy<T> {
  sort(items: T[]): T[]
}

class QuickSort<T> implements SortStrategy<T> {
  sort(items: T[]): T[] { /* ... */ return items }
}

class MergeSort<T> implements SortStrategy<T> {
  sort(items: T[]): T[] { /* ... */ return items }
}

class Sorter<T> {
  constructor(private strategy: SortStrategy<T>) {}

  setStrategy(strategy: SortStrategy<T>) {
    this.strategy = strategy
  }

  sort(items: T[]): T[] {
    return this.strategy.sort(items)
  }
}
```

### Command
```typescript
interface Command {
  execute(): void
  undo(): void
}

class AddTextCommand implements Command {
  constructor(
    private doc: Document,
    private text: string,
    private position: number
  ) {}

  execute() { this.doc.insert(this.position, this.text) }
  undo() { this.doc.delete(this.position, this.text.length) }
}

class CommandHistory {
  private history: Command[] = []

  execute(cmd: Command) {
    cmd.execute()
    this.history.push(cmd)
  }

  undo() {
    const cmd = this.history.pop()
    cmd?.undo()
  }
}
```

## Refactoring Patterns

### Extract Method
```typescript
// Before
function printOwing(invoice: Invoice) {
  printBanner()
  const outstanding = calculateOutstanding(invoice)
  console.log(`Name: ${invoice.customer}`)
  console.log(`Amount: ${outstanding}`)
}

// After
function printOwing(invoice: Invoice) {
  printBanner()
  printDetails(invoice, calculateOutstanding(invoice))
}

function printDetails(invoice: Invoice, outstanding: number) {
  console.log(`Name: ${invoice.customer}`)
  console.log(`Amount: ${outstanding}`)
}
```

### Replace Conditional with Polymorphism
```typescript
// Before
function calculateArea(shape: Shape): number {
  if (shape.type === "circle") return Math.PI * shape.radius ** 2
  if (shape.type === "rect") return shape.width * shape.height
  throw new Error("Unknown shape")
}

// After
interface Shape { area(): number }
class Circle implements Shape { area() { return Math.PI * this.radius ** 2 } }
class Rectangle implements Shape { area() { return this.width * this.height } }
```

### Introduce Parameter Object
```typescript
// Before
function createBooking(
  userId: string,
  roomId: string,
  startDate: Date,
  endDate: Date,
  guests: number
) { /* ... */ }

// After
interface BookingRequest {
  userId: string
  roomId: string
  startDate: Date
  endDate: Date
  guests: number
}
function createBooking(request: BookingRequest) { /* ... */ }
```

### Replace Magic Numbers with Constants
```typescript
// Before
if (user.loginAttempts > 3) lockAccount(user)

// Before
const MAX_LOGIN_ATTEMPTS = 3
if (user.loginAttempts > MAX_LOGIN_ATTEMPTS) lockAccount(user)
```

## Code Smells and Fixes

| Smell | Fix |
|---|---|
| Long method | Extract method |
| Large class | Extract class / Extract subclass |
| Primitive obsession | Replace with value object |
| Switch statements | Polymorphism |
| Temporary field | Extract class |
| Refused bequeath | Push down field/method |
| Alternative classes with different interfaces | Unify interfaces |
| Lazy class | Inline class / Collapse hierarchy |
| Data class | Encapsulate fields |
| Divergent change | Extract class |
| Shotgun surgery | Move method/field |
| Feature envy | Move method |
| Inappropriate intimacy | Move method/field, extract class |
| Message chains | Hide delegate |
| Middle man | Remove middle man |
| Speculative generality | Collapse hierarchy, inline class |