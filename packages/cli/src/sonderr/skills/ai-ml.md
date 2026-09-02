---
name: ai-ml
description: AI and machine learning integration patterns. Covers LLM integration, embeddings, RAG, fine-tuning, prompt engineering, and model evaluation. Use for AI-powered features.
---

# AI/ML Integration Mastery

## LLM Integration Patterns

```typescript
// Structured output with validation
interface LLMClientConfig {
  model: string
  temperature: number
  maxTokens: number
  retryAttempts: number
}

class LLMClient {
  private config: LLMClientConfig

  constructor(config: Partial<LLMClientConfig> = {}) {
    this.config = {
      model: "claude-sonnet-4-20250514",
      temperature: 0,
      maxTokens: 4096,
      retryAttempts: 3,
      ...config,
    }
  }

  async generate<T>(
    systemPrompt: string,
    userMessage: string,
    schema: z.ZodType<T>
  ): Promise<T> {
    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      try {
        const response = await this.callAPI(systemPrompt, userMessage, schema)
        return schema.parse(response)
      } catch (error) {
        if (attempt === this.config.retryAttempts - 1) throw error
        await sleep(1000 * Math.pow(2, attempt))
      }
    }
    throw new Error("Max retries exceeded")
  }

  async stream(
    systemPrompt: string,
    userMessage: string,
    onChunk: (chunk: string) => void
  ): Promise<string> {
    let fullResponse = ""
    const stream = await this.callAPIStream(systemPrompt, userMessage)

    for await (const chunk of stream) {
      fullResponse += chunk
      onChunk(chunk)
    }

    return fullResponse
  }
}
```

## Prompt Engineering Patterns

```typescript
// Few-shot prompting
const SYSTEM_PROMPT = `You are a code review assistant. Review the following code and identify issues.

Categories:
- SECURITY: Security vulnerabilities
- PERFORMANCE: Performance bottlenecks
- BUG: Potential bugs or incorrect logic
- STYLE: Style or convention violations
- MAINTAINABILITY: Code that's hard to maintain

Format issues as JSON:
[
  {
    "category": "SECURITY",
    "severity": "high",
    "line": 42,
    "message": "SQL injection vulnerability",
    "suggestion": "Use parameterized queries"
  }
]

Review the following code:
\`\`\`
{code}
\`\`\`
`

// Chain of thought prompting
const COT_PROMPT = `Solve this step-by-step. For each step, explain your reasoning.

Problem: {problem}

Step 1: Understand the requirements
Step 2: Identify the key components
Step 3: Design the solution
Step 4: Implement step by step
Step 5: Verify correctness

Provide your answer in this format:
\`\`\`json
{
  "reasoning": ["step 1...", "step 2...", ...],
  "solution": "...",
  "confidence": 0.95
}
\`\`\`
`

// Self-consistency prompting
async function selfConsistentAnswer(
  question: string,
  n: number = 5
): Promise<string> {
  const answers = await Promise.all(
    Array.from({ length: n }, () =>
      llm.generate(question, { temperature: 0.8 })
    )
  )
  // Return most common answer
  return mode(answers)
}
```

## Retrieval-Augmented Generation (RAG)

```typescript
// Vector store interface
interface VectorStore {
  add(documents: Document[]): Promise<void>
  search(query: string, k: number): Promise<SearchResult[]>
}

interface Document {
  id: string
  content: string
  embedding: number[]
  metadata: Record<string, unknown>
}

interface SearchResult {
  document: Document
  score: number
}

// Embedding generation
class EmbeddingService {
  constructor(private model: string = "text-embedding-3-small") {}

  async embed(text: string): Promise<number[]> {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: this.model, input: text }),
    })
    const data = await response.json()
    return data.data[0].embedding
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const batchSize = 100
    const results: number[][] = []
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize)
      const embeddings = await Promise.all(batch.map((t) => this.embed(t)))
      results.push(...embeddings)
    }
    return results
  }
}

