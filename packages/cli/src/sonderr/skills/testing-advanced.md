---
name: testing-advanced
description: Advanced testing strategies and patterns. Covers property-based testing, fuzz testing, contract testing, snapshot testing, test doubles, and testing at scale. Use for complex testing scenarios.
---

# Advanced Testing Mastery

## Property-Based Testing

```typescript
// Fast-check style property-based testing
import fc from "fast-check"

describe("sort", () => {
  test("sorted output has same length as input", () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), (arr) => {
        const sorted = sort([...arr])
        expect(sorted.length).toBe(arr.length)
      })
    )
  })

  test("sorted output is in non-decreasing order", () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), (arr) => {
        const sorted = sort([...arr])
        for (let i = 1; i < sorted.length; i++) {
          expect(sorted[i]).toBeGreaterThanOrEqual(sorted[i - 1])
        }
      })
    )
  })

  test("sorted output contains same elements as input", () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), (arr) => {
        const sorted = sort([...arr])
        expect(sorted).toEqual([...arr].sort((a, b) => a - b))
      })
    )
  })

  test("idempotent: sorting already sorted array is identity", () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), (arr) => {
        const sorted = sort([...arr])
        expect(sort([...sorted])).toEqual(sorted)
      })
    )
  })
})
```

## Fuzz Testing

```typescript
// Fuzzing a parser with random inputs
async function fuzzParser(parser: (input: string) => any, iterations: number = 10000) {
  const results = { passed: 0, crashed: 0, hangs: 0 }

  for (let i = 0; i < iterations; i++) {
    const input = generateRandomString()
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), 100)
    )

    try {
      await Promise.race([parser(input), timeout])
      results.passed++
    } catch (e: any) {
      if (e.message === "Timeout") {
        results.hangs++
        console.log(`Hang with input: ${input}`)
      } else {
        results.crashed++
        console.log(`Crash with input: ${input} — ${e.message}`)
      }
    }
  }

  return results
}

// Structure-aware fuzzing (generate valid-ish inputs)
function generateValidishURL(): string {
  const protocols = ["http", "https"]
  const tlds = [".com", ".org", ".net", ".io"]
  return `${fc.sample(protocols)}://${fc.sample(["www", "")]}$.{randomString()}${fc.sample(tlds)}`
}
```

## Contract Testing

```typescript
// Consumer-driven contract testing
import { Pact } from "@pact-foundation/pact"

const provider = new Pact({
  consumer: "UserService",
  provider: "OrderService",
  port: 1234,
})

describe("Order Service Contract", () => {
  beforeAll(() => provider.setup())
  afterAll(() => provider.finalize())
  afterEach(() => provider.verify())

  describe("get order by id", () => {
    beforeAll(() =>
      provider.addInteraction({
        state: "order exists",
        uponReceiving: "a request for order 123",
        withRequest: {
          method: "GET",
          path: "/orders/123",
          headers: { Accept: "application/json" },
        },
        willRespondWith: {
          status: 200,
          headers: { "Content-Type": "application/json" },
          body: {
            id: like("123"),
            status: term({ generate: "pending", matcher: "^(pending|shipped|delivered)$" }),
            total: like(99.99),
            items: eachLike({ product: "Widget", quantity: 1 }),
          },
        },
      })
    )

    test("returns the order", async () => {
      const order = await orderService.get("123")
      expect(order.id).toBe("123")
      expect(["pending", "shipped", "delivered"]).toContain(order.status)
    })
  })
})
```

## Snapshot Testing

```typescript
// Component snapshot testing
test("Button renders correctly", () => {
  const { container } = render(<Button variant="primary">Click me</Button>)
  expect(container.firstChild).toMatchSnapshot()
})

// Inline snapshot (preferred for small outputs)
test("formats price", () => {
  expect(formatPrice(9999, "USD")).toMatchInlineSnapshot(`"$99.99"`)
})

// Snapshot serializers for deterministic output
expect.addSnapshotSerializer({
  test: (val) => val instanceof Date,
  serialize: (val) => `Date(${val.toISOString()})`,
})
```

## Test Doubles

```typescript
// Manual mock with type safety
function createMock<T extends object>(): { [K in keyof T]: T[K] extends (...args: any[]) => any ? jest.Mock : T[K] } {
  return new Proxy({} as any, {
    get(_, prop) {
      return jest.fn()
    },
  })
}

// Stub (returns canned responses)
const stubUserRepo = {
  findById: jest.fn().mockResolvedValue({ id: "1", name: "Alice" }),
  findAll: jest.fn().mockResolvedValue([]),
  create: jest.fn().mockImplementation((user) => Promise.resolve({ ...user, id: "new-id" })),
}

