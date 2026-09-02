---
name: functional-programming
description: Functional programming patterns. Covers immutability, higher-order functions, functors, monads, composition, and functional error handling. Use for clean, composable code.
---

# Functional Programming Mastery

## Immutability Patterns

```typescript
// Persistent data structures
type Immutable<T> = {
  readonly [K in keyof T]: T[K] extends object ? Immutable<T[K]> : T[K]
}

// Structural sharing (simplified)
class Vector<T> {
  private constructor(
    private readonly root: Node<T>,
    private readonly size: number
  ) {}

  static empty<T>(): Vector<T> {
    return new Vector<T>(null, 0)
  }

  append(value: T): Vector<T> {
    return new Vector<T>(insert(this.root, this.size, value), this.size + 1)
  }

  get(index: number): T {
    return lookup(this.root, index)
  }

  set(index: number, value: T): Vector<T> {
    return new Vector<T>(update(this.root, index, value), this.size)
  }

  get length(): number {
    return this.size
  }
}

// Lens pattern for immutable updates
type Lens<S, A> = {
  get: (s: S) => A
  set: (a: A) => (s: S) => S
}

function lens<S, A>(
  get: (s: S) => A,
  set: (a: A) => (s: S) => S
): Lens<S, A> {
  return { get, set }
}

function composeLens<S, A, B>(
  outer: Lens<S, A>,
  inner: Lens<A, B>
): Lens<S, B> {
  return {
    get: (s) => inner.get(outer.get(s)),
    set: (b) => (s) => outer.set(inner.set(b)(outer.get(s)))(s),
  }
}

// Usage
interface User {
  name: string
  address: {
    city: string
    country: string
  }
}

const addressLens = lens<User, User["address"]>(
  (user) => user.address,
  (address) => (user) => ({ ...user, address })
)

const cityLens = lens<User["address"], string>(
  (address) => address.city,
  (city) => (address) => ({ ...address, city })
)

const userCityLens = composeLens(addressLens, cityLens)

const user: User = { name: "Alice", address: { city: "NYC", country: "US" } }
const updated = userCityLens.set("LA")(user)
// { name: "Alice", address: { city: "LA", country: "US" } }
```

## Higher-Order Functions

```typescript
// Function composition
function pipe<A, B, C>(
  ab: (a: A) => B,
  bc: (b: B) => C
): (a: A) => C
function pipe(...fns: Array<(a: any) => any>): (a: any) => any {
  return (x) => fns.reduce((acc, fn) => fn(acc), x)
}

function compose<A, B, C>(
  bc: (b: B) => C,
  ab: (a: A) => B
): (a: A) => C
function compose(...fns: Array<(a: any) => any>): (a: any) => any {
  return (x) => fns.reduceRight((acc, fn) => fn(acc), x)
}

// Usage
const processUsers = pipe(
  (users: User[]) => users.filter(u => u.active),
  (users) => users.map(u => u.name),
  (names) => names.sort(),
  (names) => names.join(", ")
)

// Curry
function curry<T extends any[], R>(
  fn: (...args: T) => R
): Curried<T, R> {
  return function curried(...args: any[]): any {
    if (args.length >= fn.length) {
      return fn(...args)
    }
    return (...more: any[]) => curried(...args, ...more)
  }
}

const add = curry((a: number, b: number, c: number) => a + b + c)
add(1)(2)(3)  // 6
add(1, 2)(3)  // 6
add(1)(2, 3)  // 6

// Partial application
function partial<T extends any[], R>(
  fn: (...args: T) => R,
  ...preset: PartialArgs<T>
): (...rest: RestArgs<T>) => R {
  return (...rest: any[]) => fn(...(preset as any), ...rest)
}
```

## Functor and Monad Patterns

