---
name: cloud-patterns
description: Cloud architecture patterns for AWS, GCP, and Azure. Covers serverless, containers, IaC, CI/CD, monitoring, and cost optimization. Use for cloud-native applications.
---

# Cloud Patterns Mastery

## Serverless Patterns

```typescript
// AWS Lambda handler
import { APIGatewayProxyHandler } from "aws-lambda"
import { DynamoDB } from "@aws-sdk/client-dynamodb"

export const handler: APIGatewayProxyHandler = async (event) => {
  const userId = event.requestContext.authorizer?.userId

  // Idempotency check
  const idempotencyKey = event.headers["Idempotency-Key"]
  if (idempotencyKey) {
    const existing = await getProcessedRequest(idempotencyKey)
    if (existing) return { statusCode: 200, body: JSON.stringify(existing) }
  }

  try {
    const result = await processRequest(event.body)

    // Store result for idempotency
    if (idempotencyKey) {
      await storeProcessedRequest(idempotencyKey, result)
    }

    return { statusCode: 200, body: JSON.stringify(result) }
  } catch (error) {
    console.error("Request failed:", { error, event })
    return { statusCode: 500, body: JSON.stringify({ error: "Internal error" }) }
  }
}

// Lambda power tuning: balance memory vs duration
// More memory = more CPU = faster execution = potentially lower cost
```

## Container Patterns

```dockerfile
# Multi-stage build
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 appuser
COPY --from=builder --chown=appuser:nodejs /app/dist ./dist
COPY --from=builder --chown=appuser:nodejs /app/node_modules ./node_modules
USER appuser
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1
CMD ["node", "dist/main.js"]
```

## Infrastructure as Code (Pulumi)

```typescript
import * as pulumi from "@pulumi/pulumi"
import * as aws from "@pulumi/aws"

// S3 bucket with versioning
const bucket = new aws.s3.AppBucket("app-assets", {
  versioning: { enabled: true },
  lifecycleRules: [{
    enabled: true,
    expiration: { days: 90 },
    transitions: [{ days: 30, storageClass: "STANDARD_IA" }],
  }],
  serverSideEncryptionConfiguration: {
    rule: { applyServerSideEncryptionByDefault: { sseAlgorithm: "AES256" } },
  },
})

// DynamoDB table
const table = new aws.dynamodb.Table("app-data", {
  hashKey: "pk",
  rangeKey: "sk",
  billingMode: "PAY_PER_REQUEST",
  attributes: [
    { name: "pk", type: "S" },
    { name: "sk", type: "S" },
    { name: "gsi1pk", type: "S" },
    { name: "gsi1sk", type: "S" },
  ],
  globalSecondaryIndexes: [{
    name: "gsi1",
    hashKey: "gsi1pk",
    rangeKey: "gsi1sk",
    projectionType: "ALL",
  }],
  ttl: { attributeName: "ttl", enabled: true },
  pointInTimeRecovery: { enabled: true },
})

// Lambda with proper IAM
const role = new aws.iam.Role("lambda-role", {
  assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ Service: "lambda.amazonaws.com" }),
})

new aws.iam.RolePolicyAttachment("lambda-basic", {
  role: role.name,
  policyArn: aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole,
})

const fn = new aws.lambda.Function("api-handler", {
  runtime: "nodejs20.x",
  handler: "index.handler",
  code: new pulumi.asset.AssetArchive({ ".": new pulumi.asset.FileArchive("./dist") }),
  role: role.arn,
  memorySize: 512,
  timeout: 30,
  environment: { variables: { TABLE_NAME: table.name } },
})

export const bucketName = bucket.id
export const tableName = table.name
export const functionName = fn.name
```

## Event-Driven Architecture

```typescript
// Event bridge pattern
import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge"

const eventBridge = new EventBridgeClient({})

async function publishOrderCreated(order: Order) {
  await eventBridge.send(new PutEventsCommand({
    Entries: [{
      Source: "com.myapp.orders",
      DetailType: "OrderCreated",
      Detail: JSON.stringify(order),
      EventBusName: "main",
    }],
  }))
}

// SQS queue with DLQ
const dlq = new aws.sqs.Queue("worker-dlq", { messageRetentionSeconds: 1209600 })
const queue = new aws.sqs.Queue("worker-queue", {
  visibilityTimeoutSeconds: 300,
  redrivePolicy: JSON.stringify({
    deadLetterTargetArn: dlq.arn,
    maxReceiveCount: 3,
  }),
})

// SNS fanout
const topic = new aws.sns.Topic("notifications")
new aws.sns.TopicSubscription("email-sub", {
  topic: topic.arn,
  protocol: "email",
  endpoint: "alerts@example.com",
})
new aws.sns.TopicSubscription("lambda-sub", {
  topic: topic.arn,
  protocol: "lambda",
  endpoint: notificationLambda.arn,
})
```

## Caching Strategies

```typescript
// ElastiCache Redis
const subnetGroup = new aws.elasticache.SubnetGroup("cache-subnets", {
  subnetIds: privateSubnetIds,
})

const cache = new aws.elasticache.ReplicationGroup("app-cache", {
  replicationGroupDescription: "App cache",
  engine: "redis",
  nodeType: "cache.t4g.micro",
  numCacheClusters: 2,
  automaticFailoverEnabled: true,
  subnetGroupName: subnetGroup.name,
  securityGroupIds: [cacheSecurityGroup.id],
  atRestEncryptionEnabled: true,
  transitEncryptionEnabled: true,
})

// Cache-aside pattern
async function getUser(id: string): Promise<User> {
  const cached = await redis.get(`user:${id}`)
  if (cached) return JSON.parse(cached)

  const user = await db.users.findUnique({ where: { id } })
  await redis.set(`user:${id}`, JSON.stringify(user), "EX", 3600)
  return user
}
```

## Security Best Practices

```
IAM:
  — Least privilege: grant only required permissions
  — Use roles, not access keys
  — Rotate credentials regularly
  — Enable MFA for human users

Networking:
  — Private subnets for compute
  — Public subnets only for load balancers
  — Security groups: whitelist, not blacklist
  — VPC endpoints for AWS services

Data:
  — Encrypt at rest (S3, EBS, RDS, DynamoDB)
  — Encrypt in transit (TLS 1.2+)
  — Never store secrets in code
  — Use Secrets Manager or Parameter Store

Monitoring:
  — CloudTrail for API auditing
  — CloudWatch for metrics and alarms
  — GuardDuty for threat detection
  — Config for compliance monitoring
```

## Cost Optimization

```
Right-sizing:
  — Monitor CPU/memory utilization
  — Downsize over-provisioned instances
  — Use Graviton (ARM) for better price/performance

Reserved capacity:
  — Reserved Instances for steady-state workloads
  — Savings Plans for flexible commitments

Storage:
  — S3 Intelligent-Tiering for unknown access patterns
  — Lifecycle policies to archive old data
  — Delete unused EBS snapshots

Serverless:
  — Lambda for sporadic workloads
  — Fargate Spot for fault-tolerant workloads
  — DynamoDB on-demand for unpredictable traffic
```
