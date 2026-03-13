---
name: queen
description: Spec-driven feature implementation with parallel discovery, architecture design, and quality gates
argument-hint: Task description, and/or path to PRD/RFC file (e.g., "Add highlight overlay component", "Add PDF text search" docs/feature.md)
disable-model-invocation: true
---

# Queen Agent

Five strict phases. Execute every step in order. NEVER skip a step. NEVER reorder phases.

## Input

Raw input: `$ARGUMENTS`

### Input parsing

Parse `$ARGUMENTS` into two optional components:

1. **`SPEC_FILES`** (list) — tokens that are file paths: must end with `.md`, `.txt`, or `.doc`, OR contain `/` AND resolve to an existing file. Remove matched tokens from remaining text.
2. **`TASK_DESCRIPTION`** — any remaining text (trimmed).

Any combination is valid:

| Example                               | TASK_DESCRIPTION      | SPEC_FILES      |
| ------------------------------------- | --------------------- | --------------- |
| `Add highlight overlay`               | Add highlight overlay | —               |
| `Add highlight overlay docs/rfc.md`   | Add highlight overlay | docs/rfc.md     |
| `Add PDF text search docs/feature.md` | Add PDF text search   | docs/feature.md |
| `docs/feature.md`                     | —                     | docs/feature.md |

`FEATURE_LABEL` = first 50 chars of `TASK_DESCRIPTION` if set, else basename of first spec file (e.g. `feature.md`).

## Rules

1. User invoked this skill. That IS approval. NEVER ask "should I proceed?" unless you hit an explicit **Escalate** condition.
2. Copy existing codebase patterns exactly. Consistency beats creativity.
3. Spec defines WHAT to build. Codebase defines HOW (naming, location, style).
4. When spec is high-level, codebase also informs WHAT: existing patterns imply completeness (e.g. new component = component file + Props interface + barrel export + co-located tests).

---

## Phase 0: Requirements Gathering

### Steps

#### Step 1: Collect raw requirements

- **If `TASK_DESCRIPTION` is set:** use it as primary context.
- **If `SPEC_FILES` is non-empty:** read each file with the Read tool. Spec files are the primary source of detailed requirements.

#### Step 2: Write requirements summary

Combine all gathered information into this exact structure:

```
REQUIREMENTS SUMMARY
====================
Source: <"Task description" or spec file names>
Spec documents: <list of read file paths, or "None">
Feature objective: <1-2 sentences>
Technical requirements:
  - <requirement 1>
  - <requirement 2>
  - ...
Acceptance criteria:
  - <criterion 1 OR "Not specified -- will infer in Phase 1.5">
  - ...
Architecture decisions: <from RFC/PRD or "None specified">
Gaps to fill: <list what the spec does NOT cover>
```

### Prerequisites check

After writing the requirements summary, verify:

- **Feature objective exists** -- at minimum a clear statement of what to accomplish
- **Domain context exists** -- enough to know which area of the codebase to explore

If there is no meaningful description from ANY source (no task description, no spec docs): STOP. Ask the user for more details. Do NOT proceed.

If requirements are high-level but a feature objective exists: PROCEED. Note gaps in the summary. Phase 1 and Phase 1.5 will fill them.

### GATE

STOP. Verify you have output the requirements summary above. Only then proceed to Phase 1.

---

## Phase 1: Discovery

### Steps

1. Send exactly **1 message** containing exactly **2 Task tool calls** in parallel:

**Task call 1** -- Explorer 1 (Patterns & Conventions):
Use `subagent_type: "Explore"`. Copy this prompt, replacing `{{REQUIREMENTS_SUMMARY}}` with the FULL requirements summary from Phase 0 (do NOT abbreviate):

