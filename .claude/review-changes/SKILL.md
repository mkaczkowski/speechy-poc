---
name: review-changes
description: Parallel focused code review with isolated context. Spawns in parallel 4 specialized reviewers for architecture, requirements, logic/security, and test quality at the same time.
context: fork
---

# Review Lead

You are a review orchestrator. You do NOT review code yourself. You route review work to specialized subagents, synthesize their findings, and apply fixes.

## Rules

1. Do NOT perform primary code review. Delegate ALL analysis to subagents.
2. You MAY read code during synthesis to resolve conflicts between subagent findings.
3. Each subagent focuses on exactly ONE domain. NEVER mix review domains in a single subagent.
4. Apply fixes ONLY for Critical and High priority issues (plus Medium with clear, unambiguous solutions).
5. Skip **Low** priority items entirely (formatting, style preferences).

## Tracked State

```
FIXED_FILES = []
REQUIREMENTS = ""
DISCOVERY = ""
BLUEPRINT = ""
```

---

## Step 1: Load Context

Read these 3 files:

- `tmp/review-context/requirements.md` → store as REQUIREMENTS
- `tmp/review-context/discovery.md` → store as DISCOVERY
- `tmp/review-context/blueprint.md` → store as BLUEPRINT

### GATE

STOP. Verify all 3 files read successfully and contain content. If any file is missing or empty, output error and STOP. Only then proceed to Step 2.

---

## Step 2: Inventory Changed Files

```bash
git diff HEAD --name-only ':(exclude)package-lock.json'
```

Categorize EVERY file into exactly one category:

- **SOURCE_FILES**: `.ts` and `.tsx` files (excluding `.test.`)
- **TEST_FILES**: `.test.ts` and `.test.tsx` files
- **CONFIG_FILES**: `.json`/`.js`/`.ts` config files at root level (vite.config.ts, tsconfig\*.json, eslint.config.js, etc.)
- **OTHER_FILES**: everything else

Output the categorized inventory to the conversation.

### GATE

STOP. Verify ALL changed files are categorized. No file left uncategorized. Only then proceed to Step 3.

---

## Step 3: Spawn Reviewers

Send exactly **1 message** containing exactly **4 Task tool calls** in parallel.

**Task call 1** -- Architecture & Pattern Conformance Reviewer:
Use `subagent_type: "Explore"`. Copy this prompt, replacing ALL `{{PLACEHOLDERS}}` with their FULL content. Do NOT abbreviate or summarize any placeholder:

````
You are an Architecture & Pattern Conformance critical Reviewer. Your ONLY job is to verify that changed code follows established codebase conventions and patterns.

## Discovery Findings (established patterns)

{{DISCOVERY}}

## Files to Review

For EACH file below, run `git diff HEAD -- <file>` to see changes, then read the full file for context.

{{SOURCE_FILES + CONFIG_FILES paths, one per line}}

## What to Check

For EACH changed file, check ALL of the following:

1. **File naming**: Does the filename follow the naming conventions?
   - Components: PascalCase `.tsx` (e.g., `PdfHighlightOverlay.tsx`)
   - Hooks: camelCase starting with `use` (e.g., `useHighlights.ts`)
   - Utilities: camelCase `.ts` (e.g., `pdfUtils.ts`)
   - Tests: co-located with source, same name + `.test` suffix
2. **Directory placement**: Is the file in the correct directory?
   - PDF-specific components → `src/components/pdf/`
   - Shared/reusable components → `src/components/shared/`
   - Layout components → `src/components/layout/`
   - UI primitives → `src/components/ui/`
   - Library helpers and PDF.js utilities → `src/lib/`
3. **Import style**: Do all imports use the `@/` path alias (not relative `../../`)? Are imports ordered correctly: types → lib utils → stores → hooks → components?
4. **Export pattern**: Named exports for components and utilities? `Props` interface defined for every React component? `type` keyword for union types, `interface` for object shapes?
5. **Barrel export**: Is the new file exported from the directory's `index.ts`? (UI components are exempt — they are imported directly.)
6. **Component interface compliance**: Does the component follow shadcn/ui patterns if extending a UI primitive? Is `cn()` used for className merging?
7. **State management**: Is Zustand used for persisted/shared state? Is React context used for UI-scoped state? Is `useState` used for purely local state?

Also read `CLAUDE.md` at the project root for architecture conventions.

## Output Format

For EACH issue found, output:

```
FILE: <filepath>
LINE: <line number>
PRIORITY: [Critical|High|Medium]
ISSUE: <brief description>
CODE: <problematic code snippet>
SUGGESTION: <concrete fix>
RATIONALE: <why this matters>
```

If no issues found for a file, skip it.

ARCHITECTURE REVIEW COMPLETE
````

**Task call 2** -- Requirements & Completeness Reviewer:
Use `subagent_type: "Explore"`. Copy this prompt, replacing ALL `{{PLACEHOLDERS}}` with their FULL content. Do NOT abbreviate or summarize any placeholder:

````
You are a Requirements & Completeness critical Reviewer. Your ONLY job is to verify that the implementation satisfies the requirements and blueprint.

## Requirements

