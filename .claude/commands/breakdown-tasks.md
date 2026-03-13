---
description: 'Generate a detailed engineering task breakdown for a feature following standard project conventions.'
---

# Engineering Task Breakdown Workflow

Act as a Technical Lead performing a comprehensive task breakdown for the provided Epic or Feature request. Your goal is to break down the work into logical, implementation-ready phases and tasks

## Step 1: Context & Analysis

Before generating the breakdown, you must understand the existing system and requirements.

1.  **Review Project Documentation**:
    - **Architecture**: `docs/ARCHITECTURE.md`
    - **Coding Standards**: `docs/CODING_STANDARDS.md`
    - **Components**: `docs/COMPONENT_GUIDELINES.md`
    - **Unit Testing**: `docs/TESTING.md`
    - **E2E Testing**: `docs/E2E_TESTING.md`

2.  **Analyze Requirements**:
    - Review the user's request.
    - Identify the core domains and components involved.
    - **Search the codebase** for relevant existing implementations to leverage or extend.
    - Check for existing UI patterns in `src/components/`.

## Step 2: Gap Analysis & Interactive Review

1.  Create a section titled **Gap Analysis** containing:
    - **Missing Requirements**: Implicit needs not stated (e.g., error handling, loading states, empty states).
    - **UI/UX Details**: Are designs provided? Are there missing states (hover, focus, error)?
    - **Dependencies**: Third-party libraries (npm packages), browser APIs, or PDF.js capabilities.
    - **Risks**: Technical complexity, performance concerns, security implications, or legacy code impact.
    - **Questions**: Specific questions for the user to clarify scope.

2.  **Present this Gap Analysis to the user** and explicitly ask for clarification on the questions and concerns raised.

3.  **Do not proceed** to Step 3 until the user has answered the questions or explicitly requested to proceed with the current assumptions.

## Step 3: Generate Task Breakdown

Once the user confirms or provides answers, generate the full breakdown using the **strict format** defined below. Do NOT deviate from this structure.

### 3.1 Formatting Rules

1.  **Story Point Scale**: You MUST include the standard scale definition at the top.
2.  **Phase Overview**: Use a summary table for high-level planning.
3.  **Task Granularity**: Tasks should be implementation-ready (approx. 1-5 days of work).
4.  **Deliverables**: List specific files to be created or modified.
5.  **Testing**: Every task must include relevant test deliverables (Unit, Integration, E2E).

### 3.2 Required Output Template

Use the following Markdown structure exactly.

#### Header Section

## Phase Overview

| Phase | Name         | Objective         | Key Tasks |
| ----- | ------------ | ----------------- | --------- |
| 1     | [Phase Name] | [Phase Objective] | 1.1, 1.2  |
| ...   | ...          | ...               | ...       |

````

#### Phase & Task Section

For each Phase, create a section. For each Task, use this exact block:

```markdown
---

## Phase [N]: [Phase Name]

**Phase objective:** [Description]

### Task [N].[M]: [Task Name]

**Description:**
[Detailed technical description of what needs to be done]

**Deliverables:**

- `src/path/to/file.ts`:
  - [Specific implementation detail]
  - [Specific implementation detail]
- [Test files]

**Acceptance Criteria:**

- [ ] [Criteria 1]
- [ ] [Criteria 2]
- [ ] [Criteria 3]

**Dependencies:** [Task IDs or None]

**Risk:** [Low/Medium/High] - [Reason]
````

### 3.3 Example Output Reference

Here is an example of how a Phase and Task should be formatted (Do not copy this content, use it as a style guide):

```markdown
## Phase 1: Foundation - PDF Highlight Types & State

**Phase objective:** Define core highlight types, Zustand store, and comprehensive tests.

### Task 1.1: Create Highlight Types & Zustand Store with Tests

**Description:**
Create TypeScript type definitions for highlight data structures, implement a Zustand store with auto-generated selectors using the `createSelectors` utility, and provide comprehensive test coverage.

**Deliverables:**

- `src/lib/highlight.types.ts`:
  - `HighlightRect` - position and dimension data for a single highlight rectangle
  - `HighlightGroup` - collection of rects representing a multi-word highlight
- `src/lib/highlightStore.ts`:
  - State: `{ highlights: HighlightGroup[], activeHighlightId: string | null }`
  - Actions: `addHighlight`, `removeHighlight`, `setActiveHighlight`
  - Uses `createSelectors` for auto-generated selector hooks
- `src/lib/highlightStore.test.ts`:
  - Tests for all actions and selectors using Vitest

**Acceptance Criteria:**

- [ ] Types cover all highlight use cases (single word, sentence, multi-line)
- [ ] Zustand store follows project `createSelectors` pattern
- [ ] All selectors are tested with various state scenarios
- [ ] 80% code coverage threshold met

**Dependencies:** None

**Risk:** Low - Standard Zustand store pattern already established in project
```

#### Summary Section

## Validation Checklist

Before outputting the final response, verify:

1.  Are **Deliverables** specific (exact file paths using `src/` structure)?
2.  Are **Acceptance Criteria** actionable checkboxes?
3.  Is the math in the **Summary** correct?
4.  Do all **Dependencies** reference existing tasks (no forward references)?
5.  Are there no **circular dependencies** in the task graph?
6.  Do dependencies follow **chronological order** (earlier phases before later)?
7.  Do deliverables follow project conventions (`@/` imports, named exports, barrel exports)?

## Testing Requirements Matrix

Use this matrix to determine required test coverage for each task. Tests use **Vitest** + **Testing Library** for unit/integration and **Playwright** for E2E.

| Component Type   | Unit Tests (Vitest) | Integration (Testing Library) | E2E (Playwright) | Notes                                    |
| ---------------- | ------------------- | ----------------------------- | ---------------- | ---------------------------------------- |
| UI Component     | ✓                   | ✓                             | -                | Test rendering, interactions, a11y       |
| Business Logic   | ✓                   | -                             | -                | High coverage for complex logic          |
| Utility/Hook     | ✓                   | -                             | -                | Co-located test files (`*.test.ts`)      |
| State Management | ✓                   | ✓                             | -                | Test Zustand store actions and selectors |
| Full Feature     | ✓                   | ✓                             | ✓                | Complete coverage across all layers      |
| Infrastructure   | ✓                   | ✓                             | -                | Focus on failure modes and edge cases    |

**Legend:** ✓ = Required, - = Not applicable

**Test conventions:**

- Co-located tests: `ComponentName.test.tsx` alongside source files
- Use custom render from `@/test` (wraps with `AllProviders`)
- 80% coverage threshold enforced
- E2E tests in `e2e/tests/` using accessibility-first selectors
