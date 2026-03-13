# Architecture

## Project Goal

PDF text highlighting proof-of-concept. The app renders a PDF using `pdfjs-dist` and adds a **custom overlay layer** above native PDF.js canvas/text layers to highlight individual words and whole sentences with high accuracy.

**Current state**: The core PDF + TTS highlighting pipeline is implemented. `PdfViewer` renders PDF pages with a hidden text layer, text is mapped into CharMap/segments for lookup, highlights are drawn through a custom overlay, and playback is synchronized via Web Speech API + Zustand.

## Tech Stack

| Layer      | Technology                              | Status                   |
| ---------- | --------------------------------------- | ------------------------ |
| Framework  | React 19 + TypeScript 5.9               | Installed                |
| Build      | Vite 7 + `@vitejs/plugin-react`         | Installed                |
| Styling    | Tailwind CSS 4 + CVA + `tailwind-merge` | Installed                |
| State      | Zustand 5                               | Installed, active store  |
| UI         | Shadcn/UI primitives (Radix UI + CVA)   | Installed                |
| Icons      | Lucide React                            | Installed                |
| PDF        | `pdfjs-dist`                            | Installed and integrated |
| Testing    | Vitest + Testing Library + Playwright   | Installed                |
| Deployment | Netlify via GitHub Actions              | Configured               |

## Source Layout

```
src/
├── components/
│   ├── layout/     # Page chrome (Header)
│   ├── shared/     # App-wide feature components (ErrorBoundary)
│   ├── pdf/        # PDF viewer, highlight overlay, and TTS controls
│   └── ui/         # Shadcn/UI primitives — DO NOT edit directly
├── hooks/          # Shared hooks for PDF rendering, mapping, and TTS
├── lib/            # Pure utilities (pdf worker, mapping, progress, helpers)
├── stores/         # Zustand stores (TTS playback state)
└── test/           # Test helpers only — not application code
```

**Rules:**

- New feature components → `components/shared/` or a new feature folder
- New UI primitives (shadcn) → `components/ui/`
- Pure functions, helpers → `lib/`
- Custom hooks → co-locate next to the component that owns them, or add a `hooks/` directory if shared across multiple components
- No application logic in `test/`

## Component Hierarchy (current)

```
main.tsx
└── StrictMode
    └── App
        ├── SkipLink
        ├── Header
        └── <main id="main">
            └── ErrorBoundary
                └── PdfViewer
                    ├── PageNavigation
                    ├── canvas + textLayer
                    ├── HighlightOverlay
                    └── TtsControls
```

## PDF.js Rendering Pipeline

Current layer order:

```
<PdfViewer>
  ├── <canvas>           ← PDF.js renders page content here
  ├── .textLayer         ← PDF.js text layer (invisible, enables selection)
  └── .highlightOverlay  ← custom absolutely-positioned div above text layer
```

Key constraints:

- Use `pdfjs-dist` directly from npm — no wrapper libraries
- Set worker: `pdfjsLib.GlobalWorkerOptions.workerSrc = ...` before loading any document
- Keep text layer in DOM (hidden via opacity) so Range-based rectangle extraction remains possible
- Compute highlight rectangles from DOM `Range.getClientRects()` over mapped character ranges
- No zoom support required — highlights at current scale only

## State Management

Follow this hierarchy — use the simplest option that works:

1. **`useState`** — component-local, ephemeral UI state
2. **React Context** — state shared across a component subtree (e.g., PDF viewer context)
3. **Zustand** — global state that must persist across unmounts or be accessible from many places

Zustand stores live in `src/stores/`. Wrap stores with `createSelectors` from `@/lib/createSelectors` for performant per-property subscriptions.

No runtime localStorage usage is currently wired in the app.

## Build

- **Path alias**: `@` → `./src` (use in all imports)
- **Chunks**: `vendor` (react/react-dom), `ui` (radix-ui, cva) — manual split keeps main bundle smaller
- **Sourcemaps**: disabled in production unless `VITE_SOURCEMAP=true`
- **Tailwind**: processed by `@tailwindcss/vite` — no PostCSS config needed

## Environment Variables

Defined in `src/vite-env.d.ts`. Access via `src/lib/config.ts`, never via raw `import.meta.env` in components.

| Variable        | Purpose            |
| --------------- | ------------------ |
| `VITE_APP_NAME` | Displayed app name |
