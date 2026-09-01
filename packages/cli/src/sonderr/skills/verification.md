---
name: verification
description: Comprehensive pre-completion verification checklist and quality gates. Use before reporting ANY task as done. Catches bugs, edge cases, style violations, and missing requirements before the user ever sees your work.
---

# Verification Skill — Never Report Done Until You Are

This skill is your final quality gate. Before you ever type "done" or "complete," you MUST run through the relevant checklist here. Most bugs users find should have been caught by you first — this skill makes sure they are.

## The Iron Rule

**Never report a task as complete without verifying it.** "Looks right" is not verification. "I wrote it" is not verification. Verification means you have evidence — tool output, test results, typecheck passing — that the code actually works.

## Universal Checklist (every task)

Run this before reporting ANY task complete:

### Correctness
- [ ] Does the code do what the user asked — the whole request, not a subset?
- [ ] Does it handle the happy path correctly?
- [ ] Does it handle error paths (network failure, invalid input, permissions)?
- [ ] Are there any off-by-one errors, null/undefined issues, or type mismatches?
- [ ] Does it work with the existing codebase (no naming conflicts, no broken imports)?

### Scope
- [ ] Did I stay within the size/scope constraints the user gave?
- [ ] Is the diff minimal — no unrelated changes, no "while I was here" refactors?
- [ ] Did I avoid adding unrequested features, flags, or abstractions?

### Style
- [ ] Does the code match the project's existing style (naming, formatting, patterns)?
- [ ] Are there any console.log, debugger, or TODO comments I left in?
- [ ] Are variable/function names clear and consistent with the codebase?

### Verification
- [ ] Did I actually run the project's checks (typecheck, lint, tests)?
- [ ] Did the checks pass — not just run, but PASS?
- [ ] If I couldn't run checks, did I explicitly say so in my report?

### Report
- [ ] Are all claims in my report true (no invented test results)?
- [ ] Did I cite file:line references for changes?
- [ ] Did I explain what I verified and how?

## Task-Specific Checklists

### Bug Fix Verification
1. **Reproduce first**: Did I confirm the bug exists before fixing it?
2. **Root cause**: Did I fix the root cause, not just a symptom?
3. **Regression test**: Did I add or identify a test that would catch this bug if it regressed?
4. **No collateral**: Did I verify existing tests still pass?
5. **Edge cases**: Did I check adjacent code for the same bug pattern?

### Feature Implementation Verification
1. **Requirements**: Does it meet ALL the user's stated requirements?
2. **States**: Are all UI states handled (loading, empty, error, success, disabled)?
3. **Accessibility**: Is it keyboard navigable? Screen reader friendly? Proper contrast?
4. **Responsive**: Does it work at 320px, 768px, and 1024px+?
5. **Integration**: Does it work with the existing system (API contracts, data shapes)?
6. **Error handling**: What happens when things fail? Is the user informed?

### Refactoring Verification
1. **Behavior preserved**: Did I verify the refactored code behaves identically?
2. **Tests pass**: Did ALL existing tests pass after refactoring?
3. **No API changes**: Did I change any public API signatures without being asked?
4. **Diff review**: Is the diff clean and reviewable — no mixed concerns?

### New File Verification
1. **Imports**: Do all imports resolve correctly?
2. **Types**: Are all types satisfied (no `any`, no missing properties)?
3. **Naming**: Does the filename match the project's conventions?
4. **Location**: Is the file in the right directory?

### Configuration Change Verification
1. **App starts**: Did I verify the app still starts with the new config?
2. **Validation**: Does the config pass validation (if any)?
3. **Documentation**: Did I document new config options?
4. **Migration**: Do existing configs still work (backward compatibility)?

### Dependency Change Verification
1. **Install succeeded**: Did I verify the install completed without errors?
2. **Lockfile updated**: Is the lockfile consistent?
3. **No breakage**: Did existing functionality still work?
4. **Size impact**: Did I check the bundle size impact (if frontend)?

## Self-Review Process

Before reporting done, perform this self-review:

### Read Your Diff
Read your entire diff as if you were a reviewer seeing it for the first time:
- Does it make sense as a cohesive change?
- Are there any surprises or unrelated changes?
- Would you approve this PR?

### Walk Through the Code
Mentally execute the code path:
- What happens with empty input?
- What happens with very large input?
- What happens on network failure?
- What happens with unexpected types?

### Check Adjacent Code
- Are there callers that need updating?
- Are there tests that need updating?
- Are there docs that need updating?

### Test the Happy Path
If you haven't actually run the code, at minimum trace through it:
- What function is called first?
- What does it return?
- How does the result flow through the system?
- What does the user see?

## Common Mistakes This Skill Prevents

1. **False "tested" claims**: Saying "tests pass" when you didn't run them. Fix: actually run them.
2. **Scope creep**: Adding unrequested features because they seemed good. Fix: stick to the request.
3. **Broken imports**: Adding an import for something that doesn't exist. Fix: verify imports resolve.
4. **Off-by-one**: Loops that iterate one too many or too few times. Fix: trace through with small inputs.
5. **Missing edge cases**: Only handling the happy path. Fix: explicitly consider error cases.
6. **Style mismatches**: Using a different style than the codebase. Fix: read surrounding code first.
7. **Left behind artifacts**: console.log, debugger, TODO comments. Fix: grep your diff before reporting.

## When You Find a Problem

If your verification catches something wrong:
1. Fix it immediately — don't report it to the user first.
2. Re-verify after fixing.
3. Only report done when verification passes.

If you can't fix it:
1. Report exactly what you found and where.
2. Explain what you tried.
3. Suggest what you need to proceed.

## The User's Trust

The user is trusting you with their codebase. Every time you report something done that turns into a bug, that trust erodes. Every time you report something done and it just works, that trust grows. Verification is how you earn and keep that trust.