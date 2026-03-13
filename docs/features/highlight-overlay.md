# Highlight Overlay

**Added:** 2026-03-13

## Overview

This feature renders a custom highlight layer above the PDF text layer and keeps it synchronized with active TTS sentence/word indices. Sentence highlights provide broader reading context while word highlights track the exact spoken token.

## How It Works

1. `useHighlightSync` (`src/hooks/useHighlightSync.ts`) subscribes to TTS store state (`currentSentenceIndex`, `currentWordIndex`, `isPlaying`, `isPaused`).
2. For active indices, it computes rectangle arrays with `computeHighlightRects` (`src/lib/textMapping.ts`) against sentence and word ranges from `segments`.
3. A container-rect observer (`ResizeObserver` + `requestAnimationFrame`) keeps coordinate translation stable when the viewer resizes.
4. `HighlightOverlay` (`src/components/pdf/HighlightOverlay.tsx`) receives computed `sentenceRects` and `wordRects` and renders absolute-positioned highlight `<div>` elements:
   - sentence: `bg-yellow-200/40`
   - word: `bg-blue-400/50`
5. Auto-scroll behavior keeps reading context visible:
   - on sentence index change during active playback
   - when playback resumes from paused state

## Key Files

- `src/hooks/useHighlightSync.ts` -- computes active sentence/word rectangles and handles auto-scroll triggers.
- `src/components/pdf/HighlightOverlay.tsx` -- presentational overlay renderer for sentence/word rects.
- `src/lib/textMapping.ts` -- `computeHighlightRects` Range API geometry extraction.
- `src/stores/ttsStore.ts` -- source of active playback indices and play/pause flags.
- `src/components/pdf/PdfViewer.tsx` -- mounts overlay above text layer and passes sync outputs.

## Important Notes

- Overlay container is `pointer-events: none`, so it never blocks text-layer interactions.
- Overlay returns `null` when both rect arrays are empty, avoiding extra DOM churn.
- Rect rendering is gated by `isPlaying`; highlights remain visible while paused and clear when playback stops/resets.
