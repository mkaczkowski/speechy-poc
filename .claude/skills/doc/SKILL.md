---
name: doc
description: Generate or update project documentation (decisions, features, patterns). Invoked manually or after queen implementation.
argument-hint: "decision: <topic>" | "feature: <topic>" | "pattern: <topic>" | "update: <path>" | "queen-context"
disable-model-invocation: true
---

# Documentation Skill

Generate or update structured documentation in `docs/`.

## Phase 1: Gather Context

Parse the argument to determine the mode:

- **`queen-context`**: Read context files from `tmp/doc-context/`:
  - `tmp/doc-context/requirements.md`
  - `tmp/doc-context/discovery.md`
  - `tmp/doc-context/blueprint.md`
  - `tmp/doc-context/summary.md`
    Default to generating a **feature** doc. If the summary explicitly mentions a significant architectural decision (new abstraction, technology choice, breaking change), also generate a **decision** record.

- **`decision: <topic>`**: Spawn 1 Explore agent to analyze the codebase area relevant to the topic. Focus on finding the code that implements the decision, what alternatives exist, and why this approach was chosen.

- **`feature: <topic>`**: Spawn 1 Explore agent to analyze the feature. Focus on entry points, data flow, key files, and non-obvious behavior.

- **`pattern: <topic>`**: Spawn 1 Explore agent to find instances of the pattern in the codebase. Focus on the canonical example, when it's used, and all instances.

- **`update: <path>`**: Read the existing doc file at `<path>`. Then spawn 1 Explore agent to re-analyze the referenced files and check what has changed.

## Phase 2: Generate

Generate exactly one document (or two for queen-context if a decision is warranted).

### Document Rules

- Only include sections with meaningful content -- skip empty sections entirely, do NOT write "N/A" or "None"
- Use concrete `file_path:line_number` references, not vague descriptions
- Keep it concise -- aim for docs scannable in 30 seconds
- For decisions: focus on _why_ and _what alternatives were rejected_
- For features: focus on _entry points_, _data flow_, and _non-obvious behavior_
- For patterns: focus on _when to use_, _canonical example_, and _codebase instances_

### Templates

**Decision** (`docs/decisions/NNNN-<slug>.md`):

Number `NNNN` sequentially. Check `docs/decisions/README.md` to find the next number.

```markdown
# NNNN: <Title>

**Date:** YYYY-MM-DD | **Status:** Accepted

## Context

<What situation or problem prompted this decision>

## Decision

<What we decided and why>

## Alternatives Considered

<What else was evaluated and why it was rejected>

## Consequences

<What this enables, what it costs, what to watch out for>
```

Optional sections (include only when relevant): `## Key Files`

**Feature** (`docs/features/<slug>.md`):

```markdown
# <Feature Name>

**Package:** @olx/<pkg> | **Added:** YYYY-MM-DD

## Overview

<One paragraph: what it does and why it exists>

## How It Works

<Entry points, data flow, key files with file:line references>

## Key Files

<Bullet list of files and their responsibilities>
```

Optional sections (include only when relevant): `## Configuration`, `## Edge Cases`, `## Related`

**Pattern** (`docs/patterns/<slug>.md`):

```markdown
# <Pattern Name>

**Added:** YYYY-MM-DD

## Intent

<What problem this solves>

## Example

<Canonical code example from the codebase>

## When to Use

<Criteria>

## Instances

<Bullet list of where this pattern is used in the codebase>
```

Optional sections (include only when relevant): `## Key Implementation Notes`

### For `update:` mode

Read the existing doc, then regenerate its content based on the current state of the referenced files. Preserve the filename, numbering, and date. Update the "How It Works", "Key Files", "Instances", or other content sections to reflect current code.

## Phase 3: Update Index + Output Summary

### Step 1: Update sub-index

Read the relevant `docs/<type>/README.md` (decisions, features, or patterns). If the new doc is not already listed, append a bullet entry:

```
- [<Title>](<filename>.md) -- <one-line description> `@olx/<pkg>`
```

### Step 2: Update top-level index

Read `docs/README.md`. Verify all three category links are present. No changes needed unless a new category was added.

### Step 3: Print summary

Output a summary of what was created/modified:

```
Documentation generated:
- Created: docs/features/<slug>.md
- Updated: docs/features/README.md
```

Let the user review the generated files before committing.
