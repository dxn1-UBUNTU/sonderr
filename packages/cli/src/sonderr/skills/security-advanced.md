---
name: security-advanced
description: Advanced security patterns and hardening. Covers OWASP Top 10 deep dive, cryptography, authentication/authorization patterns, secure headers, CSP, CORS, and penetration testing patterns. Use for security-sensitive code.
---

# Advanced Security Mastery

## OWASP Top 10 Deep Dive

### A01: Broken Access Control
```
Vulnerabilities:
  - Bypassing access control via URL/parameter tampering
  - Elevation of privilege (horizontal/vertical)
  - CORS misconfiguration allowing API access from untrusted origins
  - Force browsing to authenticated pages as anonymous user

Prevention:
  - Deny by default, allow explicitly
  - Implement access control on server-side (not just UI)
  - Check ownership: "does user X own resource Y?" before every access
  - Log access control failures and alert on repeated failures
  - Use JWT with short expiry + refresh tokens
  - Implement rate limiting on auth endpoints
```

### A02: Cryptographic Failures
```
Vulnerabilities:
  - Transmitting data in plaintext (HTTP, SMTP, FTP)
  - Using weak/deprecated algorithms (MD5, SHA1, DES)
  - Hardcoded encryption keys or weak key generation
  - Storing passwords with weak hashing (MD5, SHA1 without salt)

Prevention:
  - Encrypt all data in transit (TLS 1.3)
  - Use strong algorithms: AES-256-GCM, ChaCha20-Poly1305, Argon2
  - Never store passwords in plaintext — use bcrypt, argon2, scrypt
  - Use established crypto libraries (libsodium, OpenSSL)
  - Rotate encryption keys regularly
  - Never log sensitive data (tokens, passwords, PII)
```

### A03: Injection
```
Vulnerabilities:
  - SQL injection: Unsanitized user input in queries
  - Command injection: User input in shell commands
  - XSS: Unsanitized user input rendered in HTML
  - LDAP injection: Unsanitized input in LDAP queries
  - NoSQL injection: Unsanitized input in MongoDB queries

Prevention:
  - Parameterized queries for ALL database access
  - Input validation with allowlists (not blocklists)
  - Output encoding (HTML, URL, JavaScript, CSS)
  - Use ORMs that handle escaping
  - Content Security Policy (CSP) headers
  - Avoid shell commands with user input (use array arguments)
```

### A04: Insecure Design
```
Vulnerabilities:
  - Missing threat modeling
  - Business logic flaws (e.g., negative quantity in cart)
  - Race conditions in financial transactions
  - Missing rate limiting on sensitive operations

Prevention:
  - Threat modeling during design phase
  - Secure design patterns (defense in depth)
  - Principle of least privilege
  - Separation of duties
  - Fail securely (default deny)
```

### A05: Security Misconfiguration
```
Vulnerabilities:
  - Default credentials unchanged
  - Verbose error messages leaking stack traces
  - Unnecessary features enabled (ports, services, pages)
  - Missing security headers
  - Outdated software with known vulnerabilities

Prevention:
  - Harden configurations (disable unused features)
  - Automated scanning for misconfigurations
  - Consistent deployment process across environments
  - Regular patching schedule
  - Security headers (CSP, HSTS, X-Frame-Options)
```

### A06: Vulnerable and Outdated Components
```
Vulnerabilities:
  - Using libraries with known CVEs
  - Unpatched frameworks
  - End-of-life software still in production

Prevention:
  - Software composition analysis (SCA)
  - Automated dependency scanning (npm audit, Snyk, Dependabot)
  - Remove unused dependencies
  - Pin versions and verify checksums
  - Subscribe to security advisories for critical dependencies
```

### A07: Identification and Authentication Failures
```
Vulnerabilities:
  - Weak password policies
  - Credential stuffing (no rate limiting)
  - Session fixation
  - Insecure password recovery
  - Predictable session IDs

Prevention:
  - Multi-factor authentication (MFA)
  - Rate limiting on login attempts
  - Strong password policies (length > complexity)
  - Secure session management (httpOnly, secure, sameSite cookies)
  - Account lockout after repeated failures
```

### A08: Software and Data Integrity Failures
```
Vulnerabilities:
  - Unsigned software updates
  - Insecure deserialization
  - CI/CD pipeline compromise
  - Untrusted data without integrity checks

Prevention:
  - Sign and verify software updates
  - Validate deserialized data
  - Secure CI/CD pipeline (signed commits, branch protection)
  - Integrity verification (checksums, signatures)
```

### A09: Security Logging and Monitoring Failures
```
Vulnerabilities:
  - Insufficient logging of security events
  - Logs not monitored in real-time
  - Logs stored only locally
  - No alerting on suspicious activity

Prevention:
  - Log authentication attempts (success and failure)
  - Log access control decisions
  - Log input validation failures
  - Centralized log management (SIEM)
  - Real-time alerting on anomalies
```

### A10: Server-Side Request Forgery (SSRF)
```
Vulnerabilities:
  - Fetching user-provided URLs without validation
  - Accessing internal services via SSRF
  - Cloud metadata service access (169.254.169.254)

Prevention:
  - Validate and sanitize all user-provided URLs
  - Use allowlists for permitted domains
  - Block requests to internal IP ranges
  - Disable URL redirects
  - Use a dedicated HTTP client with SSRF protections
```

## Security Headers

```typescript
// Express.js security headers
app.use(helmet())

// Or manually:
app.use((req, res, next) => {
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
  res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self' 'nonce-{random}'")
  res.setHeader("X-Content-Type-Options", "nosniff")
  res.setHeader("X-Frame-Options", "DENY")
  res.setHeader("X-XSS-Protection", "0")  // Disabled in favor of CSP
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin")
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
  next()
})
```