// Spy (records calls, delegates to real implementation)
const realService = new UserService()
const spy = jest.spyOn(realService, "calculate")
realService.calculate(10, 20)
expect(spy).toHaveBeenCalledWith(10, 20)
expect(spy).toHaveReturnedWith(30)

// Fake (working in-memory implementation)
class FakeUserRepository implements UserRepository {
  private users: Map<string, User> = new Map()

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null
  }

  async create(user: User): Promise<User> {
    this.users.set(user.id, user)
    return user
  }
}
```

## Test Fixtures and Builders

```typescript
// Test data builder
class UserBuilder {
  private user: Partial<TestUser> = {}

  withId(id: string): this {
    this.user.id = id
    return this
  }

  withName(name: string): this {
    this.user.name = name
    return this
  }

  withEmail(email: string): this {
    this.user.email = email
    return this
  }

  admin(): this {
    this.user.role = "admin"
    return this
  }

  active(): this {
    this.user.active = true
    return this
  }

  inactive(): this {
    this.user.active = false
    return this
  }

  createdDaysAgo(days: number): this {
    this.user.createdAt = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    return this
  }

  build(): TestUser {
    return {
      id: this.user.id ?? randomUUID(),
      name: this.user.name ?? "Test User",
      email: this.user.email ?? "test@example.com",
      role: this.user.role ?? "user",
      active: this.user.active ?? true,
      createdAt: this.user.createdAt ?? new Date(),
    }
  }
}

// Usage
const admin = new UserBuilder().withName("Admin").admin().active().build()
const oldUser = new UserBuilder().inactive().createdDaysAgo(30).build()
```

## Integration Testing

```typescript
// TestContainers for real databases
import { PostgreSqlContainer } from "@testcontainers/postgresql"

let container: StartedPostgreSqlContainer
let prisma: PrismaClient

beforeAll(async () => {
  container = await new PostgreSqlContainer()
    .withDatabase("test")
    .withUsername("test")
    .withPassword("test")
    .start()

  prisma = new PrismaClient({
    datasources: { db: { url: container.getConnectionUri() } },
  })

  await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`
  runMigrations()
})

afterAll(async () => {
  await prisma.$disconnect()
  await container.stop()
})

// API integration test with Supertest
import supertest from "supertest"

describe("POST /users", () => {
  it("creates a user", async () => {
    const response = await supertest(app)
      .post("/users")
      .send({ name: "Alice", email: "alice@example.com" })
      .expect(201)

    expect(response.body).toMatchObject({
      id: expect.any(String),
      name: "Alice",
      email: "alice@example.com",
    })

    const user = await db.users.findUnique({ where: { id: response.body.id } })
    expect(user).not.toBeNull()
  })
})
```

## Mutation Testing

```typescript
// Stryker mutation testing configuration
// stryker.conf.json
{
  "$schema": "./node_modules/stryker-cli/schema/stryker-schema.json",
  "packageManager": "burn",
  "reporters": ["html", "clear-text", "progress"],
  "mutate": ["src/**/*.ts", "!src/**/*.test.ts"],
  "mutators": ["default"],
  "testRunner": "bun",
  "coverageAnalysis": "perTest",
  "thresholds": {
    "high": 80,
    "low": 60,
    "break": 50
  }
}
```

## Visual Regression Testing

```typescript
// Playwright visual regression
test("homepage matches screenshot", async ({ page }) => {
  await page.goto("https://app.example.com")
  await expect(page).toHaveScreenshot("homepage.png", {
    maxDiffPixelRatio: 0.01,  // Allow 1% difference
  })
})

// Component-level visual testing with Storybook
// .storybook/test-runner.ts
const config = {
  async postRender(page, context) {
    const image = await page.screenshot()
    expect(image).toMatchImageSnapshot({
      failureThreshold: 0.1,
      failureThresholdType: "percent",
    })
  },
}
```

## Performance Testing

```typescript
// k6 load testing script
import http from "k6/http"
import { check, sleep } from "k6"

export const options = {
  stages: [
    { duration: "1m", target: 100 },   // Ramp up to 100 users
    { duration: "3m", target: 100 },   // Stay at 100 users
    { duration: "1m", target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"],   // 95% of requests under 500ms
    http_req_failed: ["rate<0.01"],     // Error rate under 1%
  },
}

export default function () {
  const res = http.get("https://api.example.com/users")
  check(res, {
    "status is 200": (r) => r.status === 200,
    "response time < 500ms": (r) => r.timings.duration < 500,
  })
  sleep(1)
}
```