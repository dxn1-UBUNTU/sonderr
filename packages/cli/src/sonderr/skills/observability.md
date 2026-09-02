---
name: observability
description: Observability, monitoring, and logging patterns. Covers structured logging, metrics, tracing, alerting, dashboards, and SLO/SLI/SLA. Use for production-grade system monitoring.
---

# Observability Mastery

## Structured Logging

```typescript
// Structured logger with context
interface LogContext {
  requestId?: string
  userId?: string
  [key: string]: unknown
}

class Logger {
  private context: LogContext = {}

  child(context: LogContext): Logger {
    const logger = new Logger()
    logger.context = { ...this.context, ...context }
    return logger
  }

  info(message: string, fields?: Record<string, unknown>): void {
    this.log("info", message, fields)
  }

  warn(message: string, fields?: Record<string, unknown>): void {
    this.log("warn", message, fields)
  }

  error(message: string, error?: Error, fields?: Record<string, unknown>): void {
    this.log("error", message, {
      ...fields,
      error: error?.message,
      stack: error?.stack,
    })
  }

  private log(level: string, message: string, fields?: Record<string, unknown>): void {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...this.context,
      ...fields,
    }
    console.log(JSON.stringify(entry))
  }
}

// Usage
const logger = new Logger().child({ requestId: "req_123" })
const userLogger = logger.child({ userId: "usr_456" })
userLogger.info("Order created", { orderId: "ord_789", total: 99.99 })
// {"timestamp":"...","level":"info","message":"Order created","requestId":"req_123","userId":"usr_456","orderId":"ord_789","total":99.99}
```

## Log Levels and When to Use Them

```
TRACE    — Function entry/exit, loop iterations (dev only)
DEBUG    — Variable values, cache hits/misses (dev/staging)
INFO     — Normal operations: requests, state changes, business events
WARN     — Recoverable issues: deprecated API, high latency, retry
ERROR    — Failures requiring attention: exceptions, failed operations
FATAL    — Unrecoverable: system crash, data loss imminent

Rules:
  — Production default: INFO
  — Never log secrets, tokens, passwords, PII
  — One log line per event (not many)
  — Include enough context to debug without re-logging
```

## Metrics Collection

```typescript
// Counter metric
class Counter {
  private value = 0

  increment(amount: number = 1): void {
    this.value += amount
  }

  get(): number {
    return this.value
  }
}

// Histogram metric for latency distribution
class Histogram {
  private buckets: number[] = []
  private counts: Map<number, number> = new Map()
  private sum = 0
  private totalCount = 0

  constructor(private boundaries: number[] = [10, 50, 100, 250, 500, 1000, 2500, 5000]) {
    boundaries.forEach((b) => this.counts.set(b, 0))
  }

  observe(value: number): void {
    this.sum += value
    this.totalCount++
    for (const boundary of this.boundaries) {
      if (value <= boundary) {
        this.counts.set(boundary, (this.counts.get(boundary) ?? 0) + 1)
      }
    }
  }

  percentile(p: number): number {
    const target = this.totalCount * (p / 100)
    let cumulative = 0
    for (const [boundary, count] of [...this.counts.entries()].sort((a, b) => a[0] - b[0])) {
      cumulative += count
      if (cumulative >= target) return boundary
    }
    return this.boundaries[this.boundaries.length - 1]
  }
}

// Metrics registry
class Metrics {
  private counters: Map<string, Counter> = new Map()
  private histograms: Map<string, Histogram> = new Map()
  private gauges: Map<string, () => number> = new Map()

  counter(name: string): Counter {
    if (!this.counters.has(name)) this.counters.set(name, new Counter())
    return this.counters.get(name)!
  }

  histogram(name: string): Histogram {
    if (!this.histograms.has(name)) this.histograms.set(name, new Histogram())
    return this.histograms.get(name)!
  }

  gauge(name: string, fn: () => number): void {
    this.gauges.set(name, fn)
  }

  scrape(): Record<string, unknown> {
    const output: Record<string, unknown> = {}
    this.counters.forEach((c, name) => { output[`${name}_total`] = c.get() })
    this.histograms.forEach((h, name) => {
      output[`${name}_p50`] = h.percentile(50)
      output[`${name}_p95`] = h.percentile(95)
      output[`${name}_p99`] = h.percentile(99)
    })
    this.gauges.forEach((fn, name) => { output[name] = fn() })
    return output
  }
}
```

