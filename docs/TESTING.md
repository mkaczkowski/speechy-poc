# Testing

## Overview

Unit and component tests use **Vitest** with **jsdom** and **Testing Library**. Tests are co-located with source files. 80% coverage is enforced on CI.

## Running Tests

```bash
npm run test              # Run once
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage report
```

## Configuration (`vitest.config.ts`)

- **Environment**: jsdom
- **Globals**: `describe`, `it`, `expect`, `beforeEach`, `afterEach` are available globally — no import needed. **`vi` still requires an explicit import** from `'vitest'`.
- **Auto-restore**: `restoreMocks: true` — all `vi.spyOn` calls are automatically restored after each test. Do not manually restore spies.
- **Auto-clear**: `clearMocks: true` — mock call history is reset between tests.
- **Setup file**: `src/test-setup.ts` runs before every test file.
- **Pattern**: `src/**/*.test.{ts,tsx}`

### Coverage Thresholds (all at 80%)

Excluded from coverage: test files, `index.ts` barrels, `src/components/ui/`, `src/test/`.

## Test Setup (`src/test-setup.ts`)

Always active — no imports needed in test files:

- `@testing-library/jest-dom` matchers (e.g., `toBeInTheDocument`, `toBeVisible`)
- `ResizeObserver` stub
- `window.matchMedia` stub
- `window.scrollTo` stub

## Test Utilities (`src/test/`)

```tsx
import { render } from '@/test';
import { silenceConsoleError, mockMatchMedia } from '@/test';
```

### `render(ui, options?)`

Wraps the component in `AllProviders`. Add providers to `src/test/providers.tsx` as the app gains contexts/stores. Use this instead of `@testing-library/react`'s `render` directly.

### Available Mocks

| Import                         | Purpose                                      |
| ------------------------------ | -------------------------------------------- |
| `silenceConsoleError()`        | Suppress expected `console.error` output     |
| `silenceConsoleWarn()`         | Suppress expected `console.warn` output      |
| `silenceConsoleLog()`          | Suppress `console.log` output                |
| `mockMatchMedia(matches)`      | Return controllable `window.matchMedia` mock |
| `mockAnimationFrame()`         | Control `requestAnimationFrame` manually     |
| `mockScrollTo()`               | Spy on `window.scrollTo` calls               |

## Patterns

### Unit Test

```tsx
import { vi } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn utility', () => {
  it('last class wins on conflict', () => {
    expect(cn('px-4', 'px-8')).toBe('px-8');
  });
});
```

### Component Test

```tsx
import { screen } from '@testing-library/react';
import { render } from '@/test';
import { Header } from '@/components/layout';

describe('Header', () => {
  it('renders the app title', () => {
    render(<Header />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});
```

### Testing with Expected Console Errors

When testing error paths that trigger `console.error` (e.g., ErrorBoundary), silence the output with a spy. With `restoreMocks: true`, no teardown needed:

```tsx
import { vi } from 'vitest';
import { silenceConsoleError } from '@/test';

it('renders fallback on uncaught error', () => {
  silenceConsoleError(); // auto-restored after test
  render(
    <ErrorBoundary>
      <ThrowingComponent />
    </ErrorBoundary>,
  );
  expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
});
```

### Zustand Store Test

```tsx
import { vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

describe('useHighlightStore', () => {
  beforeEach(() => {
    useHighlightStore.setState({ highlights: [] });
  });

  it('adds a highlight', () => {
    const { result } = renderHook(() => useHighlightStore.use.highlights());
    expect(result.current).toHaveLength(0);

    act(() => useHighlightStore.getState().addHighlight(mockHighlight));
    expect(result.current).toHaveLength(1);
  });
});
```

Reset store state in `beforeEach` via `setState` to avoid test bleed.

### Parameterized Tests

```tsx
it.each([
  { input: 'hello world', expected: 2 },
  { input: 'one', expected: 1 },
])('counts $expected words in "$input"', ({ input, expected }) => {
  expect(countWords(input)).toBe(expected);
});
```

### Canvas / PDF Tests

Canvas is not rendered by jsdom. For components that use canvas:

```tsx
import { vi } from 'vitest';

beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    // add only the methods your code calls
  });
});
```

Test behaviour (highlight positions added, render called) rather than pixel output.

## File Placement

Co-locate test files with the file under test:

```
src/components/pdf/PdfViewer.tsx
src/components/pdf/PdfViewer.test.tsx   ← here
src/lib/pdfUtils.ts
src/lib/pdfUtils.test.ts                ← here
```
