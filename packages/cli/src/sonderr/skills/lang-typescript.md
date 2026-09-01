---
name: lang-typescript
description: Comprehensive TypeScript and JavaScript guide. Covers types, interfaces, generics, decorators, modules, async patterns, error handling, and advanced type manipulation. Use when writing or reviewing TypeScript/JavaScript code.
---

# TypeScript & JavaScript Mastery

## Type System Fundamentals

### Primitive Types
```typescript
// Prefer type inference when obvious
const name = "Alice"        // string
const count = 42            // number
const active = true         // boolean
const nothing = null        // null
let notAssigned             // undefined

// Explicit types for function signatures
function greet(name: string): string {
  return `Hello, ${name}`
}

// Union types for flexibility
type Status = "pending" | "active" | "completed"
type ID = string | number

// Intersection types for composition
type Named = { name: string }
type Aged = { age: number }
type Person = Named & Aged
```

### Interfaces vs Type Aliases
```typescript
// Interfaces: extendable, declare merging, better for objects
interface User {
  id: string
  name: string
}

interface User {
  email: string  // merges with above
}

// Type aliases: better for unions, intersections, mapped types
type Result<T> = { ok: true; data: T } | { ok: false; error: string }
type Keys<T> = keyof T
type Values<T> = T[keyof T]

// Rule: Use interfaces for public API shapes, types for internal compositions
```

### Generics
```typescript
// Basic generic function
function first<T>(arr: T[]): T | undefined {
  return arr[0]
}

// Generic with constraints
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key]
}

// Generic interfaces
interface Repository<T> {
  get(id: string): Promise<T>
  list(): Promise<T[]>
  create(data: Omit<T, "id">): Promise<T>
  update(id: string, data: Partial<T>): Promise<T>
  delete(id: string): Promise<void>
}

// Conditional types
type IsString<T> = T extends string ? true : false
type NonNullable<T> = T extends null | undefined ? never : T

// Mapped types
type Readonly<T> = { readonly [P in keyof T]: T[P] }
type Partial<T> = { [P in keyof T]?: T[P] }
type Required<T> = { [P in keyof T]-?: T[P] }
type Pick<T, K extends keyof T> = { [P in K]: T[P] }
type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>
```

### Advanced Types
```typescript
// Template literal types
type EventName<T extends string> = `on${Capitalize<T>}`
type ClickEvent = EventName<"click">  // "onClick"

// Indexed access types
type User = { name: string; age: number }
type UserName = User["name"]  // string

// Discriminated unions
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "rectangle"; width: number; height: number }

function area(shape: Shape): number {
  switch (shape.kind) {
    case "circle": return Math.PI * shape.radius ** 2
    case "rectangle": return shape.width * shape.height
  }
}

// Branded types for type safety
type Brand<T, B> = T & { __brand: B }
type USD = Brand<number, "USD">
type EUR = Brand<number, "EUR">

function addUSD(a: USD, b: USD): USD {
  return (a + b) as USD
}
```

## Async Patterns

### Promises and async/await
```typescript
// Always prefer async/await over .then() chains
async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`)
  if (!response.ok) throw new Error(`Failed: ${response.status}`)
  return response.json()
}

// Parallel execution
async function fetchDashboard(userId: string): Promise<Dashboard> {
  const [user, posts, notifications] = await Promise.all([
    fetchUser(userId),
    fetchPosts(userId),
    fetchNotifications(userId),
  ])
  return { user, posts, notifications }
}

// Error handling with Result type
async function safeFetch<T>(url: string): Promise<Result<T>> {
  try {
    const response = await fetch(url)
    if (!response.ok) return { ok: false, error: `HTTP ${response.status}` }
    return { ok: true, data: await response.json() }
  } catch (error) {
    return { ok: false, error: String(error) }
  }
}
```

### Iterators and Generators
```typescript
async function* fetchPages<T>(url: string): AsyncGenerator<T[]> {
  let nextUrl: string | undefined = url
  while (nextUrl) {
    const response = await fetch(nextUrl)
    const data = await response.json()
    yield data.results
    nextUrl = data.next
  }
}

// Usage
async function getAllItems<T>(url: string): Promise<T[]> {
  const items: T[] = []
  for await (const page of fetchPages<T>(url)) {
    items.push(...page)
  }
  return items
}
```

## Error Handling

### Custom Error Classes
```typescript
class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message)
    this.name = this.constructor.name
  }
}

class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`, "NOT_FOUND", 404)
  }
}

class ValidationError extends AppError {
  constructor(
    message: string,
    public fields: Record<string, string>
  ) {
    super(message, "VALIDATION_ERROR", 422)
  }
}

// Usage
function getUser(id: string): User {
  const user = db.users.find(id)
  if (!user) throw new NotFoundError("User", id)
  return user
}
```

### Result Type Pattern
```typescript
type Result<T, E = Error> =
  | { ok: true; data: T }
  | { ok: false; error: E }

function divide(a: number, b: number): Result<number> {
  if (b === 0) return { ok: false, error: new Error("Division by zero") }
  return { ok: true, data: a / b }
}

// Usage with early return
function calculate(): Result<number> {
  const x = divide(10, 2)
  if (!x.ok) return x

  const y = divide(x.data, 0)
  if (!y.ok) return y

  return { ok: true, data: y.data }
}
```

