---
name: devops-advanced
description: Advanced DevOps and infrastructure patterns. Covers Kubernetes, service mesh, GitOps, infrastructure as code, monitoring, and deployment strategies. Use for complex infrastructure.
---

# Advanced DevOps Mastery

## Kubernetes Patterns

```yaml
# Deployment with rolling update strategy
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
    spec:
      containers:
        - name: api
          image: api-server:latest
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 512Mi
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
          env:
            - name: NODE_ENV
              value: "production"
            - name: DB_HOST
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: host
```

## Horizontal Pod Autoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-server-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  minReplicas: 2
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Pods
          value: 4
          periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 10
          periodSeconds: 60
```

## GitOps with ArgoCD

```yaml
# Application definition
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/org/my-app.git
    targetRevision: HEAD
    path: k8s/overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

## Infrastructure as Code (Pulumi TypeScript)

```typescript
import * as pulumi from "@pulumi/pulumi"
import * as aws from "@pulumi/aws"
import * as eks from "@pulumi/eks"

// VPC
const vpc = new aws.ec2.Vpc("main", {
  cidrBlock: "10.0.0.0/16",
  enableDnsHostnames: true,
  enableDnsSupport: true,
  tags: { Name: "main-vpc" },
})

// Subnets
const publicSubnets = ["10.0.1.0/24", "10.0.2.0/24"].map((cidr, i) =>
  new aws.ec2.Subnet(`public-${i}`, {
    vpcId: vpc.id,
    cidrBlock: cidr,
    availabilityZone: `us-east-1${"ab"[i]}`,
    mapPublicIpOnLaunch: true,
  })
)

// EKS Cluster
const cluster = new eks.Cluster("main", {
  vpcId: vpc.id,
  subnetIds: publicSubnets.map((s) => s.id),
  instanceType: "t3.medium",
  desiredCapacity: 2,
  minSize: 1,
  maxSize: 5,
})

// RDS Instance
const db = new aws.rds.Instance("postgres", {
  engine: "postgres",
  engineVersion: "15",
  instanceClass: "db.t3.micro",
  allocatedStorage: 20,
  dbName: "appdb",
  username: "admin",
  password: pulumi.secret(process.env.DB_PASSWORD!),
  skipFinalSnapshot: true,
  publiclyAccessible: false,
  vpcSecurityGroupIds: [dbSecurityGroup.id],
})

export const kubeconfig = cluster.kubeconfig
export const dbEndpoint = db.endpoint
```

## Deployment Strategies

```
Blue-Green Deployment:
  — Two identical environments (blue and green)
  — Deploy new version to idle environment
  — Switch traffic when healthy
  — Instant rollback by switching back
  — Cost: 2x infrastructure

Canary Deployment:
  — Route small % of traffic to new version
  — Gradually increase based on metrics
  — Automatic rollback on error rate spike
  — Cost: minimal overhead

Rolling Deployment:
  — Replace instances one by one
  — Zero-downtime but slower
  — No extra infrastructure
  — Risk: mixed versions during rollout

Feature Flags:
  — Deploy code dark (disabled)
  — Enable for specific users/groups
  — Instant rollback by disabling flag
  — Enables trunk-based development
```

```typescript
// Feature flag service
class FeatureFlagService {
  constructor(
    private store: FeatureFlagStore,
    private contextProvider: () => FlagContext
  ) {}

  isEnabled(flagName: string): boolean {
    const flag = this.store.get(flagName)
    if (!flag) return false
    if (!flag.enabled) return false

    const ctx = this.contextProvider()

    // Check user targeting
    if (flag.userIds && !flag.userIds.includes(ctx.userId)) return false

    // Check percentage rollout
    if (flag.percentage !== undefined) {
      const hash = this.hashUser(flagName, ctx.userId)
      return hash < flag.percentage
    }

    // Check groups
    if (flag.groups && !flag.groups.some((g) => ctx.groups.includes(g))) return false

    return true
  }

  private hashUser(flagName: string, userId: string): number {
    const hash = crypto.createHash("md5").update(`${flagName}:${userId}`).digest()
    return hash.readUInt32BE(0) % 10000 / 100
  }
}
```

## CI/CD Pipeline (GitHub Actions)

```yaml
name: CI/CD Pipeline
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install --frozen-lockfile
      - run: bun run typecheck
      - run: bun test
      - run: bun run lint

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install --frozen-lockfile
      - run: bun run build
      - uses: actions/upload-artifact@v4
        with:
          name: build
          path: dist/

  deploy-staging:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: build
          path: dist/
      - run: |
          kubectl set image deployment/api-server \
            api=api-server:${{ github.sha }} \
            --namespace=staging

  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: build
          path: dist/
      - run: |
          kubectl set image deployment/api-server \
            api=api-server:${{ github.sha }} \
            --namespace=production
```

## Service Mesh (Istio)

```yaml
# Traffic splitting for canary
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-server
spec:
  hosts:
    - api-server
  http:
    - match:
        - headers:
            x-canary:
              exact: "true"
      route:
        - destination:
            host: api-server
            subset: canary
    - route:
        - destination:
            host: api-server
            subset: stable
          weight: 95
        - destination:
            host: api-server
            subset: canary
          weight: 5
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: api-server
spec:
  host: api-server
  subsets:
    - name: stable
      labels:
        version: stable
    - name: canary
      labels:
        version: canary
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        h2UpgradePolicy: DEFAULT
        http1MaxPendingRequests: 100
        http2MaxRequests: 1000
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
```

## Observability Stack

```
Monitoring Stack:
  — Prometheus: Metrics collection and alerting
  — Grafana: Visualization and dashboards
  — Loki: Log aggregation
  — Tempo: Distributed tracing
  — Alertmanager: Alert routing and grouping

Logging Pipeline:
  Application → Fluent Bit → Kafka → Loki → Grafana

Metrics Pipeline:
  Application → Prometheus → Grafana
  External: Datadog, New Relic, Grafana Cloud

Tracing Pipeline:
  Application → OpenTelemetry → Jaeger/Tempo → Grafana
```

```typescript
// OpenTelemetry instrumentation
import { NodeSDK } from "@opentelemetry/sdk-node"
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http"
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics"

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({ url: "http://tempo:4318/v1/traces" }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({ url: "http://prometheus:4318/v1/metrics" }),
  }),
  instrumentations: [getNodeAutoInstrumentations()],
})

sdk.start()
```

## Security Scanning

```yaml
# Security scanning in CI
security:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4

    # Dependency scanning
    - name: Run Trivy vulnerability scanner
      uses: aquasecurity/trivy-action@master
      with:
        scan-type: "fs"
        scan-ref: "."
        severity: "CRITICAL,HIGH"
        exit-code: "1"

    # Secret scanning
    - name: Secret detection
      uses: trufflesecurity/trufflehog@main
      with:
        extra_args: --only-verified

    # SAST
    - name: Run Semgrep
      uses: returntocorp/semgrep-action@v1
      with:
        config: >-
          p/security-audit
          p/owasp-top-ten
          p/cwe-top-25

    # Container scanning
    - name: Build and scan image
      run: |
        docker build -t app:${{ github.sha }} .
        trivy image --severity HIGH,CRITICAL app:${{ github.sha }}
```