## Distributed Tracing

```typescript
// Trace context propagation
interface TraceContext {
  traceId: string
  spanId: string
  parentSpanId?: string
  sampled: boolean
}

class Span {
  private startTime = performance.now()
  private tags: Record<string, string> = {}
  private logs: Array<{ timestamp: number; fields: Record<string, unknown> }> = []

  constructor(
    private context: TraceContext,
    private operation: string,
    private tracer: Tracer
  ) {}

  setTag(key: string, value: string): this {
    this.tags[key] = value
    return this
  }

  log(fields: Record<string, unknown>): this {
    this.logs.push({ timestamp: performance.now(), fields })
    return this
  }

  finish(): void {
    const duration = performance.now() - this.startTime
    this.tracer.record({
      ...this.context,
      operation: this.operation,
      duration,
      tags: this.tags,
      logs: this.logs,
    })
  }
}

// Middleware for HTTP tracing
function tracingMiddleware(tracer: Tracer) {
  return (req: Request, res: Response, next: NextFunction) => {
    const traceContext = extractTraceContext(req.headers)
    const span = tracer.startSpan("http_request", traceContext)
      .setTag("http.method", req.method)
      .setTag("http.url", req.url)

    ;(req as any).span = span

    res.on("finish", () => {
      span.setTag("http.status_code", String(res.statusCode))
      span.finish()
    })

    next()
  }
}

// Extract trace context from headers (W3C Trace Context)
function extractTraceContext(headers: Record<string, string>): TraceContext {
  const traceparent = headers["traceparent"] ?? "00-abc123-def456-01"
  const [version, traceId, spanId, flags] = traceparent.split("-")
  return {
    traceId,
    spanId,
    sampled: flags === "01",
  }
}
```

## SLO/SLI/SLA Framework

```
Service Level Indicator (SLI):
  — The specific metric measuring service quality
  — Examples: request latency, error rate, throughput, availability

Service Level Objective (SLO):
  — Target range for an SLI over a time window
  — Examples: "p99 latency < 200ms over 30 days", "99.9% availability"

Service Level Agreement (SLA):
  — Contract with consequences if SLO is not met
  — Example: "99.9% availability or customer receives 10% credit"

Common SLIs:
  — Availability: successful requests / total requests
  — Latency: p50, p95, p99 response time
  — Throughput: requests per second
  — Error rate: 5xx responses / total requests
  — Durability: probability of data loss over time

Error Budget:
  — 100% - SLO = error budget
  — Example: 99.9% SLO = 0.1% error budget = 43.2 min/month downtime
  — Policies: stop launches when budget exhausted, prioritize reliability
```

```typescript
// Error budget tracking
class ErrorBudget {
  constructor(
    private slo: number,          // e.g., 0.999 for 99.9%
    private windowDays: number = 30
  ) {}

  get budget(): number {
    return 1 - this.slo
  }

  get dailyBudgetMs(): number {
    return this.budget * this.windowDays * 24 * 60 * 60 * 1000
  }

  calculateBudgetBurned(
    totalRequests: number,
    failedRequests: number
  ): number {
    const errorRate = failedRequests / totalRequests
    return errorRate / this.budget
  }

  isBudgetExhausted(
    totalRequests: number,
    failedRequests: number
  ): boolean {
    return this.calculateBudgetBurned(totalRequests, failedRequests) > 1
  }
}
```

## Alerting Patterns

```typescript
// Alert severity levels
enum AlertSeverity {
  P1_CRITICAL = "p1",  // Page immediately, revenue-impacting
  P2_HIGH = "p2",      // Page during business hours, degraded experience
  P3_MEDIUM = "p3",    // Ticket for next business day
  P4_LOW = "p4",       // Informational, track trend
}

// Alert routing
interface AlertRule {
  name: string
  condition: string      // PromQL expression
  duration: string       // How long condition must hold
  severity: AlertSeverity
  runbook: string
  notificationChannels: string[]
}

const alertRules: AlertRule[] = [
  {
    name: "HighErrorRate",
    condition: 'sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) > 0.01',
    duration: "5m",
    severity: AlertSeverity.P1_CRITICAL,
    runbook: "https://wiki.internal/runbooks/high-error-rate",
    notificationChannels: ["pagerduty-critical", "slack-oncall"],
  },
  {
    name: "HighLatency",
    condition: 'histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le)) > 1',
    duration: "10m",
    severity: AlertSeverity.P2_HIGH,
    runbook: "https://wiki.internal/runbooks/high-latency",
    notificationChannels: ["slack-oncall"],
  },
  {
    name: "DiskSpaceLow",
    condition: "node_filesystem_avail_bytes / node_filesystem_size_bytes < 0.15",
    duration: "30m",
    severity: AlertSeverity.P3_MEDIUM,
    runbook: "https://wiki.internal/runbooks/disk-space",
    notificationChannels: ["slack-platform"],
  },
]
```

