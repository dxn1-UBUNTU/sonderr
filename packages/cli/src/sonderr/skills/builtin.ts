// sonderr_change - new file
// Built-in skills that ship inside the CLI binary.
// Content is inlined at compile time via Bun's static import of .md files.
// Registered before all discovery phases so user skills with the same name override.

import SONDERR_CONFIG from "./sonderr-config.md" with { type: "text" }
import DESIGN from "./design.md" with { type: "text" }
import VERIFICATION from "./verification.md" with { type: "text" }
import PLANNING from "./planning.md" with { type: "text" }
import TESTING from "./testing.md" with { type: "text" }
import TESTING_ADVANCED from "./testing-advanced.md" with { type: "text" }
import DEBUGGING from "./debugging.md" with { type: "text" }
import CODE_REVIEW from "./code-review.md" with { type: "text" }
import SECURITY from "./security.md" with { type: "text" }
import DOCS from "./docs.md" with { type: "text" }
import LANG_TYPESCRIPT from "./lang-typescript.md" with { type: "text" }
import LANG_PYTHON from "./lang-python.md" with { type: "text" }
import LANG_GO from "./lang-go.md" with { type: "text" }
import PATTERNS from "./patterns.md" with { type: "text" }
import DATABASE_ADVANCED from "./database-advanced.md" with { type: "text" }
import CONCURRENCY from "./concurrency.md" with { type: "text" }
import API_DESIGN from "./api-design.md" with { type: "text" }
import OBSERVABILITY from "./observability.md" with { type: "text" }
import CACHING from "./caching.md" with { type: "text" }
import FUNCTIONAL from "./functional-programming.md" with { type: "text" }
import ARCHITECTURE from "./architecture.md" with { type: "text" }
import PERFORMANCE from "./performance.md" with { type: "text" }
import DEVOPS_ADVANCED from "./devops-advanced.md" with { type: "text" }
import AI_ML from "./ai-ml.md" with { type: "text" }
import ADVANCED_TYPESCRIPT from "./advanced-typescript.md" with { type: "text" }
import SECURITY_ADVANCED from "./security-advanced.md" with { type: "text" }
import SYSTEM_DESIGN from "./system-design.md" with { type: "text" }
import MOBILE from "./mobile-development.md" with { type: "text" }
import A11Y from "./accessibility.md" with { type: "text" }
import I18N from "./i18n-localization.md" with { type: "text" }
import CLOUD from "./cloud-patterns.md" with { type: "text" }
import DSA from "./data-structures-algorithms.md" with { type: "text" }

export interface BuiltinSkill {
  name: string
  description: string
  content: string
}