// RAG pipeline
class RAGPipeline {
  constructor(
    private vectorStore: VectorStore,
    private embeddingService: EmbeddingService,
    private llm: LLMClient
  ) {}

  async index(documents: IngestedDocument[]): Promise<void> {
    const embeddings = await this.embeddingService.embedBatch(
      documents.map((d) => d.content)
    )
    const docs: Document[] = documents.map((doc, i) => ({
      id: doc.id,
      content: doc.content,
      embedding: embeddings[i],
      metadata: doc.metadata,
    }))
    await this.vectorStore.add(docs)
  }

  async query(question: string, options: { k?: number; rerank?: boolean } = {}): Promise<string> {
    const k = options.k ?? 5
    const questionEmbedding = await this.embeddingService.embed(question)
    const results = await this.vectorStore.search(question, k)

    if (options.rerank) {
      const reranked = await this.rerank(question, results)
      results.splice(0, results.length, ...reranked)
    }

    const context = results
      .slice(0, 3)
      .map((r) => r.document.content)
      .join("\n\n---\n\n")

    return this.llm.generate(
      `Answer based on the context below. If the context doesn't contain the answer, say "I don't know".\n\nContext:\n${context}`,
      question
    )
  }

  private async rerank(query: string, results: SearchResult[]): Promise<SearchResult[]> {
    // Cross-encoder reranking (more accurate but slower)
    const scores = await Promise.all(
      results.map(async (r) => ({
        ...r,
        score: await this.crossEncoderScore(query, r.document.content),
      }))
    )
    return scores.sort((a, b) => b.score - a.score)
  }
}
```

## Semantic Search

```typescript
// BM25 + Vector hybrid search
class HybridSearcher {
  constructor(
    private vectorStore: VectorStore,
    private bm25: BM25Index
  ) {}

  async search(query: string, k: number = 10): Promise<SearchResult[]> {
    const [vectorResults, bm25Results] = await Promise.all([
      this.vectorStore.search(query, k * 2),
      this.bm25.search(query, k * 2),
    ])

    // Reciprocal rank fusion
    const fused = this.reciprocalRankFusion(vectorResults, bm25Results, k)
    return fused
  }

  private reciprocalRankFusion(
    list1: SearchResult[],
    list2: SearchResult[],
    k: number,
    constant: number = 60
  ): SearchResult[] {
    const scores = new Map<string, { result: SearchResult; score: number }>>

    for (let i = 0; i < list1.length; i++) {
      const id = list1[i].document.id
      const score = 1 / (constant + i + 1)
      const existing = scores.get(id)
      if (existing) {
        existing.score += score
      } else {
        scores.set(id, { result: list1[i], score })
      }
    }

    for (let i = 0; i < list2.length; i++) {
      const id = list2[i].document.id
      const score = 1 / (constant + i + 1)
      const existing = scores.get(id)
      if (existing) {
        existing.score += score
      } else {
        scores.set(id, { result: list2[i], score })
      }
    }

    return [...scores.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, k)
      .map((s) => s.result)
  }
}
```

## Function Calling with LLMs

```typescript
// Tool definition for function calling
interface ToolDefinition {
  name: string
  description: string
  parameters: JSONSchema
  handler: (args: any) => Promise<any>
}

class Agent {
  constructor(
    private llm: LLMClient,
    private tools: Map<string, ToolDefinition>,
    private systemPrompt: string
  ) {}