```typescript
// Maybe monad (safe nullable handling)
type Maybe<T> = { tag: "just"; value: T } | { tag: "nothing" }

const Just = <T>(value: T): Maybe<T> => ({ tag: "just", value })
const Nothing = <T>(): Maybe<T> => ({ tag: "nothing" })

const mapMaybe = <T, R>(maybe: Maybe<T>, fn: (value: T) => R): Maybe<R> => {
  if (maybe.tag === "nothing") return Nothing()
  return Just(fn(maybe.value))
}

const flatMapMaybe = <T, R>(maybe: Maybe<T>, fn: (value: T) => Maybe<R>): Maybe<R> => {
  if (maybe.tag === "nothing") return Nothing()
  return fn(maybe.value)
}

const getOrElse = <T>(maybe: Maybe<T>, defaultValue: T): T => {
  if (maybe.tag === "nothing") return defaultValue
  return maybe.value
}

// Usage — chain nullable operations safely
function getUserCity(userId: string): string {
  return getOrElse(
    flatMapMaybe(
      flatMapMaybe(
        findUser(userId),
        (user) => user.address
      ),
      (address) => Just(address.city)
    ),
    "Unknown"
  )
}

// Either monad (functional error handling)
type Either<L, R> = { tag: "left"; error: L } | { tag: "right"; value: R }

const Left = <L, R = never>(error: L): Either<L, R> => ({ tag: "left", error })
const Right = <R, L = never>(value: R): Either<L, R> => ({ tag: "right", value })

const mapEither = <L, R, R2>(either: Either<L, R>, fn: (value: R) => R2): Either<L, R2> => {
  if (either.tag === "left") return either
  return Right(fn(either.value))
}

const flatMapEither = <L, R, R2>(either: Either<L, R>, fn: (value: R) => Either<L, R2>): Either<L, R2> => {
  if (either.tag === "left") return either
  return fn(either.value)
}

// Usage — chain validation
function validateUser(input: unknown): Either<string[], User> {
  return flatMapEither(
    validateName(input),
    (name) => flatMapEither(
      validateEmail(input),
      (email) => flatMapEither(
        validateAge(input),
        (age) => Right({ name, email, age })
      )
    )
  )
}
```

## Pattern Matching

```typescript
// TypeScript pattern matching via discriminated unions
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "rectangle"; width: number; height: number }
  | { kind: "triangle"; base: number; height: number }

function area(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius ** 2
    case "rectangle":
      return shape.width * shape.height
    case "triangle":
      return (shape.base * shape.height) / 2
  }
}

// Exhaustiveness checking
function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${x}`)
}

function describeShape(shape: Shape): string {
  switch (shape.kind) {
    case "circle":
      return `Circle with radius ${shape.radius}`
    case "rectangle":
      return `Rectangle ${shape.width}x${shape.height}`
    case "triangle":
      return `Triangle base=${shape.base} height=${shape.height}`
    default:
      return assertNever(shape)  // Compile error if shape kind added
  }
}
```

## Functional Error Handling

```typescript
// Railway-oriented programming
type Result<T, E = Error> =
  | { success: true; value: T }
  | { success: false; error: E }

const ok = <T>(value: T): Result<T, never> => ({ success: true, value })
const err = <E>(error: E): Result<never, E> => ({ success: false, error })

const map = <T, R, E>(result: Result<T, E>, fn: (value: T) => R): Result<R, E> => {
  if (!result.success) return result
  return ok(fn(result.value))
}

const flatMap = <T, R, E>(result: Result<T, E>, fn: (value: T) => Result<R, E>): Result<R, E> => {
  if (!result.success) return result
  return fn(result.value)
}

const mapError = <T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> => {
  if (result.success) return result
  return err(fn(result.error))
}

// Railway switch
function createOrder(input: OrderInput): Result<Order, OrderError> {
  return pipe(
    validateOrderInput(input),
    flatMap((validInput) => checkInventory(validInput)),
    flatMap((item) => processPayment(item)),
    flatMap((payment) => fulfillOrder(payment)),
    mapError((error) => ({ ...error, timestamp: new Date() }))
  )
}

// Tap — perform side effect without changing result
function tap<T, E>(fn: (value: T) => void): (result: Result<T, E>) => Result<T, E> {
  return (result) => {
    if (result.success) fn(result.value)
    return result
  }
}
```

## Functional Data Transformation

```typescript
// Map/Filter/Reduce patterns
const result = users
  .filter((user) => user.active)
  .map((user) => user.orders)
  .flat()
  .filter((order) => order.status === "pending")
  .reduce((total, order) => total + order.amount, 0)

