---
name: debugging
description: Systematic debugging methodology for finding and fixing root causes. Use when investigating bugs, test failures, or unexpected behavior. Covers root cause analysis, binary search debugging, and common debugging patterns.
---

# Debugging Skill — Find Root Causes, Not Symptoms

Debugging is a science, not guesswork. Random changes and prayer do not fix bugs — systematic investigation does. This skill ensures you find and fix the actual root cause, not just the symptom.

## The Debugging Mindset

Every bug has a root cause. Your job is to find it, not to mask it. Fixing a symptom while ignoring the root cause means the bug will return in a different form.

## The Scientific Method of Debugging

1. **Observe**: What exactly is happening? Gather evidence.
2. **Hypothesize**: What could cause this? Form one clear hypothesis.
3. **Test**: Design an experiment to prove or disprove the hypothesis.
4. **Conclude**: Did the evidence support the hypothesis? If yes, fix it. If no, go back to step 2.
5. **Verify**: After fixing, confirm the bug is gone and nothing else broke.

## Step 1: Reproduce

A bug you cannot reproduce, you cannot fix.

- Find the minimal, reliable reproduction steps
- If it's intermittent, find the pattern (timing, data, environment)
- If you cannot reproduce locally, get logs, stack traces, and exact error messages
- Document the exact steps so you can verify the fix

## Step 2: Read the error

Half of all bugs are solved by reading the actual error message.

- Read the COMPLETE error, not just the first line
- Stack traces point to WHERE, not WHY — read the code at those line numbers
- The real cause is often several layers below the error
- Search for the exact error message — framework bugs and version quirks are documented

## Step 3: Form one hypothesis at a time

Shotgun debugging (five random changes, re-run, pray) hides the cause and adds new bugs.

- Form ONE clear hypothesis: "I think X causes Y because Z"
- Change ONE variable per attempt
- If the hypothesis is wrong, you learned something — update your model
- If the hypothesis is right, you found the cause

## Step 4: Gather evidence

Use tools to test your hypothesis:
- Read logs and add temporary logging (remove before finishing)
- Check recent changes (`git log -p` on suspect files, `git diff`)
- Check environment assumptions (versions, env vars, paths)
- Print intermediate values to trace the data flow

## Step 5: Fix the root cause

Once you know the root cause:
- Fix the cause, not the symptom
- The fix should be minimal and targeted
- Consider: "Could this same bug exist elsewhere?" — check adjacent code
- Add a regression test that reproduces the bug

## Debugging strategies

### Binary search debugging

When a bug appeared recently but you don't know what caused it:
1. Find a commit where the bug didn't exist
2. Find a commit where the bug does exist
3. Test the commit in the middle
4. Narrow down to the exact commit that introduced the bug
5. Examine that commit's diff to find the cause

### Differential debugging

When something works in one environment but not another:
1. List all differences: versions, config, environment variables, data
2. Test each difference systematically
3. Isolate the specific difference that causes the behavior

### Cause elimination debugging

When you have multiple potential causes:
1. List all possible causes
2. For each, ask: "If this were the cause, what would I observe?"
3. Check each observation to eliminate causes
4. The remaining cause is your target

### Assumption chaining

When "this should work but doesn't":
1. Write down every assumption you are making about the system
2. Verify each assumption with a tool (don't trust your mental model)
3. The bug is usually a violated assumption you didn't realize you were making

## Common bug categories

### Off-by-one errors
- Loops that iterate one too many or too few times
- Array index calculations
- Boundary conditions (empty, first, last)

### Null/undefined errors
- Missing optional chaining
- Uninitialized variables
- Async data not yet loaded

### Type errors
- Wrong type passed to a function
- Implicit type coercion surprises
- API returning unexpected shapes

### Race conditions
- Async operations completing in unexpected order
- Shared mutable state
- Missing awaits

### Configuration errors
- Wrong environment variables
- Missing config files
- Stale cached config

### Dependency errors
- Version mismatches
- Missing peer dependencies
- Breaking changes in updates

## When you are stuck — the escalation ladder

Work down the list in order; each step is cheaper than thrashing:

1. Re-read the exact error and the exact code it points to (most "stuck" states are misread errors)
2. Check your assumptions with tools: run the failing step manually, print the intermediate value, verify the version
3. Search the codebase for how similar problems were solved before (`grep` for the error string, sibling implementations, tests of the same subsystem)
4. Search the web for the exact error message — framework bugs and version quirks are usually already documented
5. Delegate a fresh-eyes investigation to a `task` subagent with everything you have ruled out; context-free reading sometimes sees what you stopped seeing
6. Stop and report: what you tried, what you ruled out, what you need from the user. Ten disciplined attempts beat thirty random ones.

## After fixing

1. **Verify the fix**: Run the original reproduction — does it pass now?
2. **Check for collateral**: Did your fix break anything else? Run related tests.
3. **Add a regression test**: A test that reproduces the bug prevents it from returning.
4. **Check adjacent code**: Could the same bug exist nearby? Search for similar patterns.
5. **Document if non-obvious**: If the bug was subtle, add a brief comment explaining why the fix is necessary.

## What NOT to do

- ❌ Change multiple things at once and re-run (you won't know what fixed it)
- ❌ Delete or neuter a test to go green (the test is right, your code is wrong)
- ❌ Add a try/catch to suppress the error (you masked it, not fixed it)
- ❌ Blame the framework/library without evidence (it's almost always your code)
- ❌ Keep the temporary logging you added for debugging
- ❌ Report "fixed" without verifying the fix against the original reproduction