## Modules and Organization

### ES Modules
```typescript
// Named exports (preferred for utilities)
export function formatDate(date: Date): string { /* ... */ }
export function parseJSON<T>(json: string): T { /* ... */ }

// Default exports (preferred for main class of a module)
export default class Database { /* ... */ }

// Re-exports for clean public API
export { UserService } from "./services/user"
export { AuthService } from "./services/auth"
export type { User, CreateUserDTO } from "./types"

// Type-only imports (erased at runtime, no runtime cost)
import type { Config } from "./config"
```

### Module Organization
```
src/
├── index.ts          # Public API exports
├── types/            # Shared type definitions
├── utils/            # Pure utility functions
├── services/         # Business logic
├── repositories/     # Data access
├── controllers/      # Request handlers
├── middleware/        # Request/response middleware
└── config/           # Configuration
```

## Type Guards and Narrowing

```typescript
// User-defined type guards
function isString(value: unknown): value is string {
  return typeof value === "string"
}

function isUser(value: unknown): value is User {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "name" in value &&
    typeof (value as User).id === "string"
  )
}

// Discriminated union narrowing
type Event =
  | { type: "click"; x: number; y: number }
  | { type: "keypress"; key: string }
  | { type: "scroll"; delta: number }

function handleEvent(event: Event) {
  switch (event.type) {
    case "click": return `Clicked at (${event.x}, ${event.y})`
    case "keypress": return `Pressed ${event.key}`
    case "scroll": return `Scrolled ${event.delta}px`
    default: const _exhaustive: never = event  // Compile error if case missed
  }
}

// Assertion functions
function assert(condition: unknown, msg?: string): asserts condition {
  if (!condition) throw new Error(msg || "Assertion failed")
}

function assertDefined<T>(value: T | undefined | null, msg?: string): T {
  assert(value !== undefined && value !== null, msg)
  return value
}
```

## Utility Types and Patterns

```typescript
// Deep readonly
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P]
}

// Non-nullable properties
type NonNullableProps<T> = {
  [P in keyof T]: NonNullable<T[P]>
}

// Function that returns the same type as input
type Identity<T> = (arg: T) => T

// Extract promise return type
type Awaited<T> = T extends Promise<infer U> ? U : T

// Constructor type
type Constructor<T = object> = new (...args: any[]) => T

// Abstract constructor type
type AbstractConstructor<T = object> = abstract new (...args: any[]) => T

// Mixin pattern
function Timestamped<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    timestamp = new Date()
  }
}
```

## Performance Patterns

```typescript
// Memoization
function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map<string, ReturnType<T>>
  return ((...args: any[]) => {
    const key = JSON.stringify(args)
    if (cache.has(key)) return cache.get(key)!
    const result = fn(...args)
    cache.set(key, result)
    return result
  }) as T
}

// Lazy initialization
class ExpensiveResource {
  private _instance: HeavyObject | null = null

  get instance(): HeavyObject {
    if (!this._instance) {
      this._instance = new HeavyObject()
    }
    return this._instance
  }
}

// Object pooling
class Pool<T> {
  private available: T[] = []

  constructor(
    private factory: () => T,
    private reset: (item: T) => void,
    private maxSize: number = 10
  ) {}

  acquire(): T {
    return this.available.pop() ?? this.factory()
  }

  release(item: T): void {
    if (this.available.length < this.maxSize) {
      this.reset(item)
      this.available.push(item)
    }
  }
}
```

## Modern JavaScript Features

```typescript
// Nullish coalescing (??) vs OR (||)
const value = input ?? "default"     // only null/undefined
const value2 = input || "default"    // any falsy value

// Optional chaining (?.)
const name = user?.profile?.name
const result = array?.[0]
const value = callback?.()

// Logical assignment
obj.key ??= "default"
count ||= initialValue
config &&= updatedConfig

// Array methods
const users = [
  { id: 1, name: "Alice", active: true },
  { id: 2, name: "Bob", active: false },
  { id: 3, name: "Charlie", active: true },
]

// Find
const alice = users.find(u => u.name === "Alice")

// Filter
const active = users.filter(u => u.active)

// Map
const names = users.map(u => u.name)

// Reduce
const byId = users.reduce((acc, u) => ({ ...acc, [u.id]: u }), {} as Record<number, User>)

// Some/Every
const hasInactive = users.some(u => !u.active)
const allActive = users.every(u => u.active)

// Flat/flatMap
const nested = [[1, 2], [3, 4]].flat()  // [1, 2, 3, 4]
const pairs = users.flatMap(u => u.active ? [[u.id, u.name]] : [])

// Object helpers
const entries = Object.entries(obj)     // [key, value][]
const keys = Object.keys(obj)
const values = Object.values(obj)
const merged = { ...obj1, ...obj2 }

// Set for deduplication
const unique = [...new Set(items)]

// Map for key-value with any key type
const cache = new Map<string, User>()
```