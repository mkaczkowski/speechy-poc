# CLAUDE.md

AI assistant guidance for **pdf-highlight-poc** - a React 19 + TypeScript + Vite 7 PDF text highlighting proof-of-concept.

## Project Goal

Build a PoC that renders a PDF using `pdfjs-dist` (raw npm package, no wrapper) and adds a **custom overlay layer** above native PDF.js layers to highlight text with high accuracy. Supports highlighting:

- **Whole sentences** (multi-word spans)
- **Individual words**

No zoom support required — highlights drawn at current scale.

## Commands

```bash
npm run build               # Production build (typecheck + bundle)
npm run dev                 # Dev server at localhost:5173
npm run format              # Prettier format
npm run format:check        # Prettier check
npm run lint                # ESLint check
npm run lint:fix            # ESLint auto-fix
npm run test                # Vitest once
npm run test:watch          # Vitest watch mode
npm run test:coverage       # Coverage (80% threshold)
npm run typecheck           # TypeScript only
npm run e2e                 # Playwright E2E
npm run e2e:ui              # Playwright UI mode
```

## Project Structure

```
src/
├── components/
│   ├── layout/     # Page structure (Header)
│   ├── shared/     # Feature components (ErrorBoundary)
│   ├── pdf/        # PDF viewer, overlay, highlight components
│   └── ui/         # Primitives (Button, Spinner) - shadcn/ui
├── lib/            # config, utils, pdf helpers
└── test/           # Test utilities

e2e/tests/          # Playwright E2E tests
```

## Key Libraries

- **pdfjs-dist** — PDF rendering (canvas + text layer)
- **React 19** + **TypeScript** — UI framework
- **Vite 7** — Build tool
- **Tailwind CSS 4** — Styling
- **Zustand** — State management
- **Shadcn/UI** — UI primitives

## Code Patterns

**Imports**: Always use `@/` path alias

**Components**: Named exports + `Props` interface. Pages use default exports for lazy loading.

**TypeScript**: `type` for unions, `interface` for objects

**State hierarchy**: Zustand (persisted) → Context (UI) → useState (local)

See [docs/CODING_STANDARDS.md](docs/CODING_STANDARDS.md).

## PDF.js Integration Notes

- Use `pdfjs-dist` directly from npm — no wrapper libraries
- Set the worker source via `pdfjsLib.GlobalWorkerOptions.workerSrc`
- Render pipeline: canvas layer → text layer → **custom highlight overlay**
- The highlight overlay is an absolutely-positioned div above the text layer
- Use `page.getTextContent()` to get text items with positions/transforms
- Map text items to viewport coordinates using `pdfjsLib.Util.transform`
- Highlights are drawn as semi-transparent rectangles matching text item bounding boxes

## UI Components (Shadcn/UI)

Components live in `src/components/ui/`. Import directly (no barrel exports for UI):

```tsx
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
```

## MCP Servers (PREFER OVER WebSearch)

### Shadcn MCP (UI Components)

| Need                | Tool                                             |
| ------------------- | ------------------------------------------------ |
| Find component      | `mcp__shadcn__search_items_in_registries`        |
| View component code | `mcp__shadcn__view_items_in_registries`          |
| Usage examples      | `mcp__shadcn__get_item_examples_from_registries` |
| CLI add command     | `mcp__shadcn__get_add_command_for_items`         |

### Context7 MCP (All Libraries)

Use for **any npm package** documentation:

```
resolve-library-id → get-library-docs
```

## Testing

Unit tests are **co-located** with source files (`*.test.ts/tsx`). 80% coverage required.

```typescript
import { describe, it, expect, vi } from 'vitest';
import { screen, renderHook } from '@testing-library/react';
import { render } from '@/test';
```

## Common Gotchas

1. **Node.js >= 22.0.0** required (check `.nvmrc`)
2. **Barrel exports** in each directory via `index.ts`
3. **UI components** import directly: `@/components/ui/button` (no barrel)
4. **PDF.js worker** must be configured before loading any document
5. **pdfjs-dist** ships its own types — no `@types/` package needed
