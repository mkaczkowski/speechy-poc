# E2E Testing

## Overview

End-to-end tests use **Playwright** targeting Desktop Chrome. Tests start the dev server automatically.

## Running Tests

```bash
npm run e2e          # Default profile (Desktop Chrome)
npm run e2e:ui       # Interactive UI mode — use for debugging
```

## Configuration (`playwright.config.ts`)

| Setting        | Local                | CI                 |
| -------------- | -------------------- | ------------------ |
| Workers        | Unlimited (parallel) | 1 (serial)         |
| Retries        | 0                    | 2                  |
| Reporter       | list + HTML          | GitHub annotations |
| Screenshots    | Only on failure      | Only on failure    |
| Traces         | On first retry       | On first retry     |
| Expect timeout | 10s                  | 10s                |

**CI installs Chromium only** — tests run on Desktop Chrome.

### Dev Server

Auto-starts `npm run dev` at `http://localhost:5173`. Locally, reuses an already-running server. In CI, always starts fresh and serves the pre-built `dist/`.

## Test Structure

```
e2e/
└── tests/
    ├── home.spec.ts        ← page structure, accessibility
    └── pdf.spec.ts         ← add here when PDF features land
```

## Patterns

### Page Test

```ts
import { expect, test } from '@playwright/test';

test.describe('PDF Viewer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('renders PDF canvas', async ({ page }) => {
    await expect(page.locator('canvas')).toBeVisible();
  });
});
```

### Selector Priority

Use semantic selectors — they survive refactors and verify accessibility at the same time:

```ts
// Preferred
page.getByRole('heading', { name: /speechy/i });
page.getByRole('button', { name: /highlight/i });
page.getByLabel('Page number');

// Acceptable for structural elements
page.getByRole('banner'); // <header>
page.getByRole('main'); // <main>

// Only for IDs / scroll targets
page.locator('#main');

// Avoid — brittle
page.locator('.highlight-overlay');
page.locator('div > span:nth-child(2)');
```

### Checking Highlight Overlays

Highlight rectangles are positioned `div` elements. Test their presence and approximate position, not exact pixels:

```ts
const highlight = page.locator('[data-highlight]').first();
await expect(highlight).toBeVisible();

const box = await highlight.boundingBox();
expect(box).not.toBeNull();
expect(box!.width).toBeGreaterThan(0);
```

## CI Integration

E2E runs after `build` succeeds. The `dist/` artifact from the build job is downloaded and served statically. Playwright browser binaries are cached by version to speed up runs. Reports upload as artifacts on failure.
