# Text Extraction and Mapping

**Added:** 2026-03-13

## Overview

This feature turns rendered PDF text-layer DOM into a character-indexed model that powers sentence/word lookup and highlight rectangle generation. It is the alignment layer between browser speech events (`charIndex`) and on-screen text geometry.

## How It Works

1. `useTextMapping` (`src/hooks/useTextMapping.ts`) waits for `textLayerReady`, then schedules deferred work (`requestIdleCallback` with timeout fallback) to avoid blocking render.
2. `buildCharMap` (`src/lib/textMapping.ts`) walks all text nodes with `TreeWalker` and builds:
   - `flatText`: normalized text for indexing
   - `entries`: char index -> `{ node, offsetInNode }`
   - `nodeOffsetIndex`: reverse index for fast node/offset -> char lookup
3. Normalization inserts one synthetic space between sibling text nodes so segmentation and speech boundaries align with human-readable text flow.
4. `segmentText` (`src/lib/textMapping.ts`) splits `flatText` into sentence/word ranges:
   - primary path: `Intl.Segmenter('en', { granularity: 'sentence' | 'word' })`
   - fallback: regex-based segmentation when `Intl.Segmenter` is unavailable
5. `computeHighlightRects` (`src/lib/textMapping.ts`) converts a char range into DOM rectangles using `Range.setStart/setEnd` + `getClientRects`, then rewrites coordinates relative to the viewer container.

## Key Files

- `src/lib/textMapping.ts` -- core char-map building, segmentation, range-to-rect mapping, and binary-search lookup.
- `src/hooks/useTextMapping.ts` -- text-layer-ready gating and deferred mapping execution.
- `src/types/pdf.ts` -- shared mapping/segment/rect types.

## Edge Cases

- Invalid ranges (`start >= end`, out-of-bounds indices, negative inputs) return empty rect arrays.
- `findSegmentIndex` can return `-1` when `charIndex` lands in non-segment gaps (for example, normalized spaces).
- If `textLayerReady` flips back to `false` before deferred mapping runs, scheduled work is cancelled and mapping state is cleared.
