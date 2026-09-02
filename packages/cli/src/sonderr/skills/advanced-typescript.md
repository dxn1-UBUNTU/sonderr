---
name: advanced-typescript
description: Advanced TypeScript patterns and techniques. Covers conditional types, template literals, mapped types, branded types, type-level programming, decorators, and metaprogramming. Use for complex type-safe architectures.
---

# Advanced TypeScript Mastery

## Conditional Types and Type-Level Programming

```typescript
// Distributive conditional types
type ToArray<T> = T extends any ? T[] : never
type ToArrayNonDist<T> = [T] extends [any] ? T[] : never

// Extract string keys
type StringKeys<T> = Extract<keyof T, string>

// Deep partial
type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T

// Deep readonly
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P]
}

// Deep required
type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P]
}

// Deep non-nullable
type DeepNonNullable<T> = {
  [P in keyof T]: NonNullable<T[P]> extends object
    ? DeepNonNullable<NonNullable<T[P]>>
    : NonNullable<T[P]>
}
```

## Template Literal Types

```typescript
// Event naming
type EventName<T extends string> = `on${Capitalize<T>}`
type ClickEvent = EventName<"click">  // "onClick"

// CSS property
type CSSProperty<T extends string> = `-${Lowercase<T>}`
type WebkitProperty = CSSProperty<"transform">  // "-transform"

// Path extraction
type PathKeys<T, Path extends string = ""> = T extends object
  ? {
      [K in keyof T]: PathKeys<
        T[K],
        Path extends "" ? `${K & string}` : `${Path}.${K & string}`
      >
    }[keyof T]
  : Path

// Extract path params
type ExtractRouteParams<T extends string> =
  T extends `${string}:${infer Param}/${infer Rest}`
    ? Param | ExtractRouteParams<Rest>
    : T extends `${string}:${infer Param}`
      ? Param
      : never

// Usage: ExtractRouteParams<"/users/:userId/posts/:postId"> = "userId" | "postId"
```

## Branded Types (Nominal Typing)

```typescript
// Prevent mixing up IDs of different types
type Brand<T, B> = T & { __brand: B }

type USD = Brand<number, "USD">
type EUR = Brand<number, "EUR">
type UserId = Brand<string, "UserId">
type OrderId = Brand<string, "OrderId"]

function createUSD(value: number): USD {
  return value as USD
}

function createUserId(value: string): UserId {
  return value as UserId
}

function addUSD(a: USD, b: USD): USD {
  return (a + b) as USD
}

// This will NOT compile — can't mix brands
// addUSD(createUSD(10), createUserId("123"))  // Error!
```

## Mapped Type Patterns

```typescript
// Proxy all methods
type AsyncMethods<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? (...args: A) => Promise<R>
    : never
}

// Event map from props
type EventMap<T> = {
  [K in keyof T as K extends `on${infer Event}` ? Uncapitalize<Event> : never]: T[K]
}

// Nullable version of all properties
type Nullable<T> = { [P in keyof T]: T[P] | null }

// Getter/setter pair
type Getters<T> = {
  [K in keyof T as `get${Capitalize<K & string>}`]: () => T[K]
}
type Setters<T> = {
  [K in keyof T as `set${Capitalize<K & string>}`]: (value: T[K]) => void
}

// Snake_case to camelCase
type CamelCase<S extends string> =
  S extends `${infer P}_${infer Q}`
    ? `${Lowercase<P>}${Capitalize<CamelCase<Q>>}`
    : Lowercase<S>

// Deep transform keys
type DeepCamelCase<T> = T extends object
  ? { [K in keyof T as CamelCase<K & string>]: DeepCamelCase<T[K]> }
  : T
```

## Type Guards and Narrowing

