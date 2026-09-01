---
name: security
description: Secure coding practices and common vulnerability prevention. Use when handling user input, authentication, data access, or any security-sensitive code. Covers OWASP top 10, injection prevention, and secure patterns.
---

# Security Skill — Don't Be the Reason Users Get Hacked

Security is not a feature you add later. It's a property of how you write every line of code. This skill ensures you don't introduce vulnerabilities that put users at risk.

## The Security Mindset

Assume every input is malicious. Every user is an attacker. Every dependency is compromised. This isn't paranoia — it's how you write secure code.

## The OWASP Top 10 — and how to prevent each

### A01: Broken Access Control
- **The bug**: Users can access other users' data or admin functions
- **The fix**: Check permissions on EVERY request, not just at the UI level
- **Rules**:
  - Deny by default, allow explicitly
  - Validate ownership: "does user X own resource Y?" before every access
  - Don't rely on hidden fields or disabled buttons for security
  - Log access control failures

### A02: Cryptographic Failures
- **The bug**: Sensitive data exposed due to weak or missing encryption
- **The fix**: Encrypt data at rest and in transit, use strong algorithms
- **Rules**:
  - Never store passwords in plaintext — use bcrypt, argon2, scrypt
  - Use HTTPS for all connections
  - Don't roll your own crypto — use established libraries
  - Don't log sensitive data (tokens, passwords, PII)

### A03: Injection
- **The bug**: User input interpreted as code (SQL, command, LDAP)
- **The fix**: Never concatenate user input into queries or commands
- **Rules**:
  - Use parameterized queries for ALL database access
  - Escape shell arguments (use arrays, not string concatenation)
  - Sanitize HTML output to prevent XSS
  - Validate input against allowlists, not blocklists

### A04: Insecure Design
- **The bug**: Architectural flaws that can't be patched with code
- **The fix**: Design for security from the start
- **Rules**:
  - Fail securely: when something goes wrong, default to the safe state
  - Principle of least privilege: give code only the access it needs
  - Separate tenants: one user's data must never leak to another

### A05: Security Misconfiguration
- **The bug**: Default credentials, verbose errors, unnecessary features
- **The fix**: Harden configurations
- **Rules**:
  - Change default passwords immediately
  - Disable verbose error messages in production
  - Remove unused features, endpoints, and dependencies
  - Keep dependencies updated

### A06: Vulnerable Components
- **The bug**: Using libraries with known vulnerabilities
- **The fix**: Keep dependencies patched
- **Rules**:
  - Run `npm audit` / `pip audit` regularly
  - Update dependencies promptly
  - Remove unused dependencies
  - Pin versions to prevent supply chain attacks

### A07: Auth Failures
- **The bug**: Weak authentication allows account takeover
- **The fix**: Strong auth everywhere
- **Rules**:
  - Never store tokens in localStorage (use httpOnly cookies)
  - Implement rate limiting on auth endpoints
  - Use multi-factor authentication for sensitive operations
  - Invalidate sessions on logout, not just client-side

### A08: Data Integrity
- **The bug**: Data or code tampered with undetected
- **The fix**: Verify integrity
- **Rules**:
  - Sign and verify software updates
  - Validate deserialized data
  - Don't accept unsigned JWTs

### A09: Logging Failures
- **The bug**: Attacks go undetected due to missing logs
- **The fix**: Log security events
- **Rules**:
  - Log authentication attempts (success and failure)
  - Log access control decisions
  - Never log sensitive data
  - Set up alerts for suspicious patterns

### A10: SSRF
- **The bug**: Server makes requests to attacker-controlled URLs
- **The fix**: Validate and restrict outbound requests
- **Rules**:
  - Validate URLs against an allowlist
  - Don't fetch user-provided URLs directly
  - Block requests to internal IP ranges (10.x, 172.16.x, 192.168.x)

## Secure coding rules

### Input validation
- **Validate on the server** — client-side validation is for UX, not security
- **Use allowlists** — define what's allowed, reject everything else
- **Validate type, length, format, and range**
- **Sanitize before use** — not just before storage

### Output encoding
- **HTML encode** before rendering user content (prevent XSS)
- **URL encode** before putting data in URLs
- **SQL encode** — but better, use parameterized queries
- **Shell encode** — but better, use array arguments

### Authentication
- **Never store plaintext passwords** — use bcrypt/argon2
- **Use established auth libraries** — don't build your own
- **Implement rate limiting** — on login, password reset, API endpoints
- **Use secure session management** — httpOnly, secure, sameSite cookies

### Secrets management
- **Never hardcode secrets** — use environment variables or a vault
- **Never commit secrets** — use `.env` files (gitignored) or secret managers
- **Never log secrets** — redact tokens, keys, passwords from logs
- **Rotate secrets regularly** — and immediately if leaked

### File handling
- **Validate file types** — not just extension, check magic bytes
- **Restrict upload sizes** — prevent disk exhaustion
- **Store uploads outside web root** — prevent direct execution
- **Sanitize filenames** — prevent path traversal (`../../etc/passwd`)

### Database
- **Use parameterized queries** — ALWAYS, no exceptions
- **Limit database permissions** — app user should not be admin
- **Validate data types** — before inserting
- **Use an ORM** — they handle escaping for you

## Security checklist for every task

Before reporting any task complete, verify:

- [ ] No hardcoded secrets, tokens, or keys
- [ ] All user input is validated
- [ ] No injection vulnerabilities (SQL, command, XSS)
- [ ] Authentication/authorization checks present where needed
- [ ] Sensitive data not logged
- [ ] Error messages don't leak internal details
- [ ] Dependencies are up to date
- [ ] No new endpoints without auth checks

## When you're unsure

If a task involves security-sensitive code and you're unsure:
1. Stop and research — get security advice right
2. Use the `task` tool to delegate research to a subagent
3. Ask the user — "This involves security-sensitive code. Here's my approach. Any concerns?"
4. Less is more — if you don't need access to something, don't request it

## The trust equation

A single security breach can destroy user trust permanently. No feature is worth compromising user security. When in doubt, be conservative.