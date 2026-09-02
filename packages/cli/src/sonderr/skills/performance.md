---
name: performance
description: Performance optimization patterns. Covers profiling, benchmarking, memory optimization, lazy loading, code splitting, and performance budgets. Use for optimizing application performance.
---

# Performance Mastery

## Performance Budgets

```
Web Performance Budgets:
  — First Contentful Paint (FCP): < 1.8s
  — Largest Contentful Paint (LCP): < 2.5s
  — First Input Delay (FID): < 100ms
  — Cumulative Layout Shift (CLS): < 0.1
  — Time to Interactive (TTI): < 3.8s
  — Total Blocking Time (TBT): < 200ms

Bundle Size Budgets:
  — Initial JS: < 200KB gzipped
  — Total JS: < 500KB gzipped
  — CSS: < 50KB gzipped
  — Images: < 500KB per page
  — Fonts: < 100KB per page

API Performance Budgets:
  — p50 latency: < 100ms
  — p95 latency: < 500ms
  — p99 latency: < 1000ms
  — Error rate: < 0.1%
```

## Profiling and Benchmarking

```typescript
// Benchmark utility
async function benchmark<T>(
  name: string,
  fn: () => Promise<T>,
  options: { iterations?: number; warmup?: number } = {}
): Promise<{ name: string; avgMs: number; minMs: number; maxMs: number; p95Ms: number }> {
  const iterations = options.iterations ?? 100
  const warmup = options.warmup ?? 10

  // Warmup
  for (let i = 0; i < warmup; i++) await fn()

  const times: number[] = []
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    await fn()
    times.push(performance.now() - start)
  }

  times.sort((a, b) => a - b)
  const avg = times.reduce((a, b) => a + b, 0) / times.length
  const p95 = times[Math.floor(times.length * 0.95)]

  return { name, avgMs: avg, minMs: times[0], maxMs: times[times.length - 1], p95Ms: p95 }
}

// Memory profiling
function measureMemory<T>(fn: () => T): { result: T; memoryDelta: number } {
  if (globalThis.gc) globalThis.gc()
  const before = process.memoryUsage().heapUsed
  const result = fn()
  if (globalThis.gc) globalThis.gc()
  const after = process.memoryUsage().heapUsed
  return { result, memoryDelta: after - before }
}

// CPU profiling wrapper
async function profileCPU<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const start = process.cpuUsage()
  const startTime = performance.now()

  try {
    return await fn()
  } finally {
    const elapsed = performance.now() - startTime
    const cpu = process.cpuUsage(start)
    console.log(`${name}: ${elapsed.toFixed(2)}ms, CPU: ${(cpu.user + cpu.system) / 1000}ms`)
  }
}
```

## Lazy Loading Patterns

```typescript
// React lazy loading with Suspense
import { lazy, Suspense } from "react"

const HeavyComponent = lazy(() => import("./HeavyComponent"))

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <HeavyComponent />
    </Suspense>
  )
}

// Intersection Observer lazy loading
function useInView<T extends HTMLElement>(): [React.RefObject<T>, boolean] {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.unobserve(el)
        }
      },
      { rootMargin: "100px" }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return [ref, inView]
}

// Dynamic import with retry
async function loadWithRetry<T>(loader: () => Promise<T>, retries = 3): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await loader()
    } catch (e) {
      if (i === retries - 1) throw e
      await sleep(1000 * Math.pow(2, i))
    }
  }
  throw new Error("Unreachable")
}
```

## Code Splitting Strategies

```typescript
// Route-based splitting
const routes = [
  {
    path: "/",
    component: lazy(() => import("./pages/Home")),
  },
  {
    path: "/dashboard",
    component: lazy(() => import("./pages/Dashboard")),
  },
  {
    path: "/settings",
    component: lazy(() => import("./pages/Settings")),
  },
]

// Component-based splitting
const HeavyChart = lazy(() => import("./components/HeavyChart"))
const RichTextEditor = lazy(() => import("./components/RichTextEditor"))

// Library splitting (vite/webpack config)
// vite.config.ts
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom"],
          "ui-vendor": ["@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu"],
          "utils-vendor": ["lodash", "date-fns"],
        },
      },
    },
  },
}

// Preload critical resources
function preloadComponent(loader: () => Promise<any>) {
  const Component = lazy(loader)
  Component.preload = loader
  return Component
}

// Usage: preload on hover
function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const preload = () => {
    // @ts-ignore
    routeComponents[to]?.preload?.()
  }

  return <Link to={to} onMouseEnter={preload}>{children}</Link>
}
```

## Memory Optimization

```typescript
// Object pooling
class ObjectPool<T> {
  private pool: T[] = []
  private create: () => T
  private reset: (obj: T) => T

  constructor(create: () => T, reset: (obj: T) => T, initialSize = 10) {
    this.create = create
    this.reset = reset
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(create())
    }
  }

  acquire(): T {
    return this.pool.pop() ?? this.create()
  }

  release(obj: T): void {
    this.pool.push(this.reset(obj))
  }
}

// Usage
const bufferPool = new ObjectPool<Buffer>(
  () => Buffer.alloc(1024),
  (buf) => buf.fill(0),
  20
)

// WeakRef for caches
class WeakCache<K extends object, V> {
  private cache = new Map<K, WeakRef<V>>()
  private finalizer = new FinalizationRegistry<K>((key) => {
    this.cache.delete(key)
  })

  set(key: K, value: V): void {
    this.cache.set(key, new WeakRef(value))
    this.finalizer.register(value, key)
  }

  get(key: K): V | undefined {
    const ref = this.cache.get(key)
    if (!ref) return undefined
    const value = ref.deref()
    if (!value) {
      this.cache.delete(key)
      return undefined
    }
    return value
  }
}

// Lazy initialization
class Lazy<T> {
  private value: T | undefined
  private initialized = false

  constructor(private factory: () => T) {}

  get(): T {
    if (!this.initialized) {
      this.value = this.factory()
      this.initialized = true
    }
    return this.value!
  }
}
```

