---
name: testing
description: Comprehensive testing guide for writing high-quality tests. Use when adding tests, fixing test failures, or verifying code correctness. Covers TDD, test patterns, mocking, edge cases, and test quality standards.
---

# Testing Skill — Write Tests That Actually Catch Bugs

Tests are your safety net. Good tests catch bugs before users do. Bad tests give false confidence and waste time. This skill ensures you write tests that matter.

## The Testing Mindset

Tests exist to catch bugs. Every test you write should answer: "What bug would this catch?" If a test cannot fail for any conceivable bug, it is worthless.

## When to write tests

- **New features**: Write tests alongside implementation (TDD) or immediately after
- **Bug fixes**: Always add a regression test that reproduces the bug
- **Refactoring**: Ensure tests pass before and after — they verify behavior is preserved
- **Critical paths**: Auth, payments, data validation, anything that breaks the user if wrong
- **Edge cases**: Empty input, null, huge values, unicode, concurrent access

## TDD: Test-Driven Development

The most reliable way to write tested code:

1. **Red**: Write a failing test that captures the requirement
2. **Green**: Write the minimal code to make it pass
3. **Refactor**: Clean up the code while keeping tests green

Even if you don't do strict TDD, writing tests IMMEDIATELY after implementation (not days later) catches bugs while the context is fresh.

## What to test

### Test behavior, not implementation
- ✅ Test what the code does (inputs → outputs)
- ❌ Don't test how it does it (internal implementation details)
- Why: Implementation tests break when you refactor. Behavior tests survive.

### Priority order (highest to lowest)
1. **Core business logic** — the heart of the application
2. **Public APIs** — what other code depends on
3. **Error handling** — what happens when things go wrong
4. **Edge cases** — boundaries, empty input, extreme values
5. **Integration points** — where components meet

### What NOT to test
- Framework/library internals (don't test that `sort()` works)
- Trivial getters/setters with no logic
- Third-party code (that's the library author's job)
- Code that has no branches and no logic (just data transformation)

## Test structure

### The AAA pattern
Every test should follow this structure:
1. **Arrange**: Set up the test data and preconditions
2. **Act**: Execute the code under test
3. **Assert**: Verify the expected outcome

```typescript
test("calculateTotal adds tax to subtotal", () =>
  // Arrange
  const cart = new Cart()
  cart.addItem({ name: "Widget", price: 10 })

  // Act
  const total = cart.calculateTotal({ taxRate: 0.1 })

  // Assert
  expect(total).toBe(11)
})
```

### One assertion per concept
- A test can have multiple assertions, but they should all verify ONE concept
- If you need to verify two unrelated things, write two tests
- Test names should read like specifications: "does X when Y"

## Test naming

Good test names are specifications:
- ✅ `"throws ValidationError when email is missing"`
- ✅ `"returns empty array when no matches found"`
- ✅ `"retries 3 times on network failure before giving up"`
- ❌ `"test1"`, `"testCalculateTotal"`, `"works correctly"`

The test name should tell you:
1. What is being tested
2. Under what conditions
3. What the expected outcome is

## Test quality checklist

Before declaring a test complete, verify:

- [ ] **Fast**: Runs in milliseconds, not seconds
- [ ] **Isolated**: No dependencies on other tests or shared mutable state
- [ ] **Deterministic**: Same result every time (no flakiness)
- [ ] **Readable**: The intent is obvious without comments
- [ ] **Maintainable**: Easy to update when requirements change
- [ ] **Relevant**: Tests behavior that matters, not trivia

## Mocking and stubbing

### When to mock
- External services (APIs, databases, email)
- Time-dependent code (dates, timers)
- Random number generation
- File system operations
- Anything slow or non-deterministic

### When NOT to mock
- The code under test itself
- Pure functions (just test inputs/outputs)
- Value objects and data structures
- Code you don't own is OK to mock; code you own usually shouldn't be

### Mocking rules
- Mock at the boundary (HTTP client, database layer), not deep in the call stack
- Verify behavior, not implementation: "was called with X" not "was called then Y was called"
- Don't over-specify: if you mock too precisely, the test breaks on any change

## Edge cases to always consider

For every function, think about:
- **Empty input**: empty string, empty array, empty object
- **Null/undefined**: missing parameters, null fields
- **Boundaries**: 0, 1, -1, MAX_INT, empty vs first vs last
- **Type mismatches**: wrong types, unexpected shapes
- **Unicode**: non-ASCII characters, emoji, RTL text
- **Concurrency**: simultaneous access, race conditions
- **Time**: timezones, DST, leap years, clock skew
- **Scale**: large inputs, many items, deep nesting

## Integration tests vs unit tests

| | Unit Tests | Integration Tests |
|---|---|---|
| **Scope** | Single function/class | Multiple components together |
| **Speed** | Fast (ms) | Slower (seconds) |
| **Isolation** | Fully mocked | Real dependencies |
| **When** | Always | For critical paths |
| **Ratio** | ~80% of tests | ~20% of tests |

Write mostly unit tests. Use integration tests for the critical paths where components interact.

## Common test smells

1. **Testing implementation details**: Breaks on any refactor
2. **Shared mutable state**: Tests affect each other, causing flakiness
3. **Over-mocking**: Test passes but doesn't verify real behavior
4. **Under-mocking**: Test is slow, flaky, or has side effects
5. **Testing the framework**: Don't test that the language/runtime works
6. **Happy-path only**: No error cases or edge cases
7. **Copy-paste tests**: Duplicated setup/assertion code
8. **Unclear assertions**: `expect(x).toBeTruthy()` — what does this even check?

## Regression tests

When fixing a bug:
1. Write a test that reproduces the bug (it should FAIL)
2. Fix the bug
3. Verify the test now PASSES
4. The test now prevents the bug from returning

Every bug fix without a regression test is a bug that will return.

## Test coverage

- Aim for high coverage of business logic, not 100% of everything
- 100% coverage with bad tests is worse than 80% coverage with good tests
- Focus on branch coverage (every if/else path) not just line coverage
- Untestable code is often a sign of bad design — refactor to make it testable

## Framework-specific guidance

When writing tests, follow the project's existing test framework:
- Check `package.json` for the test runner (jest, vitest, bun test, pytest, etc.)
- Match the project's test style (describe/test vs test, assertion library, mocking patterns)
- Look at existing tests for conventions (file naming, setup patterns, cleanup)