export const BUILTIN_SKILLS: BuiltinSkill[] = [
  {
    name: "sonderr-config",
    description:
      "Guide for Sonderr configuration: config paths, sonderr.json fields, commands, agents, skills, permissions, MCPs, providers, TUI settings, plus Agent Manager worktree setup/run scripts, workflows, and state. Use for Sonderr config questions, locating loaded config, changing settings, or Agent Manager questions about run/setup scripts, worktree setup/workflows, apply/merge/PR/conflicts, missing sessions/worktrees, and agent-manager.json recovery.",
    content: SONDERR_CONFIG,
  },
  {
    name: "design",
    description:
      "Comprehensive UI/UX design guide for building polished, accessible, production-quality interfaces. Use when building frontend components, pages, forms, or any user-facing feature. Covers layout, spacing, typography, color, interaction states, accessibility, responsive design, and quality checklists.",
    content: DESIGN,
  },
  {
    name: "verification",
    description:
      "Comprehensive pre-completion verification checklist and quality gates. Use before reporting ANY task as done. Catches bugs, edge cases, style violations, and missing requirements before the user ever sees your work.",
    content: VERIFICATION,
  },
  {
    name: "planning",
    description:
      "Strategic planning and task decomposition for complex work. Use when facing multi-step tasks, architectural decisions, or any work rated M2+ complexity. Teaches how to break down work, estimate complexity, and execute efficiently.",
    content: PLANNING,
  },
  {
    name: "testing",
    description:
      "Comprehensive testing guide for writing high-quality tests. Use when adding tests, fixing test failures, or verifying code correctness. Covers TDD, test patterns, mocking, edge cases, and test quality standards.",
    content: TESTING,
  },
  {
    name: "debugging",
    description:
      "Systematic debugging methodology for finding and fixing root causes. Use when investigating bugs, test failures, or unexpected behavior. Covers root cause analysis, binary search debugging, and common debugging patterns.",
    content: DEBUGGING,
  },
  {
    name: "code-review",
    description:
      "Self-review and code review methodology. Use before reporting any task as done, or when reviewing code. Catches bugs, style issues, missing edge cases, and improvement opportunities before the user sees your work.",
    content: CODE_REVIEW,
  },
  {
    name: "security",
    description:
      "Secure coding practices and common vulnerability prevention. Use when handling user input, authentication, data access, or any security-sensitive code. Covers OWASP top 10, injection prevention, and secure patterns.",
    content: SECURITY,
  },
  {
    name: "docs",
    description:
      "Technical documentation and document generation. Use when writing docs, README files, API documentation, architecture docs, or generating PDFs. Covers document structure, writing quality, and PDF generation.",
    content: DOCS,
  },
  {
    name: "lang-typescript",
    description:
      "Comprehensive TypeScript and JavaScript guide. Covers types, interfaces, generics, decorators, modules, async patterns, error handling, and advanced type manipulation. Use when writing or reviewing TypeScript/JavaScript code.",
    content: LANG_TYPESCRIPT,
  },
  {
    name: "lang-python",
    description:
      "Comprehensive Python guide. Covers types, dataclasses, async, decorators, context managers, generators, packaging, and idiomatic Python patterns. Use when writing or reviewing Python code.",
    content: LANG_PYTHON,
  },
  {
    name: "lang-go",
    description:
      "Comprehensive Go guide. Covers types, interfaces, goroutines, channels, error handling, testing, and idiomatic Go patterns. Use when writing or reviewing Go code.",
    content: LANG_GO,
  },
  {
    name: "patterns",
    description:
      "Design patterns and refactoring catalog. Covers creational, structural, behavioral patterns, and common refactorings with examples. Use when designing systems or improving existing code.",
    content: PATTERNS,
  },
  {
    name: "testing-advanced",
    description:
      "Advanced testing strategies and patterns. Covers property-based testing, fuzz testing, contract testing, snapshot testing, test doubles, and testing at scale. Use for complex testing scenarios.",
    content: TESTING_ADVANCED,
  },
  {
    name: "database-advanced",
    description:
      "Advanced database patterns and optimization. Covers indexing strategies, query optimization, migrations, connection pooling, replication, sharding, and both SQL and NoSQL patterns. Use for database-heavy applications.",
    content: DATABASE_ADVANCED,
  },
  {
    name: "concurrency",
    description:
      "Concurrency patterns and parallel execution. Covers async/await best practices, worker threads, race conditions, deadlocks, cancellation, and concurrent data structures. Use for multi-threaded or async-heavy code.",
    content: CONCURRENCY,
  },
  {
    name: "api-design",
    description:
      "API design patterns and best practices. Covers REST, GraphQL, gRPC, WebSocket, versioning, authentication, rate limiting, and error handling. Use for building any API.",
    content: API_DESIGN,
  },
  {
    name: "observability",
    description:
      "Observability, monitoring, and logging patterns. Covers structured logging, metrics, tracing, alerting, dashboards, and SLO/SLI/SLA. Use for production-grade system monitoring.",
    content: OBSERVABILITY,
  },
  {
    name: "caching",
    description:
      "Caching strategies and patterns. Covers cache invalidation, distributed caching, CDN, memoization, cache-aside, write-through, and read-through patterns. Use for performance optimization.",
    content: CACHING,
  },
  {
    name: "functional-programming",
    description:
      "Functional programming patterns. Covers immutability, higher-order functions, functors, monads, composition, and functional error handling. Use for clean, composable code.",
    content: FUNCTIONAL,
  },
  {
    name: "architecture",
    description:
      "Software architecture patterns. Covers microservices, event-driven architecture, CQRS, event sourcing, hexagonal architecture, monolith-first, and system decomposition. Use for designing complex systems.",
    content: ARCHITECTURE,
  },
  {
    name: "performance",
    description:
      "Performance optimization patterns. Covers profiling, benchmarking, memory optimization, lazy loading, code splitting, and performance budgets. Use for optimizing application performance.",
    content: PERFORMANCE,
  },
  {
    name: "devops-advanced",
    description:
      "Advanced DevOps and infrastructure patterns. Covers Kubernetes, service mesh, GitOps, infrastructure as code, monitoring, and deployment strategies. Use for complex infrastructure.",
    content: DEVOPS_ADVANCED,
  },
  {
    name: "ai-ml",
    description:
      "AI and machine learning integration patterns. Covers LLM integration, embeddings, RAG, fine-tuning, prompt engineering, and model evaluation. Use for AI-powered features.",
    content: AI_ML,
  },
  {
    name: "advanced-typescript",
    description:
      "Advanced TypeScript patterns and type-level programming. Covers conditional types, template literals, mapped types, branded types, and type-safe APIs. Use for complex type manipulation.",
    content: ADVANCED_TYPESCRIPT,
  },
  {
    name: "security-advanced",
    description:
      "Advanced security patterns and threat modeling. Covers zero-trust architecture, supply chain security, secrets management, and security audit patterns. Use for security-critical systems.",
    content: SECURITY_ADVANCED,
  },
  {
    name: "system-design",
    description:
      "System design and architecture interview patterns. Covers scalability, reliability, distributed systems, and tradeoff analysis. Use for designing large-scale systems.",
    content: SYSTEM_DESIGN,
  },
  {
    name: "mobile-development",
    description:
      "Mobile development patterns for React Native and Flutter. Covers navigation, state management, platform-specific code, performance, and native module integration. Use for building mobile applications.",
    content: MOBILE,
  },
  {
    name: "accessibility",
    description:
      "Accessibility (a11y) patterns and WCAG compliance. Covers semantic HTML, ARIA attributes, keyboard navigation, screen reader support, and testing. Use for building inclusive interfaces.",
    content: A11Y,
  },
  {
    name: "i18n-localization",
    description:
      "Internationalization and localization patterns. Covers translation management, pluralization, date/number formatting, RTL support, and locale detection. Use for multi-language applications.",
    content: I18N,
  },
  {
    name: "cloud-patterns",
    description:
      "Cloud architecture patterns for AWS, GCP, and Azure. Covers serverless, containers, IaC, CI/CD, monitoring, and cost optimization. Use for cloud-native applications.",
    content: CLOUD,
  },
  {
    name: "data-structures-algorithms",
    description:
      "Data structures and algorithms patterns. Covers arrays, trees, graphs, dynamic programming, sorting, and searching. Use for algorithm-heavy problems and interview prep.",
    content: DSA,
  },
]