## Rendering Optimization

```typescript
// Virtual scrolling
function useVirtualList<T>(items: T[], itemHeight: number, overscan = 5) {
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(0)

  const totalHeight = items.length * itemHeight
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  )

  const visibleItems = items.slice(startIndex, endIndex).map((item, i) => ({
    item,
    index: startIndex + i,
    style: {
      position: "absolute" as const,
      top: (startIndex + i) * itemHeight,
      height: itemHeight,
    },
  }))

  return { visibleItems, totalHeight, setScrollTop, setContainerHeight }
}

// Debounced render
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}

// Throttled callback
function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastCall = useRef(0)

  return ((...args: Parameters<T>) => {
    const now = Date.now()
    if (now - lastCall.current >= delay) {
      lastCall.current = now
      return callback(...args)
    }
  }) as T
}
```

## Network Optimization

```typescript
// Request deduplication
class RequestDeduper<T> {
  private inFlight = new Map<string, Promise<T>>()

  async execute(key: string, request: () => Promise<T>): Promise<T> {
    const existing = this.inFlight.get(key)
    if (existing) return existing

    const promise = request().finally(() => {
      this.inFlight.delete(key)
    })

    this.inFlight.set(key, promise)
    return promise
  }
}

// Batched requests
class RequestBatcher<T, R> {
  private queue: Array<{ item: T; resolve: (r: R) => void; reject: (e: Error) => void }> = []
  private timeout: ReturnType<typeof setTimeout> | null = null

  constructor(
    private batchFn: (items: T[]) => Promise<R[]>,
    private options: { maxBatchSize: number; maxWaitMs: number }
  ) {}

  add(item: T): Promise<R> {
    return new Promise((resolve, reject) => {
      this.queue.push({ item, resolve, reject })
      if (this.queue.length >= this.options.maxBatchSize) {
        this.flush()
      } else if (!this.timeout) {
        this.timeout = setTimeout(() => this.flush(), this.options.maxWaitMs)
      }
    })
  }

  private async flush(): Promise<void> {
    if (this.timeout) {
      clearTimeout(this.timeout)
      this.timeout = null
    }

    const batch = this.queue.splice(0, this.options.maxBatchSize)
    if (batch.length === 0) return

    try {
      const results = await this.batchFn(batch.map((b) => b.item))
      batch.forEach((b, i) => b.resolve(results[i]))
    } catch (error) {
      batch.forEach((b) => b.reject(error as Error))
    }
  }
}

// Usage
const userLoader = new RequestBatcher<string, User>(
  async (ids) => {
    const response = await fetch(`/api/users?ids=${ids.join(",")}`)
    return response.json()
  },
  { maxBatchSize: 50, maxWaitMs: 20 }
)
```

## Image Optimization

```typescript
// Responsive image component
function ResponsiveImage({
  src,
  alt,
  sizes,
  priority = false,
}: {
  src: string
  alt: string
  sizes: string
  priority?: boolean
}) {
  const srcSet = [320, 640, 960, 1280, 1920]
    .map((w) => `${src}?w=${w} ${w}w`)
    .join(", ")

  return (
    <img
      src={`${src}?w=960`}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      style={{ contentVisibility: "auto" }}
    />
  )
}

// Blur hash placeholder
function BlurPlaceholder({ hash, width, height }: { hash: string; width: number; height: number }) {
  const [dataUrl, setDataUrl] = useState("")

  useEffect(() => {
    const pixels = decodeBlurHash(hash, width, height)
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")!
    const imageData = ctx.createImageData(width, height)
    imageData.data.set(pixels)
    ctx.putImageData(imageData, 0, 0)
    setDataUrl(canvas.toDataURL())
  }, [hash, width, height])

  return <img src={dataUrl} alt="" style={{ filter: "blur(20px)" }} />
}
```

## Performance Monitoring

```typescript
// Core Web Vitals monitoring
function monitorWebVitals() {
  // LCP
  new PerformanceObserver((list) => {
    const entries = list.getEntries()
    const last = entries[entries.length - 1]
    reportMetric("LCP", last.startTime)
  }).observe({ type: "largest-contentful-paint", buffered: true })

  // FID
  new PerformanceObserver((list) => {
    const entry = list.getEntries()[0] as PerformanceEventTiming
    if (!entry) return
    reportMetric("FID", entry.processingStart - entry.startTime)
  }).observe({ type: "first-input", buffered: true })

  // CLS
  let clsValue = 0
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!(entry as any).hadRecentInput) {
        clsValue += (entry as any).value
      }
    }
    reportMetric("CLS", clsValue)
  }).observe({ type: "layout-shift", buffered: true })
}

function reportMetric(name: string, value: number) {
  navigator.sendBeacon("/analytics", JSON.stringify({
    name,
    value,
    page: window.location.pathname,
    timestamp: Date.now(),
  }))
}

// Long task detection
function monitorLongTasks() {
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.duration > 50) {
        console.warn(`Long task: ${entry.duration}ms`, entry)
      }
    }
  }).observe({ type: "longtask", buffered: true })
}
```