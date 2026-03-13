# PDF Rendering

**Added:** 2026-03-13

## Overview

This feature renders a PDF page with `pdfjs-dist` using a layered viewer structure: canvas for visible content, hidden text layer for DOM-addressable text, and an overlay layer for highlights. The rendering path is width-aware, so pages fit the viewer container while preserving text-layer alignment.

## How It Works

1. Worker setup is centralized in `src/lib/pdfWorker.ts` so every call site uses the same `pdfjsLib` instance with `GlobalWorkerOptions.workerSrc` configured.
2. `usePdfDocument` in `src/hooks/usePdfDocument.ts` loads `PDFDocumentProxy` from a URL, exposes loading/error/retry state, and destroys the loading task on cleanup.
3. `useObservedWidth` in `src/hooks/useObservedWidth.ts` tracks container width with `ResizeObserver`; this width drives page scale.
4. `usePdfPage` in `src/hooks/usePdfPage.ts` renders one page:
   - reads the unscaled viewport (`scale: 1`)
   - computes `scale = containerWidth / unscaledViewport.width`
   - renders canvas with HiDPI-aware sizing
   - renders PDF.js `TextLayer` into the text-layer container
   - flips `textLayerReady` only after text-layer render completes
5. `PdfViewer` in `src/components/pdf/PdfViewer.tsx` composes loading/error states, page navigation, and the layer stack:
   - `canvas` (visible content)
   - text layer (`opacity: 0`, still present in DOM)
   - `HighlightOverlay` (top layer)

## Key Files

- `src/lib/pdfWorker.ts` -- PDF.js worker bootstrap and shared `pdfjsLib` export.
- `src/hooks/usePdfDocument.ts` -- document loading state machine and retry API.
- `src/hooks/useObservedWidth.ts` -- container width observation for fit-to-width rendering.
- `src/hooks/usePdfPage.ts` -- page-level canvas + text-layer render lifecycle.
- `src/components/pdf/PdfViewer.tsx` -- viewer orchestration, page controls, and layer composition.

## Important Notes

- Rendering is skipped until `document`, refs, and `containerWidth > 0` are all ready.
- Render cancellation is explicit (`renderTask.cancel()`, `TextLayer.cancel()`) to avoid stale updates during page changes.
- Text layer is intentionally hidden visually, but remains DOM-backed for text mapping and Range-based highlight extraction.
