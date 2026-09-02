---
name: database-advanced
description: Advanced database patterns and optimization. Covers indexing strategies, query optimization, migrations, connection pooling, replication, sharding, and both SQL and NoSQL patterns. Use for database-heavy applications.
---

# Advanced Database Mastery

## Indexing Strategies

### B-Tree Index Patterns
```
When to index:
  - Columns in WHERE clauses (high selectivity)
  - Columns in JOIN conditions
  - Columns in ORDER BY / GROUP BY
  - Columns used in range queries (>, <, BETWEEN)

When NOT to index:
  - Low-selectivity columns (boolean, status with few values)
  - Tables with heavy write load (indexes slow writes)
  - Columns rarely used in queries

Composite index rules:
  - Put equality columns first, then range columns
  - Order by selectivity (most selective first)
  - Covering index: includes all columns needed by query
```

```typescript
// EXPLAIN ANALYZE to verify index usage
const result = await db.query(`
  EXPLAIN ANALYZE
  SELECT u.name, COUNT(p.id) as post_count
  FROM users u
  LEFT JOIN posts p ON p.user_id = u.id
  WHERE u.active = true
    AND u.created_at > $1
  GROUP BY u.id, u.name
  ORDER BY post_count DESC
  LIMIT 10
`, [since])

// Composite index for the above query
await db.query(`
  CREATE INDEX CONCURRENTLY idx_users_active_created
  ON users (active, created_at)
  INCLUDE (name)
`)

// Covering index (no table access needed)
await db.query(`
  CREATE INDEX CONCURRENTLY idx_posts_user_covering
  ON posts (user_id)
  INCLUDE (title, created_at, likes)
`)
```

### Partial and Expression Indexes
```sql
-- Partial index (only index rows matching condition)
CREATE INDEX idx_active_users_email
ON users (email)
WHERE active = true

-- Expression index
CREATE INDEX idx_users_lower_email
ON users (LOWER(email))

-- GIN index for full-text search
CREATE INDEX idx_posts_search
ON posts USING GIN (to_tsvector('english', title || ' ' || content))

-- GIN index for JSONB
CREATE INDEX idx_events_data
ON events USING GIN (data jsonb_path_ops)

-- BRIN index for time-series (small, efficient)
CREATE INDEX idx_logs_created
ON logs USING BRIN (created_at)
```

## Query Optimization

### N+1 Query Prevention
```typescript
// Bad: N+1 queries
const users = await db.users.findMany()
for (const user of users) {
  user.posts = await db.posts.findMany({ where: { userId: user.id } })
}

// Good: Eager loading (1 query)
const users = await db.users.findMany({
  include: { posts: true },
})

// Good: Batch loading
const users = await db.users.findMany()
const userIds = users.map(u => u.id)
const posts = await db.posts.findMany({ where: { userId: { in: userIds } } })
const postsByUser = groupBy(posts, p => p.userId)
```

### Pagination Patterns
```typescript
// Offset pagination (simple, slow on deep pages)
async function listPosts(page: number = 1, limit: number = 20) {
  return db.posts.findMany({
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { createdAt: "desc" },
  })
}

// Cursor pagination (fast, consistent)
async function listPosts(cursor?: string, limit: number = 20) {
  const posts = await db.posts.findMany({
    take: limit + 1,  // Fetch one extra to check if more exist
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    orderBy: { createdAt: "desc" },
  })

  const hasMore = posts.length > limit
  const items = hasMore ? posts.slice(0, -1) : posts
  const nextCursor = hasMore ? items[items.length - 1]?.id : undefined

  return { items, nextCursor, hasMore }
}

// Keyset pagination (best for time-series)
async function listPosts(after?: Date, limit: number = 20) {
  return db.posts.findMany({
    where: after ? { createdAt: { lt: after } } : {},
    take: limit,
    orderBy: { createdAt: "desc" },
  })
}
```

### Query Plan Analysis
```typescript
// Analyze slow query
const explain = await db.query(`
  EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
  SELECT * FROM orders
  WHERE status = 'pending'
    AND created_at > NOW() - INTERVAL '7 days'
  ORDER BY total DESC
  LIMIT 100
`)

// Look for:
// - Seq Scan on large tables → add index
// - Nested Loop with many rows → consider hash join
// - High "actual time" on any node → optimization target
// - "Buffers: shared read=" high → more memory or better index
```

## Connection Pooling