```
{{REQUIREMENTS_SUMMARY}}

Based on the requirements above, do the following:

1. Read CLAUDE.md at the project root for architecture overview and conventions.

2. Find 2-3 existing files in the codebase most similar to what the requirements describe. Focus on:
   - PDF components (src/components/pdf/*.tsx)
   - Shared/layout components (src/components/shared/*.tsx, src/components/layout/*.tsx)
   - Library utilities (src/lib/*.ts)
   - UI primitives (src/components/ui/*.tsx)

3. For EACH file type that the feature will need (component, hook, util, store, types, tests), report:
   - Exact file naming convention (example: src/components/pdf/PdfViewer.tsx)
   - Directory location (example: src/components/pdf/)
   - Import style: always uses `@/` path alias, imports ordered: types → lib utils → stores → hooks → components
   - Export pattern: named exports + `Props` interface for components; `type` keyword for unions, `interface` for object shapes
   - Barrel export: each directory has index.ts re-exporting all public members
   - Test file naming (example: src/components/pdf/PdfViewer.test.tsx — colocated with source)

4. Check if any files that will be modified are referenced in existing `docs/` files. If so, note them as STALE_DOCS in your findings (these docs may need updating after implementation).

5. Return ALL findings. Do not summarize. Include file paths with line references.
```

**Task call 2** -- Explorer 2 (Integration & Scope):
Use `subagent_type: "Explore"`. Copy this prompt, replacing `{{REQUIREMENTS_SUMMARY}}` with the FULL requirements summary from Phase 0 (do NOT abbreviate):

```
{{REQUIREMENTS_SUMMARY}}

Based on the requirements above, do the following:

1. Find existing files that MUST be modified for this feature. Include files implied by the requirements even if not explicitly listed.

2. Find 1-2 similar features already in the codebase. For each, list its COMPLETE file set (component, hook, store slice, types, tests, barrel export in index.ts). This defines the completeness expectation for the new feature.

3. Find shared utilities, hooks, and modules that can be reused:
   - src/lib/utils.ts (cn, class merging utilities)
   - src/lib/ (PDF helpers: page rendering, text content extraction, viewport transforms)
   - Zustand stores in src/ (global state management)
   - src/components/ui/ (shadcn/ui primitives: Button, Spinner, etc.)

4. Find integration points where the new feature must be registered:
   - Barrel export files (index.ts in each directory)
   - Zustand store slices (if new state is needed)
   - Parent components that will render the new component
   - src/lib/ helpers that need extension

5. Find test utilities and existing test patterns that can be reused:
   - src/test/ (custom render wrapper, test utilities)
   - Existing *.test.tsx patterns (renderHook, userEvent, screen queries)

6. Find existing patterns for error handling and loading states in this domain.

7. Return ALL findings as a list of files with paths and their role. Do not summarize.
```

2. Wait for BOTH explorers to return.

3. Consolidate findings. Output this exact structure to the conversation:

```
DISCOVERY FINDINGS
==================
File naming patterns:
  - Components: <pattern> at <directory>
  - Hooks: <pattern> at <directory>
  - Utils/lib: <pattern> at <directory>
  - Stores: <pattern> at <directory>
  - Tests: <pattern> at <directory>

Import/export conventions:
  - <convention 1>
  - <convention 2>

Files to modify:
  - <file path> -- <what changes>
  - ...

Files to create:
  - <file path> -- <purpose>
  - ...

Reusable utilities:
  - <utility path> -- <what it provides>
  - ...

Integration points:
  - <file path> -- <what to register/wire>
  - ...

Completeness expectation (from similar feature <name>):
  - <file type>: <file path example>
  - ...

Error handling / loading state patterns:
  - <pattern from file path>
```

4. Run completeness validation. Check each:
   - [ ] Component barrel export in the directory's `index.ts` noted in "Files to modify"
   - [ ] Props interface defined for each new component
   - [ ] Zustand store reviewed for reuse or extension (if state needed)
   - [ ] Test file planned for new functionality (co-located with source)

### GATE

STOP. Verify: (1) both explorers returned, (2) DISCOVERY FINDINGS block is output to conversation, (3) completeness validation checklist passed. Only then proceed to Phase 1.5.

---

## Phase 1.5: Architecture Design

### Steps

1. Send exactly **1 Task tool call** with `subagent_type: "Plan"`.

