# Coding Standards

## Imports

Always use `@/` path alias. Order: external → internal → types.

```tsx
import { useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { HighlightRect } from './types';
```

**Never use relative `../` paths across feature boundaries.** Relative imports are fine within the same directory (e.g., `./spinner`).

## File & Directory Naming

| What                 | Convention | Example                       |
| -------------------- | ---------- | ----------------------------- |
| Shadcn/UI primitives | lowercase  | `button.tsx`, `spinner.tsx`   |
| Feature components   | PascalCase | `PdfViewer.tsx`, `Header.tsx` |
| Hooks                | camelCase  | `usePdfDocument.ts`           |
| Utilities / helpers  | camelCase  | `pdfWorker.ts`, `textMapping.ts` |
| Test files           | same name  | `PdfViewer.test.tsx`          |
| Type-only files      | camelCase  | `types.ts`                    |

**No kebab-case file names.** Use camelCase for all non-component files (`usePdfDocument.ts`, not `use-pdf-document.ts`; `pdfWorker.ts`, not `pdf-worker.ts`). Use PascalCase for component files (`PdfViewer.tsx`, not `pdf-viewer.tsx`).

Each feature directory gets a barrel `index.ts` for public exports (except `ui/`).

## TypeScript

- `interface` for component props and object shapes
- `type` for unions, aliases, and derived/mapped types
- Never use `any` — use `unknown` for truly unknown input, then narrow

```tsx
// Props and shapes → interface
interface PdfViewerProps {
  url: string;
  highlights?: HighlightRect[];
}

// Unions and derived types → type
type HighlightMode = 'word' | 'sentence';
```

## Exports

- **Named exports** for everything — components, hooks, utilities, types
- **Default export** only for `App.tsx` (entry point convention, enables future lazy loading)
- **Barrel `index.ts`** for `layout/`, `shared/`, `lib/`, `stores/`, `hooks/`
- **No barrel for `ui/`** — import primitives directly:

```tsx
// Correct
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

// Wrong — ui/ has no barrel
import { Button } from '@/components/ui';
```

## Component Pattern

```tsx
interface PdfPageProps {
  pageNumber: number;
  scale?: number;
}

export function PdfPage({ pageNumber, scale = 1 }: PdfPageProps) {
  return <canvas data-page={pageNumber} />;
}
```

- Props interface named `{ComponentName}Props`
- Destructure props in the function signature with defaults
- Use `cn()` for all conditional className logic

## Styling

```tsx
// Merge classes and handle conditionals
<div className={cn('base-class', isActive && 'ring-2', className)} />;

// Variants → use CVA (see button.tsx, spinner.tsx as examples)
const variants = cva('base', {
  variants: { size: { sm: 'text-sm', lg: 'text-lg' } },
  defaultVariants: { size: 'sm' },
});
```

- Tailwind classes are auto-sorted by Prettier on save — don't manually order them
- `cn()` from `@/lib/utils` handles class conflicts correctly (later wins via tailwind-merge)
- Never write inline `style={{}}` for things Tailwind can express

## Canvas & PDF Patterns

When working with PDF.js canvas rendering:

- Use `useRef<HTMLCanvasElement>` — never query canvas via `document.querySelector`
- Run canvas operations inside `useEffect` with proper cleanup
- PDF.js render tasks return a promise — cancel on unmount with `renderTask.cancel()`
- All coordinate math uses PDF.js viewport transforms — never hardcode pixel values

```tsx
const canvasRef = useRef<HTMLCanvasElement>(null);

useEffect(() => {
  const renderTask = page.render({ canvasContext: ctx, viewport });
  return () => {
    renderTask.cancel();
  };
}, [page, viewport]);
```

## State

| When to use            | How                                   |
| ---------------------- | ------------------------------------- |
| Local UI toggle        | `useState`                            |
| Derived value          | `useMemo`                             |
| Subtree sharing        | React Context                         |
| Global / cross-feature | Zustand store via `createSelectors`   |
| Persistence            | Add only when a feature requires durable client state |

Never lift state higher than necessary.

For Zustand store access:

- Render-time reads: use generated selectors (for example `useTtsStore.use.rate()`).
- Imperative actions (event handlers, effect callbacks, tests): call actions via `useTtsStore.getState().action(...)`.
- Avoid `getState()` reads inside render logic because they are non-reactive.

## Common Anti-patterns to Avoid

- ❌ `import.meta.env.VITE_*` directly in components — use `config` from `@/lib/config`
- ❌ `any` type — use `unknown` + type guard
- ❌ Multiple `useEffect` for a single concern — consolidate
- ❌ Inline `style={{}}` for layout — use Tailwind
- ❌ `document.getElementById` — use refs
- ❌ Importing from `@/components/ui` barrel (doesn't exist)
- ❌ Skipping the `Props` interface — always define it even for simple components
