---
name: code-review
description: Self-review and code review methodology. Use before reporting any task as done, or when reviewing code. Catches bugs, style issues, missing edge cases, and improvement opportunities before the user sees your work.
---

# Code Review Skill — Catch Your Own Mistakes

Every piece of code should be reviewed before it reaches the user. The best reviewer is you, one hour after writing it — you'll spot things you were blind to when writing. This skill ensures you review your own work thoroughly.

## The Review Mindset

Your goal is not to confirm your code is good. Your goal is to PROVE your code is bad. Approach your own code with skepticism. If you can't find at least one thing to improve, you're not looking hard enough.

## Self-review checklist

Run this checklist on every diff before reporting done:

### Correctness
- [ ] Does the code do what was asked — the whole request, not a subset?
- [ ] Are there any off-by-one errors, null/undefined issues, or type mismatches?
- [ ] Does it handle the happy path correctly?
- [ ] Does it handle error paths (network failure, invalid input, permissions)?
- [ ] Are there any race conditions or concurrency issues?
- [ ] Could this break for empty input, huge input, or unexpected types?

### Scope
- [ ] Did I stay within the size/scope constraints the user gave?
- [ ] Is the diff minimal — no unrelated changes, no "while I was here" refactors?
- [ ] Did I avoid adding unrequested features, flags, or abstractions?

### Style
- [ ] Does the code match the project's existing style (naming, formatting, patterns)?
- [ ] Are there any console.log, debugger, or TODO comments I left in?
- [ ] Are variable/function names clear and consistent with the codebase?
- [ ] Is the diff reviewable in seconds — no massive reformatting?

### Security
- [ ] No hardcoded secrets, tokens, or keys
- [ ] Inputs validated at boundaries (especially user input reaching shells, SQL, HTML, file paths)
- [ ] No injection vulnerabilities (SQL, command, XSS)
- [ ] Existing security checks not weakened to make a task easier

### Performance
- [ ] No unnecessary work in loops
- [ ] No N+1 queries or redundant API calls
- [ ] Large files handled in chunks, not loaded entirely into memory

### Tests
- [ ] Are there tests for the new behavior?
- [ ] Do existing tests still pass?
- [ ] Are edge cases covered?

## How to review your own diff

### Step 1: Read the entire diff as if you were a reviewer
- Does it make sense as a cohesive change?
- Are there any surprises or unrelated changes?
- Would you approve this PR?

### Step 2: Walk through the code paths
- What happens with empty input?
- What happens with very large input?
- What happens on network failure?
- What happens with unexpected types?

### Step 3: Check adjacent code
- Are there callers that need updating?
- Are there tests that need updating?
- Are there docs that need updating?

### Step 4: Verify claims
- If you said "tests pass," did you actually run them?
- If you said "typecheck passes," did you actually run it?
- If you said "no breakage," did you check?

## Common bugs this catches

1. **Stale references**: Renaming a function but missing a call site
2. **Missing error handling**: Happy path works, error path crashes
3. **Off-by-one**: Loops, array access, boundary conditions
4. **Type mismatches**: Wrong type passed, unexpected null
5. **Leaked secrets**: Accidentally committing API keys
6. **Unreachable code**: After a return or throw
7. **Infinite loops**: Missing increment, wrong condition
8. **Resource leaks**: Unclosed file handles, database connections

## Review patterns

### The "what if" game
For every line of code, ask "what if this is null?" "what if this is empty?" "what if this fails?"

### The "stranger" test
If a stranger saw this code for the first time, would they understand it? If not, it needs a comment or clearer naming.

### The "delete" test
For each line, ask "what breaks if I delete this?" If nothing breaks, the line shouldn't be there.

### The "invert" test
For every condition, ask "what if this is the opposite?" Does the code handle it?

## When reviewing others' code

If asked to review someone else's code:
1. Understand the intent first — what is this code supposed to do?
2. Check correctness before style — a beautifully formatted bug is still a bug
3. Be specific: "This loop will fail when input is empty" not "this looks wrong"
4. Be kind: critique the code, not the author
5. Suggest fixes, don't just point out problems

## The trust equation

Every time you report something done that turns into a bug, the user's trust erodes. Every time you report something done and it just works, that trust grows. Self-review is how you earn and keep that trust.