```typescript
// Discriminated union with exhaustive checking
type Result<T> =
  | { status: "success"; data: T }
  | { status: "error"; error: Error }
  | { status: "loading" }

function handleResult<T>(result: Result<T>): T {
  switch (result.status) {
    case "success": return result.data
    case "error": throw result.error
    case "loading": throw new Error("Still loading")
    default: const _exhaustive: never = result  // Compile error if case missed
  }
}

// Type guard with type predicate
function isDefined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null
}

function isString(value: unknown): value is string {
  return typeof value === "string"
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

// Assertion function
function assert(condition: unknown, msg?: string): asserts condition {
  if (!condition) throw new Error(msg || "Assertion failed")
}

function assertIsString(value: unknown): asserts value is string {
  if (typeof value !== "string") throw new Error("Not a string")
}

function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`)
}
```

## Decorators (TC39 Stage 3)

```typescript
// Method decorator with proper typing
function log<This, Args extends any[], Return>(
  target: (this: This, ...args: Args) => Return,
  context: ClassMethodDecoratorContext
) {
  return function (this: This, ...args: Args): Return {
    console.log(`Calling ${String(context.name)}`)
    const result = target.apply(this, args)
    console.log(`Returned:`, result)
    return result
  }
}

// Class decorator
function singleton<T extends new (...args: any[]) => any>(
  target: T,
  context: ClassDecoratorContext
) {
  let instance: InstanceType<T>
  return class extends target {
    constructor(...args: any[]) {
      if (instance) return instance
      super(...args)
      instance = this as InstanceType<T>
    }
  }
}

// Property decorator with signal (Angular-style)
function signal<T>(initialValue: T) {
  return (_target: any, context: ClassFieldDecoratorContext) => {
    return () => initialValue
  }
}
```

## Module Patterns

```typescript
// Barrel exports with type-only re-exports
export type { User, CreateUserDTO, UpdateUserDTO } from "./types"
export { UserService } from "./user-service"
export { validateUser } from "./validators"

// Namespace pattern for internal organization
export namespace API {
  export interface Request { /* ... */ }
  export interface Response { /* ... */ }
  export function createRequest(): Request { /* ... */ }
}

// Const enum for zero-runtime-cost enums
const enum Direction {
  Up = 0,
  Down = 1,
  Left = 2,
  Right = 3,
}

// Ambient declarations for external libraries
declare module "external-lib" {
  export function doSomething(input: string): Promise<Result>
}

// Global augmentation
declare global {
  interface Window {
    myApp: { version: string; env: string }
  }
}
```

## Performance Patterns

```typescript
// Lazy initialization with memoization
function lazy<T>(factory: () => T): () => T {
  let value: T | undefined
  let initialized = false
  return () => {
    if (!initialized) {
      value = factory()
      initialized = true
    }
    return value!
  }
}

const getDatabase = lazy(() => createDatabaseConnection())

// Object pool for frequently created/destroyed objects
class ObjectPool<T> {
  private pool: T[] = []

  constructor(
    private factory: () => T,
    private reset: (item: T) => void,
    private maxSize: number = 100
  ) {}

  acquire(): T {
    return this.pool.pop() ?? this.factory()
  }

  release(item: T): void {
    if (this.pool.length < this.maxSize) {
      this.reset(item)
      this.pool.push(item)
    }
  }
}

// Memoization with LRU eviction
function memoize<T extends (...args: any[]) => any>(
  fn: T,
  maxSize: number = 100
): T {
  const cache = new Map<string, ReturnType<T>>()
  return ((...args: any[]) => {
    const key = JSON.stringify(args)
    if (cache.has(key)) {
      const value = cache.get(key)!
      cache.delete(key)  // Move to end (LRU)
      cache.set(key, value)
      return value
    }
    const result = fn(...args)
    cache.set(key, result)
    if (cache.size > maxSize) {
      const firstKey = cache.keys().next().value
      if (firstKey) cache.delete(firstKey)
    }
    return result
  }) as T
}
```

## JSX/TSX Patterns

```typescript
// Polymorphic component
type PolymorphicProps<E extends React.ElementType> = {
  as?: E
  children?: React.ReactNode
} & React.ComponentPropsWithoutRef<E>