Copy this prompt. Replace `{{REQUIREMENTS_SUMMARY}}` with the FULL requirements summary from Phase 0 and `{{DISCOVERY_FINDINGS}}` with the FULL discovery findings from Phase 1. Do NOT abbreviate or summarize either block -- copy them in full:

```
You are a software architect. Produce a concrete implementation blueprint for the feature below.

## Requirements

{{REQUIREMENTS_SUMMARY}}

## Codebase Discovery Findings

{{DISCOVERY_FINDINGS}}

## Instructions

Produce a blueprint with ALL of the following sections. Do not skip any section.

### 1. Inferred Requirements
What the spec says explicitly. What the codebase implies should exist (based on similar components/features). If acceptance criteria are missing, infer them from similar features.

### 2. Architecture Decision
One chosen approach. Brief rationale. What was ruled out and why. Do NOT present multiple options.

### 3. Component Design
For EACH file to create or modify:
- File path (following discovered naming conventions, using @/ alias)
- Responsibility (one sentence)
- Dependencies (imports from @/ paths)
- Interface (exported component Props interface, hook return type, util function signatures)

### 4. Data Flow
Entry point → state/props → rendering → user interactions → side effects. Include PDF.js rendering pipeline if applicable (canvas layer → text layer → highlight overlay). Include Zustand state flow if applicable.

### 5. Build Sequence
Ordered list of implementation steps. Each step MUST be independently type-checkable. Use this order:
1. Foundation (TypeScript types, interfaces, constants)
2. Data/utilities layer (lib helpers, custom hooks, Zustand store slices)
3. UI layer (React components, following shadcn/ui patterns)
4. Integration (barrel exports in index.ts, wiring into parent components)
5. Tests (unit tests co-located with source files)

For each step, list the specific files to create/modify.

### 6. Testing Strategy
- What needs unit tests (hooks, utils, component rendering, user interactions)
- Which mock patterns to use (vi.fn(), vi.mock(), React Testing Library render/renderHook)
- Which existing test utilities to reuse from src/test/
- How to test PDF.js integration (mock pdfjsLib if needed)
```

2. Read the blueprint returned by the agent.

3. Validate the blueprint against discovery findings:
   - Every file path in the blueprint MUST use `@/` alias and match the naming conventions from discovery
   - Every integration point from discovery MUST appear in the blueprint (barrel exports, parent component wiring)
   - If blueprint conflicts with codebase patterns: resolve in favor of codebase patterns

4. Output the validated blueprint to the conversation. If you made corrections, note them.

### GATE

STOP. Verify: (1) blueprint is produced, (2) blueprint has all 6 sections, (3) blueprint is validated against discovery findings. Only then proceed to Phase 2.

---

## Phase 2: Implementation

### Tracked state

Maintain a list of file types you have already scouted: `SCOUTED_TYPES = []`

### Steps

Follow the build sequence from the blueprint. For EACH step in the sequence:

1. **Pattern scout** -- check if you have already scouted this file type.
   - If the file type (component, hook, store, util, test) is NOT in `SCOUTED_TYPES`:
     - Glob for a similar existing file
     - Read ONE best match
     - Add this file type to `SCOUTED_TYPES`
   - If the file type IS already in `SCOUTED_TYPES`: skip to step 2.

2. **Implement** the step following the blueprint + scouted patterns.
   - MUST include tests for new functionality as specified in the blueprint testing strategy.

3. **Type-check** every file you created or modified in this step:

   ```bash
   npx tsc --noEmit
   ```

4. **Fix** every type error. Repeat step 3 until type-check passes. Do NOT move to the next build step until type-check passes.

Repeat steps 1-4 for every step in the build sequence.

### Escalate to user

STOP and ask the user ONLY when ALL of these are true:

- A decision is required
- AND the codebase has no clear precedent for the decision
- AND the blueprint does not resolve it

Specific escalation triggers:

- Contradictory requirements with no codebase precedent
- Multiple architecturally divergent approaches with no codebase precedent
- Breaking changes to existing public APIs detected

NEVER escalate when:

- Spec is vague but codebase patterns make the choice obvious -- use the codebase pattern
- Minor details are unspecified -- use codebase conventions
- Blueprint already resolved the ambiguity -- follow the blueprint