  async run(userMessage: string, maxSteps: number = 10): Promise<string> {
    const messages: Message[] = [
      { role: "system", content: this.systemPrompt },
      { role: "user", content: userMessage },
    ]

    for (let step = 0; step < maxSteps; step++) {
      const response = await this.llm.generateWithTools(
        messages,
        [...this.tools.values()].map((t) => ({
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        }))
      )

      messages.push({ role: "assistant", content: response.content ?? "", toolCalls: response.toolCalls })

      if (!response.toolCalls || response.toolCalls.length === 0) {
        return response.content!
      }

      for (const call of response.toolCalls) {
        const tool = this.tools.get(call.name)
        if (!tool) {
          messages.push({
            role: "tool",
            toolCallId: call.id,
            content: `Error: Unknown tool "${call.name}"`,
          })
          continue
        }

        try {
          const result = await tool.handler(call.arguments)
          messages.push({
            role: "tool",
            toolCallId: call.id,
            content: JSON.stringify(result),
          })
        } catch (error) {
          messages.push({
            role: "tool",
            toolCallId: call.id,
            content: `Error: ${(error as Error).message}`,
          })
        }
      }
    }

    throw new Error("Max steps exceeded without final response")
  }
}
```

## Model Evaluation

```typescript
// Evaluation framework
interface TestCase {
  id: string
  input: string
  expectedOutput: string
  metadata?: Record<string, unknown>
}

interface EvaluationResult {
  testCase: TestCase
  actualOutput: string
  score: number
  metrics: Record<string, number>
}

class Evaluator {
  constructor(private metrics: Metric[]) {}

  async evaluate(
    testCases: TestCase[],
    generateOutput: (input: string) => Promise<string>
  ): Promise<EvaluationResult[]> {
    const results: EvaluationResult[] = []

    for (const testCase of testCases) {
      const actualOutput = await generateOutput(testCase.input)
      const metrics: Record<string, number> = {}

      for (const metric of this.metrics) {
        metrics[metric.name] = await metric.compute(
          testCase.expectedOutput,
          actualOutput
        )
      }

      results.push({
        testCase,
        actualOutput,
        score: Object.values(metrics).reduce((a, b) => a + b, 0) / this.metrics.length,
        metrics,
      })
    }

    return results
  }
}

// Common metrics
class ExactMatch implements Metric {
  name = "exact_match"
  compute(expected: string, actual: string): number {
    return expected.trim() === actual.trim() ? 1 : 0
  }
}

class BLEU implements Metric {
  name = "bleu"
  compute(reference: string, candidate: string): number {
    const refTokens = reference.split(/\s+/)
    const candTokens = candidate.split(/\s+/)
    // Simplified BLEU-1
    const matches = candTokens.filter((t) => refTokens.includes(t)).length
    return matches / Math.max(candTokens.length, 1)
  }
}

class SemanticSimilarity implements Metric {
  name = "semantic_similarity"
  constructor(private embeddingService: EmbeddingService) {}

  async compute(expected: string, actual: string): Promise<number> {
    const [emb1, emb2] = await Promise.all([
      this.embeddingService.embed(expected),
      this.embeddingService.embed(actual),
    ])
    return cosineSimilarity(emb1, emb2)
  }
}
```

## Fine-tuning Patterns

```typescript
// Dataset preparation
interface TrainingExample {
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>
}

function prepareTrainingData(examples: RawExample[]): TrainingExample[] {
  return examples.map((ex) => ({
    messages: [
      { role: "system", content: ex.system },
      { role: "user", content: ex.input },
      { role: "assistant", content: ex.output },
    ],
  }))
}

// Validation split
function trainTestSplit<T>(data: T[], testRatio: number = 0.2): { train: T[]; test: T[] } {
  const shuffled = [...data].sort(() => Math.random() - 0.5)
  const splitIndex = Math.floor(data.length * (1 - testRatio))
  return { train: shuffled.slice(0, splitIndex), test: shuffled.slice(splitIndex) }
}

// Fine-tuning job (OpenAI)
async function createFineTuningJob(trainingFileId: string): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/fine_tuning/jobs", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: "gpt-4o-mini-2024-07-18",
      training_file: trainingFileId,
      hyperparameters: { n_epochs: 3, batch_size: 1, learning_rate_multiplier: 2 },
    }),
  })
  const data = await response.json()
  return data.id
}
```