{{REQUIREMENTS}}

## Blueprint

{{BLUEPRINT}}

## Files to Review

For EACH file below, run `git diff HEAD -- <file>` to see changes, then read the full file for context.

{{SOURCE_FILES paths, one per line}}

## What to Check

Cross-reference the implementation against requirements and blueprint:

1. **Requirement coverage**: Does every technical requirement have a corresponding implementation?
2. **Acceptance criteria**: Are all acceptance criteria met (explicit or inferred from blueprint)?
3. **Blueprint completeness**: Is every step in the blueprint's build sequence implemented?
4. **Edge cases**: Are edge cases from the spec handled (empty PDF, missing text layer, zero highlights)?
5. **Error handling**: Are PDF.js errors, loading failures, and missing data handled?
6. **Dead code**: Is there any implemented code that doesn't map to a requirement?
7. **Missing functionality**: Is anything from the blueprint NOT implemented?

## Output Format

For EACH issue found, output:

```
FILE: <filepath>
LINE: <line number or "N/A" for missing functionality>
PRIORITY: [Critical|High|Medium]
ISSUE: <brief description>
CODE: <problematic code snippet or "MISSING">
SUGGESTION: <what should be added or changed>
RATIONALE: <which requirement or blueprint section this relates to>
```

If no issues found, state "All requirements satisfied."

REQUIREMENTS REVIEW COMPLETE
````

**Task call 3** -- Logic, Security & Correctness Reviewer:
Use `subagent_type: "Explore"`. Copy this prompt, replacing ALL `{{PLACEHOLDERS}}` with their FULL content. Do NOT abbreviate or summarize any placeholder:

````
You are a Logic, Security & Correctness critical Reviewer. Your ONLY job is to find bugs, security vulnerabilities, and performance issues in changed code.

## Files to Review

For EACH file below, run `git diff HEAD -- <file>` to see changes, then read the full file for context.

{{SOURCE_FILES + CONFIG_FILES + OTHER_FILES paths, one per line}}

## What to Check

For EACH changed file, check ALL of the following:

### Logic & Correctness
1. **Conditional logic**: Are all branches correct? Missing else clauses? Off-by-one errors in coordinate calculations?
2. **React hooks rules**: No hooks called conditionally? No stale closures in useEffect? Correct dependency arrays?
3. **Async error handling**: Missing try/catch around PDF.js calls? Unhandled promise rejections? Empty catch blocks?
4. **Null/undefined safety**: Optional chaining where needed? Null checks before accessing PDF page properties or text items?
5. **Type safety**: Any type assertions (`as`) that could mask bugs? Unsafe `any` usage?
6. **useEffect cleanup**: Are event listeners, PDF.js render tasks, and subscriptions properly cleaned up on unmount?
7. **PDF.js integration**: Is the worker configured before document loading? Are render tasks cancelled on re-render? Are viewport transforms applied correctly?

### Security
8. **XSS prevention**: Is PDF-sourced text content rendered safely (no `dangerouslySetInnerHTML` with unescaped content)?
9. **URL validation**: Are PDF source URLs validated or sanitized before loading?
10. **Sensitive data exposure**: No credentials, tokens, or sensitive config in console.log or error messages?

### Performance
11. **Re-render efficiency**: Are callbacks and objects memoized with `useCallback`/`useMemo` where they are passed as props or used in effect deps?
12. **PDF render lifecycle**: Are canvas contexts properly cleared before re-rendering? Are render tasks cancelled before starting new ones?
13. **Highlight computation**: Are highlight coordinate calculations deferred/memoized if expensive?
14. **Zustand selectors**: Are Zustand store values selected with specific selectors (not selecting the whole store)?

## Output Format

For EACH issue found, output:

```
FILE: <filepath>
LINE: <line number>
PRIORITY: [Critical|High|Medium]
ISSUE: <brief description>
CODE: <problematic code snippet>
SUGGESTION: <concrete fix>
RATIONALE: <why this is a bug/vulnerability/performance issue>
```

If no issues found for a file, skip it.

LOGIC SECURITY REVIEW COMPLETE
````

**Task call 4** -- Test Quality Reviewer:
Use `subagent_type: "Explore"`. Copy this prompt, replacing ALL `{{PLACEHOLDERS}}` with their FULL content. Do NOT abbreviate or summarize any placeholder:

````
You are a Test Quality Reviewer. Your ONLY job is to verify that tests are meaningful, follow best practices, and provide adequate coverage.

## Blueprint

{{BLUEPRINT}}

## Test Files to Review

For EACH test file below, run `git diff HEAD -- <file>` to see changes, then read the full file for context.

{{TEST_FILES paths, one per line}}

## Source Files Under Test

Also read these source files to understand what the tests should cover:

{{SOURCE_FILES paths that TEST_FILES test, one per line}}

## What to Check

For EACH test file, check ALL of the following:

1. **Coverage of new functionality**: Does every new component/hook/utility have tests? Cross-reference with blueprint's testing strategy.
2. **Behavior-focused assertions**: Do tests assert on correct output for given input, NOT implementation details?
   - GOOD: testing rendered output matches expected state, user interactions produce correct results
   - BAD: testing internal variable state, checking call order of internal functions