```typescript
// PgBouncer / PgPool configuration
const pool = new Pool({
  max: 20,                // Maximum connections
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 2000, // Fail if can't connect in 2s
  maxUses: 7500,          // Recycle connection after N uses
})

// Prisma connection pooling
// datasource db {
//   url = "postgresql://...?connection_limit=20&pool_timeout=30"
// }

// Connection lifecycle
async function withTransaction<T>(
  fn: (client: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(fn, {
    maxWait: 5000,  // Max time to wait for connection
    timeout: 30000, // Max time for transaction
    isolationLevel: "Serializable",
  })
}
```

## Replication and High Availability

```
Primary-Replica Setup:
  Primary (Read/Write) → Async Replication → Replica 1 (Read)
                                      → Replica 2 (Read)
                                      → Replica 3 (Read)

Read/Write Splitting:
  - Writes → Primary
  - Reads → Replicas (round-robin)
  - Critical reads → Primary (for read-after-write consistency)

Failover:
  - Health checks detect primary failure
  - Promote replica to primary
  - Update connection strings
  - Automatic with tools like Patroni, repmgr
```

## Sharding Patterns

```typescript
// Consistent hashing for shard routing
function getShard(key: string, numShards: number): number {
  const hash = crypto.createHash("md5").update(key).digest()
  return hash.readUInt32BE(0) % numShards
}

// Range-based sharding
function getShardByRange(userId: string): number {
  const prefix = userId.substring(0, 2)
  const ranges = {
    "00-3f": 0, "40-7f": 1, "80-bf": 2, "c0-ff": 3,
  }
  // ... determine range
  return 0
}

// Directory-based sharding (most flexible)
async function getShardForTenant(tenantId: string): Promise<Database> {
  const mapping = await db.shardMappings.findUnique({ where: { tenantId } })
  return shards[mapping.shardId]
}
```

## Migration Best Practices

```typescript
// Safe migration pattern (no-downtime)
export async function up(knex: Knex): Promise<void> {
  // Step 1: Add new column (nullable, no default)
  await knex.schema.alterTable("users", (table) => {
    table.string("display_name").nullable()
  })

  // Step 2: Backfill in batches
  let lastId = ""
  while (true) {
    const rows = await knex("users")
      .whereNull("display_name")
      .where("id", ">", lastId)
      .orderBy("id")
      .limit(1000)

    if (rows.length === 0) break

    await knex("users")
      .whereIn("id", rows.map(r => r.id))
      .update({ display_name: knex.raw("COALESCE(name, email)") })

    lastId = rows[rows.length - 1].id
  }

  // Step 3: Add constraints (after backfill)
  await knex.schema.alterTable("users", (table) => {
    table.string("display_name").notNullable().alter()
  })

  // Step 4: Add index concurrently (no table lock)
  await knex.raw("CREATE INDEX CONCURRENTLY idx_users_display_name ON users (display_name)")
}

// Rollback-safe: each migration is reversible
export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("users", (table) => {
    table.dropColumn("display_name")
  })
}
```

## NoSQL Patterns

### MongoDB Schema Design
```typescript
// Embedding (one-to-few, read together)
{
  _id: "order_123",
  customer: { id: "cust_456", name: "Alice" },  // embedded
  items: [
    { product: "Widget", price: 9.99, qty: 2 },  // embedded
  ],
  total: 19.98
}

// Referencing (one-to-many, independent access)
// users collection
{ _id: "user_123", name: "Alice" }

// posts collection
{ _id: "post_456", userId: "user_123", title: "Hello" }

// Aggregation with lookup
db.posts.aggregate([
  { $match: { published: true } },
  { $sort: { createdAt: -1 } },
  { $skip: 0 },
  { $limit: 20 },
  { $lookup: {
      from: "users",
      localField: "userId",
      foreignField: "_id",
      as: "author",
  }},
  { $unwind: "$author" },
  { $project: { title: 1, createdAt: 1, "author.name": 1 } },
])
```

### DynamoDB Patterns
```typescript
// Single-table design with composite keys
// PK (partition key) + SK (sort key)
{
  PK: "USER#alice",
  SK: "PROFILE#alice",
  name: "Alice",
  email: "alice@example.com"
}
{
  PK: "USER#alice",
  SK: "ORDER#2024-01-15#order_123",
  total: 99.99,
  status: "shipped"
}

// GSI for inverted queries
// GSI1PK: "ORDER#order_123", GSI1SK: "USER#alice"

// Query all orders for a user
const orders = await dynamo.query({
  TableName: "app",
  KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
  ExpressionAttributeValues: {
    ":pk": "USER#alice",
    ":sk": "ORDER#",
  },
})
```