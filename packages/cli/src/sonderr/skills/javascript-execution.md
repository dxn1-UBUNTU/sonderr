# JavaScript Execution

Guide for executing JavaScript/TypeScript code within Sonderr for data transformation, validation, prototyping, and quick computation.

## When to use the `javascript` tool

Use the `javascript` tool when you need to run JavaScript/TypeScript logic against real project data:

- **Data transformation**: Filter, map, reduce JSON/config/test data
- **Validation**: Verify that a data shape matches what your code expects
- **Aggregation**: Compute summaries, counts, or statistics over real files
- **Prototyping**: Test an algorithm before writing it into the codebase
- **Computation**: Anything where manual calculation would be error-prone

## When NOT to use it

- **Side effects on the codebase**: Use `bash`/`edit`/`write` instead
- **Long-running processes**: Use `background_process`
- **Web requests**: Use `websearch`/`webfetch`/`websearch_js`
- **Complex orchestration**: Use `execute` (code mode) for multi-step workflows with MCP tools

## Guidelines

### Keep scripts short and focused

One transformation or validation per call. If the script is getting long, break it into multiple calls or switch to code mode.

### Read data first

Use `read`/`grep`/`glob` to inspect the data, then run the script. Don't guess at data shapes.

### Print results clearly

```javascript
// For structured data
console.table(results)

// For summaries
console.log(`Found ${count} matches`)

// For errors
console.error("Validation failed:", errors)
```

### Handle errors explicitly

```javascript
try {
  const result = riskyOperation()
  console.log("Success:", result)
} catch (error) {
  console.error("Failed:", error.message)
}
```

### Common patterns

#### Filter and transform JSON

```javascript
const fs = require("fs")
const data = JSON.parse(fs.readFileSync("package.json", "utf8"))
const deps = Object.entries(data.dependencies || {}).filter(([name]) => name.startsWith("@sonderr/"))
console.log("Sonderr deps:", deps.map(([name, version]) => `${name}@${version}`).join("\n"))
```

#### Validate data shape

```javascript
const fs = require("fs")
const users = JSON.parse(fs.readFileSync("users.json", "utf8"))
const invalid = users.filter((u) => !u.id || !u.email || !u.email.includes("@"))
if (invalid.length) {
  console.error(`Invalid users: ${invalid.length}`)
  console.table(invalid.map((u) => ({ id: u.id, email: u.email })))
} else {
  console.log("All users valid")
}
```

#### Compute statistics

```javascript
const fs = require("fs")
const logs = fs.readFileSync("app.log", "utf8").split("\n")
const errors = logs.filter((l) => l.includes("ERROR")).length
const warnings = logs.filter((l) => l.includes("WARN")).length
console.log(`Errors: ${errors}, Warnings: ${warnings}`)
```

## Integration with code mode

For multi-step workflows that combine data analysis with MCP tool calls, use `execute` (code mode) instead. Code mode provides:
- Access to connected MCP tools
- Structured error handling
- Progressive disclosure of tool schemas
- Sandboxed execution with limits

## Integration with hive

In hive sessions, use `javascript` for:
- Validating data from other agents
- Computing statistics on test results
- Transforming research findings
- Generating test data

Publish results via `hive_send` with the `[FINDING]` or `[RESULTS]` prefix.