## Health Checks

```typescript
// Comprehensive health check endpoint
interface HealthCheckResult {
  status: "healthy" | "degraded" | "unhealthy"
  checks: Record<string, CheckResult>
  version: string
  uptime: number
}

interface CheckResult {
  status: "healthy" | "degraded" | "unhealthy"
  responseTime: number
  message?: string
}

class HealthChecker {
  private checks: Map<string, () => Promise<CheckResult>> = new Map()

  register(name: string, check: () => Promise<CheckResult>): void {
    this.checks.set(name, check)
  }

  async check(): Promise<HealthCheckResult> {
    const results: Record<string, CheckResult> = {}
    let overallStatus: "healthy" | "degraded" | "unhealthy" = "healthy"

    const entries = await Promise.all(
      [...this.checks.entries()].map(async ([name, check]) => {
        try {
          return [name, await check()] as const
        } catch (e) {
          return [name, { status: "unhealthy" as const, responseTime: 0, message: (e as Error).message }] as const
        }
      })
    )

    for (const [name, result] of entries) {
      results[name] = result
      if (result.status === "unhealthy") overallStatus = "unhealthy"
      else if (result.status === "degraded" && overallStatus === "healthy") overallStatus = "degraded"
    }

    return {
      status: overallStatus,
      checks: results,
      version: process.env.APP_VERSION!,
      uptime: process.uptime(),
    }
  }
}

// Usage
const health = new HealthChecker()
health.register("database", async () => {
  const start = Date.now()
  await db.query("SELECT 1")
  return { status: "healthy", responseTime: Date.now() - start }
})
health.register("redis", async () => {
  const start = Date.now()
  await redis.ping()
  return { status: "healthy", responseTime: Date.now() - start }
})
health.register("external-api", async () => {
  const start = Date.now()
  try {
    await fetch("https://external-api.example.com/health", { signal: AbortSignal.timeout(5000) })
    return { status: "healthy", responseTime: Date.now() - start }
  } catch {
    return { status: "degraded", responseTime: Date.now() - start, message: "External API slow/unreachable" }
  }
})
```

## Dashboard Design

```
Dashboard Hierarchy:
  1. Executive Dashboard
     — SLO compliance, error budget, revenue impact
     — High-level green/yellow/red status

  2. Service Dashboard
     — Traffic (RPS), Latency (p50/p95/p99), Errors (rate), Saturation
     — Golden signals (Google SRE book)

  3. Infrastructure Dashboard
     — CPU, memory, disk, network per node/pod
     — Resource utilization, capacity planning

  4. Business Dashboard
     — Active users, conversion rate, revenue
     — Custom business metrics

Dashboard Rules:
  — One screen, no scrolling
  — Time range selector (1h, 6h, 24h, 7d, 30d)
  — Alerts overlay (red borders for firing alerts)
  — Drill-down capability (click metric → detailed view)
```

## Log Aggregation Pipeline

```
Application → Log Shipper → Message Queue → Processor → Storage → Query
    │              │              │              │           │          │
    │         Filebeat        Kafka        Logstash    Elasticsearch  Kibana
    │         Fluentd         RabbitMQ     Vector      Loki          Grafana
    │         Vector          Kinesis      Fluent Bit  ClickHouse    Superset
    │
    └── Structured JSON logs
        — timestamp, level, message, context
        — Consistent schema across services
        — Correlation IDs for tracing
```

```typescript
// Correlation ID middleware
function correlationIdMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const correlationId = req.headers["x-correlation-id"] ?? randomUUID()
    ;(req as any).correlationId = correlationId
    res.setHeader("x-correlation-id", correlationId)

    // Attach to logger
    ;(req as any).logger = baseLogger.child({ correlationId })

    next()
  }
}
```