### GATE

STOP. Verify: (1) every step in the build sequence is implemented, (2) every step passes type-check. Only then proceed to Phase 3.

---

## Phase 3: Quality Gate

ALL checks are MANDATORY. NEVER skip a check.

### Steps 1-2: Run both checks

Run these two commands in this order. Run BOTH before fixing anything. Do NOT stop to fix between checks.

```bash
# Check 1: Tests (all tests)
npm test

# Check 2: Type-check
npx tsc --noEmit
```

### Step 3: Fix failures

After BOTH checks have run, fix every failure.

- If a failing file does NOT appear in `git diff --name-only HEAD` → it is pre-existing. Note it but do NOT fix it.
- If a failing file DOES appear in `git diff --name-only HEAD` → fix it.

### Step 4: Code review

#### Step 4a: Write review context

```bash
rm -rf tmp/review-context/ && mkdir -p tmp/review-context/
```

Write these 3 files. Copy the FULL content of each block from your conversation. Do NOT abbreviate or summarize.

- Write `tmp/review-context/requirements.md` — the FULL `REQUIREMENTS SUMMARY` block from Phase 0.
- Write `tmp/review-context/discovery.md` — the FULL `DISCOVERY FINDINGS` block from Phase 1.
- Write `tmp/review-context/blueprint.md` — the FULL blueprint from Phase 1.5.

#### Step 4b: Invoke review

Use review-changes skill. This is MANDATORY. NEVER skip it.

#### Step 4c: Clean up

```bash
rm -rf tmp/review-context/
```

### Step 5: Verify review changes

If step 4 produced ANY file changes:

- Type-check:
  ```bash
  npx tsc --noEmit
  ```
- Run tests:
  ```bash
  npm test
  ```
- Fix any failures.

If step 4 produced NO file changes: proceed directly to Phase 4.

### GATE

STOP. Verify: (1) steps 1-2 both ran, (2) all fixable failures are fixed, (3) review-changes skill was executed, (4) review changes verified. Only then proceed to Phase 4.

---

## Phase 4: Summary

### Step 1: Print summary

Output this exact structure:

```
IMPLEMENTATION SUMMARY
======================
Feature: <FEATURE_LABEL>

Files changed:
  - <file path> (created|modified)
  - ...

Decisions made:
  - <decision>: <rationale> (especially decisions inferred from codebase patterns when spec was silent)
  - ...

Review findings:
  - <Critical/High fixes applied by review>
  - <Medium/Low suggestions not applied, or "None">

Issues:
  - <pre-existing failures, deferred items, unresolved ambiguities, or "None">
```

### Step 2: Ask user

Use `AskUserQuestion` with the question: "What would you like to do next?"
Options: "Looks good", "Looks good, document this", "I have feedback"

STOP. Wait for user response. Do NOT proceed until the user responds.

If user gave feedback: address the feedback, then return to Step 1.
If user chose "Looks good": skip to commit (no documentation phase).
If user chose "Looks good, document this": proceed to Phase 5.

---

## Phase 5: Documentation (conditional)

Only execute this phase if the user chose "Looks good, document this" in Phase 4 Step 2.

### Step 1: Write doc context

```bash
mkdir -p tmp/doc-context/
```

Write 4 files with FULL content (do NOT abbreviate):

- `tmp/doc-context/requirements.md` -- REQUIREMENTS SUMMARY from Phase 0
- `tmp/doc-context/discovery.md` -- DISCOVERY FINDINGS from Phase 1
- `tmp/doc-context/blueprint.md` -- blueprint from Phase 1.5
- `tmp/doc-context/summary.md` -- IMPLEMENTATION SUMMARY from Phase 4

### Step 2: Invoke documentation skill

Use the Skill tool: `/doc queen-context`

### Step 3: Clean up

```bash
rm -rf tmp/doc-context/
```

### Step 4: Show generated docs

Print the list of generated doc files. Let the user review before proceeding.

### Step 5: Commit docs

```bash
git add docs/
git commit -m "docs: <FEATURE_LABEL>"
```