// Transducers for composable transformations
type Transducer<A, B> = <R>(reducer: (r: R, a: A) => R) => (reducer: (r: R, b: B) => R)

function mapT<A, B>(fn: (a: A) => B): Transducer<A, B> {
  return (reducer) => (r, b) => reducer(r, fn(b))
}

function filterT<A>(predicate: (a: A) => boolean): Transducer<A, A> {
  return (reducer) => (r, a) => predicate(a) ? reducer(r, a) : r
}

function transduce<A, B, R>(
  transducer: Transducer<A, B>,
  reducer: (r: R, b: B) => R,
  initial: R,
  input: A[]
): R {
  const transformed = transducer(reducer)
  return input.reduce(transformed, initial)
}

// Usage
const transform = pipe(
  filterT<number>((n) => n > 0),
  mapT<number, number>((n) => n * 2),
  mapT<number, string>((n) => `Value: ${n}`)
)

const result = transduce(
  transform,
  (acc: string[], s: string) => [...acc, s],
  [],
  [-2, -1, 0, 1, 2, 3]
)
// ["Value: 2", "Value: 4", "Value: 6"]
```

## Functional State Management

```typescript
// State monad
type State<S, A> = (state: S) => [A, S]

const pure = <S, A>(value: A): State<S, A> => (state) => [value, state]

const mapState = <S, A, B>(sa: State<S, A>, fn: (a: A) => B): State<S, B> => (state) => {
  const [a, newState] = sa(state)
  return [fn(a), newState]
}

const flatMapState = <S, A, B>(sa: State<S, A>, fn: (a: A) => State<S, B>): State<S, B> => (state) => {
  const [a, newState] = sa(state)
  return fn(a)(newState)
}

const get = <S>(): State<S, S> => (state) => [state, state]
const put = <S>(state: S): State<S, void> => () => [undefined, state]
const modify = <S>(fn: (state: S) => S): State<S, void> => (state) => [undefined, fn(state)]

// Usage — pure state machine
type CounterState = { count: number; history: number[] }

const increment: State<CounterState, number> = (state) => {
  const newCount = state.count + 1
  return [newCount, { count: newCount, history: [...state.history, newCount] }]
}

const decrement: State<CounterState, number> = (state) => {
  const newCount = state.count - 1
  return [newCount, { count: newCount, history: [...state.history, newCount] }]
}

const program = flatMapState(increment, (n1) =>
  flatMapState(increment, (n2) =>
    flatMapState(decrement, (n3) =>
      pure<CounterState, number>(n3)
    )
  )
)

const [result, finalState] = program({ count: 0, history: [] })
// result: 1, finalState: { count: 1, history: [1, 2, 1] }
```

## Recursion and Tail Call Optimization

```typescript
// Recursive patterns
function factorial(n: number): number {
  if (n <= 1) return 1
  return n * factorial(n - 1)
}

// Tail-recursive factorial
function factorialTR(n: number, acc: number = 1): number {
  if (n <= 1) return acc
  return factorialTR(n - 1, n * acc)
}

// Trampoline for stack safety
type Trampoline<T> = { done: true; value: T } | { done: false; next: Trampoline<T> }

function trampoline<T>(fn: () => T | Trampoline<T>): T {
  let result = fn()
  while (typeof result === "object" && result !== null && "done" in result && !result.done) {
    result = (result as any).next
  }
  return (result as any).value
}

// Tree traversal with trampoline
type Tree<T> = { value: T; children: Tree<T>[] }

function flattenTree<T>(tree: Tree<T>): T[] {
  const result: T[] = []
  const stack: Tree<T>[] = [tree]

  while (stack.length > 0) {
    const node = stack.pop()!
    result.push(node.value)
    stack.push(...node.children)
  }

  return result
}

// Fold (catamorphism)
function foldTree<T, R>(
  tree: Tree<T>,
  fn: (value: T, children: R[]) => R
): R {
  const childrenResults = tree.children.map((child) => foldTree(child, fn))
  return fn(tree.value, childrenResults)
}
```