function Box<E extends React.ElementType = "div">(props: PolymorphicProps<E>) {
  const { as: Component = "div", ...rest } = props
  return <Component {...rest} />
}

// Usage: <Box as="section">...</Box> → renders <section>

// Render props pattern
interface ListProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
}

function List<T>({ items, renderItem }: ListProps<T>) {
  return <ul>{items.map((item, i) => renderItem(item, i))}</ul>
}

// Compound component with context
interface ToggleContextValue {
  on: boolean
  toggle: () => void
}

const ToggleContext = createContext<ToggleContextValue | null>(null)

function Toggle({ children }: { children: React.ReactNode }) {
  const [on, setOn] = useState(false)
  return (
    <ToggleContext.Provider value={{ on, toggle: () => setOn(!on) }}>
      {children}
    </ToggleContext.Provider>
  )
}
```

## Error Handling Patterns

```typescript
// Result type with chaining
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E }

class ResultWrapper<T, E> {
  constructor(private readonly result: Result<T, E>) {}

  static ok<T>(value: T): ResultWrapper<T, never> {
    return new ResultWrapper({ ok: true, value })
  }

  static err<E>(error: E): ResultWrapper<never, E> {
    return new ResultWrapper({ ok: false, error })
  }

  map<U>(fn: (value: T) => U): ResultWrapper<U, E> {
    if (this.result.ok) return ResultWrapper.ok(fn(this.result.value))
    return ResultWrapper.err(this.result.error)
  }

  flatMap<U>(fn: (value: T) => ResultWrapper<U, E>): ResultWrapper<U, E> {
    if (this.result.ok) return fn(this.result.value)
    return ResultWrapper.err(this.result.error)
  }

  unwrap(): T {
    if (this.result.ok) return this.result.value
    throw this.result.error
  }

  unwrapOr(defaultValue: T): T {
    return this.result.ok ? this.result.value : defaultValue
  }
}

// Usage
const result = ResultWrapper.ok(10)
  .map(x => x * 2)
  .map(x => x.toString())
  .unwrap()  // "20"
```

## Testing Patterns

```typescript
// Type-safe test builder
interface Expect<T> {
  toEqual(expected: T): void
  toBeTruthy(): void
  toBeFalsy(): void
  toThrow(message?: string): void
  not: Expect<T>
}

function expect<T>(actual: T): Expect<T> {
  return {
    toEqual(expected: T) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${expected}, got ${actual}`)
      }
    },
    toBeTruthy() {
      if (!actual) throw new Error(`Expected truthy, got ${actual}`)
    },
    toBeFalsy() {
      if (actual) throw new Error(`Expected falsy, got ${actual}`)
    },
    toThrow(message?: string) {
      try {
        if (actual instanceof Function) actual()
        throw new Error("Did not throw")
      } catch (e: any) {
        if (message && !e.message.includes(message)) {
          throw new Error(`Expected error with "${message}", got "${e.message}"`)
        }
      }
    },
    get not() {
      // Implementation of negated assertions
      return this as Expect<T>
    },
  }
}

// Mock factory with type safety
function createMock<T extends object>(): { [K in keyof T]: T[K] extends (...args: any[]) => any ? jest.Mock : T[K] } {
  return new Proxy({} as any, {
    get(_, prop) {
      return jest.fn()
    },
  })
}

// Test data builder pattern
class UserBuilder {
  private user: Partial<User> = {}

  withName(name: string): this {
    this.user.name = name
    return this
  }

  withEmail(email: string): this {
    this.user.email = email
    return this
  }

  active(): this {
    this.user.active = true
    return this
  }

  build(): User {
    return {
      id: "test-id",
      name: this.user.name ?? "Test User",
      email: this.user.email ?? "test@example.com",
      active: this.user.active ?? false,
      createdAt: new Date(),
    }
  }
}

// Usage
const testUser = new UserBuilder().withName("Alice").withEmail("alice@test.com").active().build()
```