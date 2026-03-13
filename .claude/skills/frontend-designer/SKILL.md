---
name: frontend-designer
description: UI implementation guidance. Directs to project design docs, documents data-slot conventions, and provides a unified pre-implementation checklist.
---

# Frontend Designer

When building or modifying UI components, read these project docs **in order** before writing code:

1. [CLAUDE.md](../../../CLAUDE.md) — project structure, commands, tech stack
2. [COMPONENT_GUIDELINES.md](../../../docs/COMPONENT_GUIDELINES.md) — component anatomy, props, styling, accessibility

---

## Installed UI Components

### Shadcn (use `data-slot`, import from `@/components/ui/<name>`)

button, dropdown-menu, skeleton, sonner

### Custom (project-specific, no `data-slot`)

| Component        | File                  | Purpose                               |
| ---------------- | --------------------- | ------------------------------------- |
| Loading variants | `loading.tsx`         | Loading, PageLoading, InlineLoading   |
| Spinner          | `spinner.tsx`         | SVG spinner with CVA size variants    |
| VisuallyHidden   | `visually-hidden.tsx` | Screen-reader-only content + SkipLink |

---

## `data-slot` Convention

Shadcn components use `data-slot="<name>"` on their root element for CSS targeting without class coupling. This project relies on it for parent-child styling:

```tsx
// Shadcn button renders: <button data-slot="button" ...>
// Parent can style children via Tailwind arbitrary selectors:
'has-data-[slot=button]:gap-2';
'in-data-[slot=dropdown-menu-item]:px-3';
```

**Rules:**

- Shadcn components already set `data-slot` — do not remove or rename them
- Custom components should **not** add `data-slot` unless explicitly integrating with Shadcn parent/child selectors
- Use `data-slot` selectors (not component class names) when a parent needs to conditionally style a Shadcn child

---

## Animation Constraints

**Avoid these patterns** — they cause jank or conflict with Radix transitions:

- `animate-bounce` on interactive elements (distracting, accessibility issue)
- `transition-all` with `backdrop-blur` changes (GPU compositing stalls)
- Custom `@keyframes` when a Tailwind utility exists (`animate-spin`, `animate-pulse`, `animate-in`/`animate-out`)
- Layout-triggering animations (`width`, `height`, `top`, `left`) — use `transform` and `opacity` instead
- Competing transitions on Radix `data-[state=open/closed]` elements — use the built-in `animate-in`/`animate-out` utilities

**Prefer:** `transition-colors`, `transition-opacity`, `transition-transform` with `duration-200` or `duration-300`.

---

## PDF-Specific UI Patterns

This project renders PDFs with custom highlight overlays. Key patterns for PDF-related components:

- **Layer order**: canvas (rendered PDF) → text layer (invisible, selectable) → highlight overlay (semi-transparent rects)
- **Positioning**: The highlight overlay is absolutely positioned within the page container, matching canvas dimensions
- **Coordinates**: Use `page.getTextContent()` + `pdfjsLib.Util.transform` to map text items to viewport coordinates
- **Highlights**: Drawn as semi-transparent `<div>` rectangles matching text item bounding boxes
- **No zoom support needed** — highlights are drawn at current scale only

---

## Pre-Implementation Checklist

Before writing any UI code:

1. Check if a Shadcn component already exists (see list above or [Shadcn registry](https://ui.shadcn.com))
2. Follow the full checklist in [COMPONENT_GUIDELINES.md](../../../docs/COMPONENT_GUIDELINES.md#checklist)
3. For PDF overlay components, follow the PDF-specific patterns above