## Content Security Policy (CSP)

```
Strict CSP:
  Content-Security-Policy:
    default-src 'none';
    script-src 'nonce-{random}' 'strict-dynamic';
    style-src 'self' 'nonce-{random}';
    img-src 'self' data: https:;
    font-src 'self';
    connect-src 'self';
    frame-ancestors 'none';
    base-uri 'none';
    form-action 'self'

Report-Only Mode (test before enforcing):
  Content-Security-Policy-Report-Only: <policy>
```

## CORS Configuration

```typescript
// Secure CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    const allowed = ["https://app.example.com", "https://admin.example.com"]
    if (!origin || allowed.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error("Not allowed by CORS"))
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  maxAge: 86400,  // Cache preflight for 24 hours
}))
```

## Authentication Patterns

### JWT with Refresh Tokens
```typescript
// Access token (short-lived, 15 min)
function createAccessToken(user: User): string {
  return jwt.sign(
    { sub: user.id, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: "15m", algorithm: "HS256" }
  )
}

// Refresh token (long-lived, 7 days, stored hashed in DB)
async function createRefreshToken(user: User): Promise<string> {
  const token = crypto.randomBytes(64).toString("hex")
  const hashed = await bcrypt.hash(token, 10)
  await db.refreshTokens.create({
    userId: user.id,
    tokenHash: hashed,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  })
  return token
}

// Token refresh endpoint
app.post("/auth/refresh", async (req, res) => {
  const { refreshToken } = req.cookies
  if (!refreshToken) return res.status(401).json({ error: "No refresh token" })

  // Find token in DB and verify
  const stored = await db.refreshTokens.findValid(refreshToken)
  if (!stored) return res.status(401).json({ error: "Invalid refresh token" })

  // Rotate: delete old token, issue new pair
  await db.refreshTokens.delete(stored.id)
  const user = await db.users.find(stored.userId)
  res.json({
    accessToken: createAccessToken(user),
    refreshToken: await createRefreshToken(user),
  })
})
```

### OAuth 2.0 / OpenID Connect
```
Authorization Code Flow (most secure):
  1. Client → Authorization Server: Request authorization code
  2. User authenticates and consents
  3. Authorization Server → Client: Authorization code (via redirect)
  4. Client → Authorization Server: Exchange code for tokens
  5. Authorization Server → Client: Access token + ID token

PKCE (Proof Key for Code Exchange) for public clients:
  1. Client generates code_verifier and code_challenge
  2. Send code_challenge with authorization request
  3. Send code_verifier with token request
  4. Server verifies challenge matches verifier
```

## Input Validation

```typescript
// Zod schema validation
import { z } from "zod"

const CreateUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().int().min(13).max(120).optional(),
  role: z.enum(["user", "admin"]).default("user"),
  website: z.string().url().optional(),
})

// Middleware
function validate<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        error: "Validation failed",
        fields: result.error.flatten().fieldErrors,
      })
    }
    req.body = result.data
    next()
  }
}

// Usage
app.post("/users", validate(CreateUserSchema), createUser)
```

## Secure File Handling

```typescript
// File upload security
const upload = multer({
  storage: multer.diskStorage({
    destination: "/tmp/uploads",
    filename: (req, file, cb) => {
      // Generate random filename, never use user-provided name
      const ext = path.extname(file.originalname).toLowerCase()
      const allowed = [".jpg", ".jpeg", ".png", ".gif", ".pdf"]
      if (!allowed.includes(ext)) {
        return cb(new Error("File type not allowed"), "")
      }
      cb(null, `${crypto.randomUUID()}${ext}`)
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024,  // 5MB max
    files: 5,
  },
})

// Validate file type by magic bytes (not just extension)
async function validateFileType(path: string, expected: string): Promise<boolean> {
  const buffer = await readFile(path, { length: 4 })
  const signatures: Record<string, Buffer> = {
    "image/png": Buffer.from([0x89, 0x50, 0x4E, 0x47]),
    "image/jpeg": Buffer.from([0xFF, 0xD8, 0xFF]),
    "application/pdf": Buffer.from([0x25, 0x50, 0x44, 0x46]),
  }
  return buffer.equals(signatures[expected] || Buffer.alloc(0))
}
```

## Rate Limiting

```typescript
// Sliding window rate limiter
class RateLimiter {
  constructor(
    private redis: Redis,
    private maxRequests: number = 100,
    private windowSeconds: number = 60
  ) {}

  async check(key: string): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const now = Date.now()
    const windowStart = now - this.windowSeconds * 1000

    const pipeline = this.redis.pipeline()
    pipeline.zremrangebyscore(key, 0, windowStart)
    pipeline.zadd(key, now, `${now}`)
    pipeline.zcard(key)
    pipeline.expire(key, this.windowSeconds)

    const results = await pipeline.exec()
    const count = (results?.[2]?.[1] as number) ?? 0

    return {
      allowed: count <= this.maxRequests,
      remaining: Math.max(0, this.maxRequests - count),
      resetAt: now + this.windowSeconds * 1000,
    }
  }
}

// Middleware
function rateLimiter(options: { max?: number; window?: number } = {}) {
  const limiter = new RateLimiter(redis, options.max, options.window)
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = `rate:${req.ip}:${req.path}`
    const { allowed, remaining, resetAt } = await limiter.check(key)

    res.setHeader("X-RateLimit-Limit", options.max ?? 100)
    res.setHeader("X-RateLimit-Remaining", remaining)
    res.setHeader("X-RateLimit-Reset", resetAt)

    if (!allowed) {
      return res.status(429).json({ error: "Too many requests" })
    }
    next()
  }
}
```