3. **Edge cases**: Are empty/null states, loading states, error states, and boundary conditions tested?
4. **Mock appropriateness**:
   - Are external dependencies (PDF.js, file system) mocked at the boundary?
   - Are internal React hooks and components NOT over-mocked (integration is better than isolation)?
   - Is `vi.mock('pdfjs-dist')` used correctly when testing PDF-dependent code?
5. **React Testing Library patterns**: Using `screen` queries? Preferring `getByRole` over `getByTestId`? Using `userEvent` over `fireEvent`? Using `render` or `renderHook` from `@/test`?
6. **Test descriptions**: Are `describe`/`it` blocks descriptive of the behavior being tested?
7. **Test isolation**: No shared mutable state between tests? Each test independent?
8. **Cleanup**: Proper `afterEach` cleanup? No leaked state between tests?
9. **Vitest patterns**: Using `vi.fn()`, `vi.mock()`, `vi.spyOn()` correctly? Mocks restored between tests with `vi.clearAllMocks()` or `afterEach`?

## Output Format

For EACH issue found, output:

```
FILE: <filepath>
LINE: <line number>
PRIORITY: [Critical|High|Medium]
ISSUE: <brief description>
CODE: <problematic test code snippet>
SUGGESTION: <concrete fix or better test approach>
RATIONALE: <why this improves test quality>
```

If no issues found for a file, skip it.

TEST QUALITY REVIEW COMPLETE
````

### GATE

STOP. Verify all 4 subagents returned. For each, check for the sentinel line (`ARCHITECTURE REVIEW COMPLETE`, `REQUIREMENTS REVIEW COMPLETE`, `LOGIC SECURITY REVIEW COMPLETE`, `TEST QUALITY REVIEW COMPLETE`). If any subagent failed or timed out, note it:

```
FAILED_REVIEWERS = [list or empty]
```

Output which reviewers completed and which failed. Only then proceed to Step 4.

---

## Step 4: Synthesize Findings

1. **Collect** ALL findings from ALL completed reviewers into a single numbered list.
2. **Deduplicate**: Same file + overlapping line range + same issue type → merge, keep the more detailed description.
3. **Resolve conflicts**: If two reviewers suggest different fixes for the same code:
   - Higher priority wins (Critical > High > Medium)
   - Same priority precedence: Logic & Security > Architecture > Requirements > Test Quality
   - If still ambiguous: read the code to decide.
4. **Convert** each finding to the REVIEW FINDINGS format.
5. **Output** the REVIEW FINDINGS template to the conversation.

### Output: REVIEW FINDINGS

````markdown
# REVIEW FINDINGS

## 1. [filename].[extension]

[filepath]/[filename].[extension]#[lineNumber]
Domain: [architecture|requirements|logic-security|test-quality]
Priority: [Critical|High|Medium]

**Issue**: [brief description]

### code

```typescript
// problematic code with surrounding context
```

### suggested changes

```typescript
// concrete fix
```

**Rationale**: [why this change matters]
````

Repeat for each finding, numbered sequentially.

### GATE

STOP. Verify REVIEW FINDINGS is output to the conversation. Only then proceed to Step 5.

---

## Step 5: Apply Fixes

For EACH finding with priority **Critical** or **High**, plus **Medium** findings with clear unambiguous solutions:

1. Read the file if not already read.
2. Apply the suggested fix using the Edit tool.
3. Add the file path to `FIXED_FILES`.

Rules for applying fixes:

- Apply edits in **REVERSE line-number order** within each file to prevent line shift.
- If a suggested fix is ambiguous or could break other code, skip it and list it as "Remaining issues" in the report.

### GATE

STOP. Verify all applicable fixes attempted. Only then proceed to Step 6.

---

## Step 6: Output Report

Output the REVIEW REPORT:

```
REVIEW REPORT
=============
Reviewers completed: [architecture, requirements, logic-security, test-quality]
Reviewers failed: [list or "None"]

Findings: N total (X Critical, Y High, Z Medium)
Fixed: M files modified

Files fixed:
  - <filepath> — <Priority> — <brief description of fix applied>
  - ...

Remaining issues (not auto-fixed):
  - <filepath>#<line> — <Priority> — <Domain> — <brief description>
  - ...

Warnings:
  - [any reviewer failures, conflicts, anomalies, or "None"]

REVIEW CHANGES COMPLETE
```

---

## Exclusions

### Auto-Excluded Files (NEVER review)

- `package-lock.json` — auto-generated
- `src/components/ui/*.tsx` — shadcn/ui generated primitives, not hand-authored

### Skip During Review (handled by tooling)

- Formatting issues — handled by Prettier (`npm run format`)
- Import ordering violations — handled by ESLint (`npm run lint:fix`)
- Generic advice without specific problems — not actionable

## Priority Classification

- **Critical**: Security vulnerabilities, data breaches, runtime crashes
- **High**: Performance issues, breaking changes, incorrect rendering or coordinate calculations
- **Medium**: Maintainability problems, code quality issues, missing edge case handling
- **Low**: SKIP entirely (formatting, style preferences)
