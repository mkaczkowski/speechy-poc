# API Reference

## Lib Utilities

Import from the barrel or directly — both work:

```tsx
import { cn } from '@/lib/utils'; // direct
import { cn, createSelectors } from '@/lib'; // barrel
```

---

### `cn(...inputs: ClassValue[]): string`

Merges Tailwind CSS classes. Later conflicting classes win (`tailwind-merge` semantics):

```tsx
cn('px-4', 'px-8'); // → 'px-8'
cn('text-red-500', isError && 'text-red-500', className);
cn('flex items-center', { 'opacity-50': disabled });
```

Import: `@/lib/utils` or `@/lib`

---

### `config`

Centralised app configuration. **Always import this instead of reading `import.meta.env` directly in components.**

```tsx
import { config } from '@/lib/config';

config.appName; // → VITE_APP_NAME || 'Speechy'
```

---

### `createSelectors(store)`

Extends a Zustand store with granular per-key selector hooks. Use this for every store — it prevents unnecessary re-renders for render-time reads.

- `store.use.*` selectors are intended for reactive reads in React render paths.
- `store.getState().action(...)` is preferred for imperative writes in event handlers and effect callbacks.
- Selectors are generated for all top-level keys (state fields and actions).

```tsx
import { create } from 'zustand';
import { createSelectors } from '@/lib/createSelectors';

interface HighlightState {
  highlights: Rect[];
  addHighlight: (r: Rect) => void;
}

const useHighlightStoreBase = create<HighlightState>()((set) => ({
  highlights: [],
  addHighlight: (r) => set((s) => ({ highlights: [...s.highlights, r] })),
}));

export const useHighlightStore = createSelectors(useHighlightStoreBase);

// In components — each selector subscribes independently:
const highlights = useHighlightStore.use.highlights();

// In handlers/callbacks — invoke actions imperatively:
const addHighlight = (rect: Rect) => useHighlightStore.getState().addHighlight(rect);
```

---

## UI Components

**Always import directly — `src/components/ui/` has no barrel export:**

```tsx
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { SkipLink } from '@/components/ui/visually-hidden';
```

---

### Button

```tsx
<Button variant="default" size="default" onClick={handler}>
  Click me
</Button>

// Render as another element (e.g. anchor)
<Button asChild>
  <a href="/path">Link styled as button</a>
</Button>
```

| Prop      | Options                                                      |
| --------- | ------------------------------------------------------------ |
| `variant` | `default` `destructive` `outline` `secondary` `ghost` `link` |
| `size`    | `default` `sm` `lg` `icon` `icon-sm` `touch` `icon-touch`    |
| `asChild` | Renders via Radix `Slot` — child becomes the root element    |

---

### Spinner

Animated SVG — use for loading states within buttons, overlays, or as a standalone indicator.

```tsx
<Spinner />
<Spinner size="sm" />
```

| Prop   | Options                  |
| ------ | ------------------------ |
| `size` | `sm` `default` `lg` `xl` |

---

### SkipLink

```tsx
// Already rendered in App.tsx — links to <main id="main">
<SkipLink />
```

---

## Shared Components

### ErrorBoundary

Class component — must wrap async/render-throwing subtrees. Renders a recovery UI by default.

```tsx
import { ErrorBoundary } from '@/components/shared';

<ErrorBoundary>
  <PdfViewer />
</ErrorBoundary>

// With custom fallback
<ErrorBoundary fallback={<p>PDF failed to load.</p>}>
  <PdfViewer />
</ErrorBoundary>

// With callbacks
<ErrorBoundary
  onError={(error, info) => reportError(error, info)}
  onReset={() => resetPdfState()}
>
  <PdfViewer />
</ErrorBoundary>
```

Default fallback shows error message, "Try Again" (calls `reset()`), and "Reload Page" buttons.

---

## Layout Components

### Header

Reads `config.appName` and renders it as an `<h1>` inside a `<header>` landmark.

```tsx
import { Header } from '@/components/layout';

<Header />;
```
