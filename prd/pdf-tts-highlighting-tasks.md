# PDF Text-to-Speech Highlighting — Task Breakdown

## Story Point Scale

| Points | Effort    | Example                               |
| ------ | --------- | ------------------------------------- |
| 1      | < 2 hours | Add a barrel export, type definition  |
| 2      | 2-4 hours | Simple hook, Zustand store            |
| 3      | 4-8 hours | Component with tests, hook with logic |
| 5      | 1-2 days  | Feature integration, complex hook     |
| 8      | 2-3 days  | Multi-component integration           |

## Phase Overview

| Phase | Name                      | Objective                                                         | Key Tasks     | Points | Status |
| ----- | ------------------------- | ----------------------------------------------------------------- | ------------- | ------ | ------ |
| 0     | Setup & Infrastructure    | Install pdfjs-dist, configure worker, sample PDF, Vite chunks     | 0.1, 0.2      | 3      | ✅     |
| 1     | PDF Rendering             | Canvas + text layer rendering with loading/error states           | 1.1, 1.2, 1.3 | 9      | ✅     |
| 2     | Text Extraction & Mapping | CharMap from text layer DOM, segmentation, highlight rects        | 2.1, 2.2      | 6      | ✅     |
| 3     | TTS Engine                | Zustand store, Web Speech API hook, boundary event handling       | 3.1, 3.2      | 5      | ✅     |
| 4     | Highlight Overlay         | Connect TTS state to highlight rects, render overlay, auto-scroll | 4.1, 4.2      | 5      | ✅     |
| 5     | UI Controls & Integration | Sticky bottom TTS controls, App.tsx integration, click-to-start   | 5.1, 5.2, 5.3 | 10     |        |
| 6     | Documentation             | Decision records, feature docs, index updates                     | 6.1, 6.2      | 3      |        |
|       |                           | **Total**                                                         |               | **41** |        |

---

## Phase 0: Setup & Infrastructure ✅ COMPLETED

**Phase objective:** Install dependencies, configure PDF.js worker, generate sample PDF, update Vite config.

### Task 0.1: Install pdfjs-dist & Configure Worker ✅

**Description:**
Install `pdfjs-dist` from npm. Create `src/lib/pdfWorker.ts` that sets `GlobalWorkerOptions.work

**Deliverables:**

- `package.json`:
  - `pdfjs-dist` added to dependencies
- `src/lib/pdfWorker.ts`:
  - Sets `pdfjsLib.GlobalWorkerOptions.workerSrc` via `new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString()`
  - Exports configured `pdfjsLib` for use by other modules
- `src/lib/index.ts`:
  - Add barrel export for `pdfWorker`
- `vite.config.ts`:
  - Add `'pdfjs-dist'` to `manualChunks` as a `pdfjs` chunk
- `src/index.css` (or appropriate CSS entry):
  - Import `pdfjs-dist/web/pdf_viewer.css` for text layer styles

**Acceptance Criteria:**

- [x] `npm install` succeeds with `pdfjs-dist` resolved
- [x] `pdfWorker.ts` correctly configures worker source before any PDF loading
- [x] Text layer CSS is imported globally
- [x] `npm run build` produces a separate `pdfjs` chunk
- [x] `npm run typecheck` passes

**Dependencies:** None

**Risk:** Medium — Worker path resolution varies by pdfjs-dist version. Must verify the exact `.mjs` path after install.

**Implementation notes:**

- Worker path confirmed: `pdfjs-dist/build/pdf.worker.mjs` exists in installed version
- The `pdfjs` chunk is empty in build output until Phase 1 imports `pdfjsLib` in a rendered component — this is expected since tree-shaking removes the unused re-export
- `pdf_viewer.css` imported in `src/index.css` alongside other global CSS imports
- `jspdf` added as devDependency for PDF generation script

---

### Task 0.2: Generate Sample PDF ✅

**Description:**
Generate a sample PDF (`public/sample.pdf`). The PDF should be 2-3 pages, text-heavy, with multiple paragraphs and varied sentence lengths to exercise multi-word and multi-line highlighting and multi-page navigation.

**Deliverables:**

- `public/sample.pdf`:
  - 2 pages of English prose (AI history topic)
  - Helvetica font, 12pt
  - 12 paragraphs with varied sentence lengths
  - Suitable for testing word/sentence segmentation and multi-page navigation
- `scripts/generate-sample-pdf.mjs`:
  - Reusable Node.js script using `jspdf` to regenerate the PDF
  - Usage: `node scripts/generate-sample-pdf.mjs [output-path]`

**Acceptance Criteria:**

- [x] PDF loads in browser at `http://localhost:5173/sample.pdf`
- [x] Contains at least 2 pages of text
- [x] Text is selectable (not rasterized)
- [x] File size under 100KB (actual: 9.1 KB)

**Dependencies:** None

**Risk:** Low — Straightforward file generation.

**Implementation notes:**

- Used real English prose instead of Lorem Ipsum (content filtering blocks Lorem Ipsum generation via AI APIs)
- PDF generated with `jspdf` (devDependency) via `scripts/generate-sample-pdf.mjs` — rerun to regenerate
- A4 format, 20mm margins, 1.5x line height for readability

---

## Phase 1: PDF Rendering ✅ COMPLETED

**Phase objective:** Render PDF page on canvas with text layer overlay, loading/error states, fit-to-container-width scaling, and page navigation.

### Task 1.1: PDF Types & Document Loading Hook ✅

**Description:**
Define shared TypeScript interfaces for PDF-related data structures. Create `usePdfDocument` hook that loads a `PDFDocumentProxy` from a URL using `pdfjs-dist`, with loading/error state management.

**Deliverables:**

- `src/types/pdf.ts`:
  - `interface CharMapEntry` — `{ node: Text; offsetInNode: number }`
  - `interface CharMap` — `{ flatText: string; entries: CharMapEntry[] }`
  - `interface TextSegment` — `{ text: string; startChar: number; endChar: number }`
  - `interface SentenceSegment extends TextSegment`
  - `interface WordSegment extends TextSegment`
  - `interface SegmentedText` — `{ sentences: SentenceSegment[]; words: WordSegment[] }`
  - `interface HighlightRect` — `{ left: number; top: number; width: number; height: number }`
- `src/types/index.ts`:
  - Barrel export
- `src/hooks/usePdfDocument.ts`:
  - Takes `url: string`
  - Returns `{ document: PDFDocumentProxy | null; numPages: number; isLoading: boolean; error: Error | null }`
  - Calls `pdfjsLib.getDocument(url).promise`
  - Cleans up document on unmount via `document.destroy()`
  - Handles fetch errors gracefully
- `src/hooks/usePdfDocument.test.ts`:
  - Tests: loading state, successful load, error handling, cleanup on unmount
  - Mock `pdfjsLib.getDocument`
- `src/hooks/index.ts`:
  - Barrel export

**Acceptance Criteria:**

- [x] Hook correctly transitions through loading → loaded states
- [x] Error state is set when PDF URL is invalid or fetch fails
- [x] `PDFDocumentProxy` is destroyed on unmount (no memory leak)
- [x] `numPages` reflects the actual PDF page count
- [x] All unit tests pass with 80%+ coverage
- [x] `npm run typecheck` passes

**Dependencies:** Task 0.1

**Risk:** Low — Standard async data loading pattern.

**Implementation notes:**

- Used `useReducer` instead of multiple `useState` calls to satisfy `react-hooks/set-state-in-effect` lint rule (no synchronous setState in effect body)
- `SentenceSegment` and `WordSegment` changed from empty `interface extends` to `type` aliases to satisfy `@typescript-eslint/no-empty-object-type`

---

### Task 1.2: PDF Page Rendering Hook ✅

**Description:**
Create `usePdfPage` hook that renders a single PDF page to a canvas element and builds the text layer. Exposes a `textLayerReady` flag that flips to `true` once the text layer DOM is fully rendered. Supports fit-to-container-width scaling via a `containerWidth` parameter.

**Deliverables:**

- `src/hooks/usePdfPage.ts`:
  - Takes `{ document: PDFDocumentProxy | null; pageNumber: number; canvasRef: RefObject<HTMLCanvasElement>; textLayerRef: RefObject<HTMLDivElement>; containerWidth: number }`
  - Returns `{ textLayerReady: boolean; isRendering: boolean; error: Error | null }`
  - Computes scale: `containerWidth / page.getViewport({ scale: 1 }).width`
  - Renders canvas via `page.render({ canvasContext, viewport })`
  - Renders text layer via `pdfjsLib.renderTextLayer({ textContentSource, container, viewport })`
  - Cancels render task on unmount / re-render
  - Sets `textLayerReady = true` after text layer render completes
- `src/hooks/usePdfPage.test.ts`:
  - Tests: canvas render lifecycle, text layer ready flag, cleanup on unmount, re-render on page change
  - Mock PDF.js render methods
- `src/hooks/index.ts`:
  - Updated barrel export

**Acceptance Criteria:**

- [x] Canvas renders PDF page content at correct scale
- [x] Text layer spans are positioned to match canvas content
- [x] `textLayerReady` flips to `true` only after text layer render completes
- [x] Render task is cancelled on unmount (no stale renders)
- [x] Re-renders when `pageNumber` or `containerWidth` changes
- [x] All unit tests pass with 80%+ coverage

**Dependencies:** Task 1.1

**Risk:** Medium — Canvas rendering + text layer coordination requires careful lifecycle management. Render task cancellation on rapid page changes needs testing.

**Implementation notes:**

- Uses `new TextLayer({...}).render()` class API (not deprecated `renderTextLayer` function) — the current pdfjs-dist version uses `TextLayer` class
- `page.render()` now requires a `canvas` parameter in addition to `canvasContext` in the current pdfjs-dist version
- Also uses `useReducer` to avoid synchronous setState in effect body
- HiDPI support via `devicePixelRatio` scaling of canvas dimensions

---

### Task 1.3: PdfViewer Component ✅

**Description:**
Create the main `PdfViewer` orchestrator component that composes canvas, text layer, and (future) highlight overlay into a layered stack. Includes loading state (using `Spinner`), error state, and container width measurement for fit-to-width scaling. Includes page navigation (prev/next) for multi-page PDFs.

**Deliverables:**

- `src/components/pdf/PdfViewer.tsx`:
  - `interface PdfViewerProps` — `{ url: string }`
  - Uses `usePdfDocument` to load the document
  - Uses `usePdfPage` to render the current page
  - Measures container width via `ResizeObserver` or `useRef` + `clientWidth`
  - Layer stack: canvas (z-0) → text layer div (z-10, `opacity: 0`) → overlay slot (z-20, future)
  - Text layer div: `position: absolute`, `opacity: 0`, same dimensions as canvas
  - Loading: `Spinner` component centered in viewer area
  - Error: inline error message with retry option using `Button`
  - Page navigation: prev/next buttons with current page / total pages display
  - `data-testid` attributes for key elements
- `src/components/pdf/PdfViewer.test.tsx`:
  - Tests: loading state renders spinner, error state renders message, canvas rendered on success, page navigation updates page number
  - Mock `usePdfDocument` and `usePdfPage` hooks
- `src/components/pdf/index.ts`:
  - Barrel export for `PdfViewer`

**Acceptance Criteria:**

- [x] PDF renders with text visible on canvas
- [x] Text layer is invisible (`opacity: 0`) but present in DOM
- [x] Loading spinner shows while PDF loads
- [x] Error state shows message and retry button on failure
- [x] Container width is measured and passed to `usePdfPage` for fit-to-width
- [x] Page navigation works (prev/next with bounds checking)
- [x] Follows component guidelines (Props interface, named export, `cn()`, accessible)
- [x] All unit tests pass with 80%+ coverage

**Implementation notes:**

- PdfViewer not yet wired into App.tsx (deferred to Phase 5 per task spec)
- Overlay slot (z-20) left empty for Phase 4's HighlightOverlay
- Text layer has `textLayer` CSS class for pdfjs-dist text layer styles
- Navigation hidden for single-page PDFs
- `data-testid` attributes on all key elements for testing
- Uses `ResizeObserver` for container width measurement (mocked in test-setup.ts)

**Dependencies:** Task 1.1, Task 1.2

**Risk:** Low — Composition of existing hooks with standard React patterns.

---

## Phase 2: Text Extraction & Mapping ✅ COMPLETED

**Phase objective:** Build the character-to-DOM-node mapping from the text layer, segment text into sentences/words, and compute highlight rectangles via Range API.

### Task 2.1: Text Mapping Pure Functions ✅

**Description:**
Implement the core pure functions in `textMapping.ts`: `buildCharMap`, `segmentText`, `computeHighlightRects`, and `findSegmentIndex`. These are the most testable and critical layer — the entire highlight accuracy depends on them.

**Deliverables:**

- `src/lib/textMapping.ts`:
  - `buildCharMap(container: HTMLElement)` → `CharMap`
    - Uses `TreeWalker` over `TEXT_NODE`s within text layer spans
    - Maps every `charIndex` to `{ node: Text, offsetInNode }`
    - Inserts single space between spans (normalization)
    - Returns `{ flatText, entries }`
  - `segmentText(flatText: string)` → `SegmentedText`
    - Uses `Intl.Segmenter` with `granularity: 'sentence'` then `'word'`
    - Filters out non-word segments (punctuation, whitespace) from word list
    - Each segment: `{ text, startChar, endChar }`
    - Regex fallback for browsers without `Intl.Segmenter`
  - `computeHighlightRects(charMap: CharMap, startChar: number, endChar: number, containerEl: HTMLElement)` → `HighlightRect[]`
    - Creates DOM `Range` from `charMap.entries[startChar]` to `charMap.entries[endChar]`
    - Calls `range.getClientRects()` → converts to array
    - Offsets rects relative to `containerEl.getBoundingClientRect()`
    - Returns array of `{ left, top, width, height }`
  - `findSegmentIndex(segments: TextSegment[], charIndex: number)` → `number`
    - Binary search to find which segment contains `charIndex`
    - Returns `-1` if not found
  - `findCharIndex(charMap: CharMap, node: Text, offset: number)` → `number`
    - Reverse lookup: given a Text node and offset, find the corresponding charIndex
    - Linear scan of `charMap.entries` (small array)
    - Returns `-1` if not found
- `src/lib/textMapping.test.ts`:
  - `buildCharMap`: tests with mocked text layer DOM (multiple spans, empty spans, single span)
  - `segmentText`: tests with multi-sentence text, single word, punctuation handling
  - `findSegmentIndex`: tests with binary search edge cases (start, end, middle, out of range)
  - `findCharIndex`: tests with various node/offset combinations
  - `computeHighlightRects`: tests with mocked Range API (verify range is set correctly, rects are offset)
- `src/lib/index.ts`:
  - Updated barrel export

**Acceptance Criteria:**

- [x] `buildCharMap` produces correct `flatText` from multi-span text layer
- [x] Spaces are inserted between adjacent spans but not doubled
- [x] `segmentText` produces accurate sentence and word boundaries
- [x] `findSegmentIndex` binary search finds correct segment for any valid charIndex
- [x] `findCharIndex` reverse lookup works for any valid text node
- [x] `computeHighlightRects` offsets rects relative to container
- [x] All edge cases covered (empty container, single character, multi-line text)
- [x] All unit tests pass with 80%+ coverage

**Dependencies:** Task 0.1 (types)

**Risk:** Medium — TreeWalker behavior with edge-case DOM structures needs thorough testing. Range API mocking in jsdom requires careful setup.

**Implementation notes:**

- `computeHighlightRects` accepts an optional `containerRect` parameter for callers that already have a cached DOMRect — avoids redundant `getBoundingClientRect()` calls
- Synthetic charMap entries for inter-span spaces use `offsetInNode: -1` to distinguish them from real character entries
- `Intl.Segmenter` cached via module-level variables (`cachedSentenceSegmenter`/`cachedWordSegmenter`) to avoid re-instantiation
- Regex fallback handles edge case of text without punctuation by treating entire text as one sentence

---

### Task 2.2: Text Mapping Hook ✅

**Description:**
Create `useTextMapping` hook that runs `buildCharMap` + `segmentText` when the text layer becomes ready. Gates execution on the `textLayerReady` flag from `usePdfPage`.

**Deliverables:**

- `src/hooks/useTextMapping.ts`:
  - Takes `{ textLayerRef: RefObject<HTMLDivElement>; textLayerReady: boolean }`
  - Returns `{ charMap: CharMap | null; segments: SegmentedText | null }`
  - Runs `buildCharMap` → `segmentText` when `textLayerReady` flips to `true`
  - Resets when `textLayerReady` goes back to `false` (page change)
  - Uses `useMemo` or `useEffect` + state appropriately
- `src/hooks/useTextMapping.test.ts`:
  - Tests: mapping runs when `textLayerReady=true`, doesn't run when `false`, resets on page change
  - Mock `buildCharMap` and `segmentText`
- `src/hooks/index.ts`:
  - Updated barrel export

**Acceptance Criteria:**

- [x] CharMap and segments are `null` until text layer is ready
- [x] Mapping runs exactly once when `textLayerReady` flips to `true`
- [x] Previous mapping is cleared when text layer resets (page change)
- [x] All unit tests pass with 80%+ coverage

**Dependencies:** Task 1.2, Task 2.1

**Risk:** Low — Straightforward effect that depends on a boolean flag.

**Implementation notes:**

- Uses `useEffect` + `useState` (not `useMemo`) since mapping involves side-effect-like DOM traversal
- `textLayerRef` excluded from deps with eslint-disable — refs are stable by React contract
- 4 test cases cover: null when not ready, runs on ready flip, resets on page change, no re-run when staying true

---

## Phase 3: TTS Engine ✅ COMPLETED

**Phase objective:** Implement TTS state management and Web Speech API integration with boundary event tracking.

### Task 3.1: TTS Zustand Store ✅

**Description:**
Create a Zustand store for TTS playback state. Wraps with `createSelectors` for auto-generated per-property selector hooks. No persistence needed.

**Deliverables:**

- `src/stores/ttsStore.ts`:
  - State: `isPlaying: boolean`, `isPaused: boolean`, `currentCharIndex: number`, `currentWordIndex: number`, `currentSentenceIndex: number`, `rate: number`, `selectedVoice: SpeechSynthesisVoice | null`
  - Actions: `play()`, `pause()`, `resume()`, `stop()`, `setCurrentIndices(charIndex, wordIndex, sentenceIndex)`, `setRate(rate)`, `setSelectedVoice(voice)`, `reset()`
  - `play()` → `{ isPlaying: true, isPaused: false }`
  - `pause()` → `{ isPaused: true }`
  - `resume()` → `{ isPaused: false }`
  - `stop()` / `reset()` → all indices to `-1`, `isPlaying: false`, `isPaused: false`
  - Wrapped with `createSelectors`
- `src/stores/ttsStore.test.ts`:
  - Tests for all actions: state transitions, index updates, reset behavior
  - Uses `renderHook` pattern from TESTING.md
  - Resets store in `beforeEach`
- `src/stores/index.ts`:
  - Barrel export

**Acceptance Criteria:**

- [x] Store follows `createSelectors` pattern (e.g., `useTtsStore.use.isPlaying()`)
- [x] All state transitions are correct (play→pause→resume→stop)
- [x] `reset()` clears all indices and flags
- [x] No persistence (store resets on page reload)
- [x] All unit tests pass with 80%+ coverage

**Dependencies:** None (uses existing `createSelectors` from `@/lib`)

**Risk:** Low — Standard Zustand store pattern already established.

**Implementation notes:**

- `setCurrentIndices` includes an equality check to avoid unnecessary re-renders when indices haven't changed
- `reset()` delegates to `stop()` via `get().stop()` — single source of truth for state reset
- `rate` and `selectedVoice` are preserved across stop/reset (only play state and indices are cleared)

---

### Task 3.2: Speech Synthesis Hook ✅

**Description:**
Create `useSpeechSynthesis` hook that wraps the Web Speech API. Takes `flatText` from text mapping and `segments` for boundary event lookups. Manages utterance lifecycle and fires store updates on boundary events. Supports optional `startOffset` for click-to-start-from-sentence feature.

**Deliverables:**

- `src/hooks/useSpeechSynthesis.ts`:
  - Takes `{ flatText: string | null; segments: SegmentedText | null }`
  - Returns `{ play: (startOffset?: number) => void; pause: () => void; resume: () => void; stop: () => void; voices: SpeechSynthesisVoice[] }`
  - `play(startOffset?)`: creates `SpeechSynthesisUtterance(flatText.slice(startOffset ?? 0))`, sets `rate` and `voice` from store, calls `speechSynthesis.speak()`
  - Stores `startOffset` in a ref for the active utterance
  - Listens to `boundary` events: on `name='word'`, adds `startOffset` to `charIndex`, calls `findSegmentIndex` for word and sentence, updates store via `setCurrentIndices`
  - Listens to `end` event: calls `store.reset()`
  - `pause()`: calls `speechSynthesis.pause()` + `store.pause()`
  - `resume()`: calls `speechSynthesis.resume()` + `store.resume()`
  - `stop()`: calls `speechSynthesis.cancel()` + `store.stop()`
  - Loads voices via `speechSynthesis.getVoices()` + `onvoiceschanged`
  - Cancels speech on unmount
  - **Critical**: uses `flatText` verbatim — no transformation (only slicing for startOffset)
- `src/hooks/useSpeechSynthesis.test.ts`:
  - Tests: play/pause/resume/stop lifecycle, boundary event handling, startOffset adjustment, voice loading, cleanup on unmount
  - Mock `window.speechSynthesis` and `SpeechSynthesisUtterance`
- `src/test/mocks.ts`:
  - Add `mockSpeechSynthesis()` helper: mocks `window.speechSynthesis` and `SpeechSynthesisUtterance` with controllable event firing
- `src/hooks/index.ts`:
  - Updated barrel export

**Acceptance Criteria:**

- [x] `play()` creates utterance with exact `flatText` (no modifications)
- [x] `play(startOffset)` slices `flatText` and adjusts boundary charIndex by offset
- [x] Boundary events correctly update store with word and sentence indices
- [x] `end` event resets store to idle state
- [x] Pause/resume delegates to both `speechSynthesis` and store
- [x] Voices are loaded asynchronously via `onvoiceschanged`
- [x] Speech is cancelled on unmount
- [x] All unit tests pass with 80%+ coverage

**Dependencies:** Task 2.1 (for `findSegmentIndex`), Task 3.1

**Risk:** Medium — `SpeechSynthesisUtterance` event mocking in tests requires careful setup. Boundary event `charIndex` values must align with `flatText` indices. `startOffset` adjustment must be exact or highlights will drift.

**Implementation notes:**

- Uses `useTtsStore.getState()` in callbacks instead of selector hooks — avoids stale closures in event handlers
- `onerror` handler ignores `'canceled'` errors (fired when `speechSynthesis.cancel()` is called programmatically, e.g. on stop or play-restart)
- `play()` always calls `synth.cancel()` first to stop any in-progress speech before starting new utterance
- `mockSpeechSynthesis()` test helper added to `src/test/mocks.ts` — tracks utterance instances for event simulation
- 12 test cases covering: play lifecycle, startOffset, boundary events, end/error events, pause/resume/stop delegation, voice loading, unmount cleanup, null guards

---

## Phase 4: Highlight Overlay ✅ COMPLETED

**Phase objective:** Connect TTS state to computed highlight rectangles, render them as a visual overlay, and auto-scroll to keep the active sentence in view.

### Task 4.1: Highlight Sync Hook with Auto-Scroll ✅

**Description:**
Create `useHighlightSync` hook that reads TTS state from the store, computes highlight rects for the active sentence and word, caches results to avoid redundant recomputation, and auto-scrolls to keep the active sentence centered in the viewport.

**Deliverables:**

- `src/hooks/useHighlightSync.ts`:
  - Takes `{ charMap: CharMap | null; segments: SegmentedText | null; containerRef: RefObject<HTMLDivElement> }`
  - Returns `{ sentenceRects: HighlightRect[]; wordRects: HighlightRect[] }`
  - Reads `currentWordIndex`, `currentSentenceIndex`, `isPlaying`, `isPaused` from `useTtsStore`
  - Computes rects via `computeHighlightRects` for active sentence and word
  - Caches rects per segment index (only recomputes when index changes)
  - Returns empty arrays when no active segment or charMap is null
  - **Auto-scroll:** When `currentSentenceIndex` changes and `isPlaying` is `true`, scrolls the first sentence rect into view via `element.scrollIntoView({ behavior: 'smooth', block: 'center' })`
  - **Resume scroll:** When `isPaused` flips from `true` to `false` (resume), scrolls back to active highlight position
- `src/hooks/useHighlightSync.test.ts`:
  - Tests: returns empty when no active segment, computes rects on index change, caches rects for same index, auto-scroll called on sentence change, scroll on resume
  - Mock `computeHighlightRects`, store state, and `scrollIntoView`
- `src/hooks/index.ts`:
  - Updated barrel export

**Acceptance Criteria:**

- [x] Returns empty rects when TTS is not playing
- [x] Computes sentence rects for active sentence index
- [x] Computes word rects for active word index
- [x] Caches rects — does not recompute for same index
- [x] Recomputes when index changes
- [x] Active sentence auto-scrolls into view during playback
- [x] Resuming after pause scrolls back to reading position
- [x] All unit tests pass with 80%+ coverage

**Dependencies:** Task 2.1, Task 3.1

**Risk:** Low — Pure computation with caching. `scrollIntoView` is a single line addition.

**Implementation notes:**

- `scrollToRect` helper creates a temporary marker `div` at the rect position, calls `scrollIntoView`, then immediately removes it — pragmatic approach for scrolling to arbitrary coordinates within a container
- Sentence and word rects are computed in separate `useMemo` blocks (not combined) because they have different dependency arrays for correct memoization
- Ref-based tracking (`prevSentenceIndexRef`, `prevIsPausedRef`) avoids unnecessary scroll triggers when values haven't actually changed
- 8 test cases covering: null/empty states, rect computation, caching verification, auto-scroll on sentence change, scroll on resume, negative indices

---

### Task 4.2: HighlightOverlay Component ✅

**Description:**
Create `HighlightOverlay` component that renders highlight rectangles as absolutely-positioned divs above the text layer. Sentence highlights are yellow/translucent, word highlights are blue/prominent, with smooth CSS transitions.

**Deliverables:**

- `src/components/pdf/HighlightOverlay.tsx`:
  - `interface HighlightOverlayProps` — `{ sentenceRects: HighlightRect[]; wordRects: HighlightRect[] }`
  - Renders an absolute-positioned container div with `pointer-events: none`
  - Sentence rects: `bg-yellow-200/40` with `rounded-sm`
  - Word rects: `bg-blue-400/50` with `rounded-sm`
  - CSS `transition: opacity 100ms ease-in-out` for smooth highlighting
  - Each rect is a `<div>` with inline `style` for position/size (necessary since values are computed at runtime)
- `src/components/pdf/HighlightOverlay.test.tsx`:
  - Tests: renders nothing when rects are empty, renders correct number of sentence/word rects, applies correct styles
- `src/components/pdf/index.ts`:
  - Updated barrel export

**Acceptance Criteria:**

- [x] Renders no children when both rect arrays are empty
- [x] Sentence rects are yellow/translucent
- [x] Word rects are blue/prominent
- [x] All rects are absolutely positioned with `pointer-events: none`
- [x] Smooth transitions on appearance
- [x] Follows component guidelines (Props interface, named export)
- [x] All unit tests pass with 80%+ coverage

**Dependencies:** Task 1.3 (overlay slot in PdfViewer)

**Risk:** Low — Simple presentational component.

**Implementation notes:**

- Returns `null` (not empty div) when both arrays are empty — avoids unnecessary DOM nodes
- Uses `data-testid` attributes for test targeting: `highlight-overlay`, `sentence-highlight`, `word-highlight`
- 7 test cases covering: empty rendering, rect counts, inline styles, class verification

---

## Phase 5: UI Controls & Integration

**Phase objective:** Build TTS playback controls with progress bar, wire everything together in PdfViewer, add click-to-start-from-sentence, and update App.tsx.

### Task 5.1: TtsControls Component ✅

**Description:**
Create a sticky bottom bar with TTS playback controls: Play/Pause toggle, Stop, speed selector, voice dropdown, and progress bar. Install `dropdown-menu` shadcn component for the voice picker. Show browser compatibility warning if Web Speech API is unavailable.

**Deliverables:**

- `src/components/ui/dropdown-menu.tsx`:
  - Added via `npx shadcn add dropdown-menu`
- `src/components/pdf/TtsControls.tsx`:
  - `interface TtsControlsProps` — `{ onPlay: () => void; onPause: () => void; onResume: () => void; onStop: () => void; voices: SpeechSynthesisVoice[]; progress: number }`
  - Reads `isPlaying`, `isPaused`, `rate`, `selectedVoice` from `useTtsStore`
  - Sticky bottom bar: `fixed bottom-0 left-0 right-0` with backdrop blur and border-top
  - **Progress bar:** thin bar (`h-1`) at top of sticky bar, `bg-primary`, width = `progress * 100%`, `transition-all duration-200`; resets to 0 when stopped
  - Play/Pause toggle: `Play` icon when stopped/paused, `Pause` icon when playing
  - Stop button: `Square` icon, disabled when not playing
  - Speed selector: `DropdownMenu` with options `0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x`
  - Voice dropdown: `DropdownMenu` populated from `voices` prop
  - Uses `Button` from `@/components/ui/button`
  - Icons from `lucide-react`: `Play`, `Pause`, `Square`, `Volume2`, `ChevronUp`
  - Browser compatibility warning: inline dismissible banner if `!('speechSynthesis' in window)`
  - Accessible: aria-labels on all icon buttons
- `src/components/pdf/TtsControls.test.tsx`:
  - Tests: renders play button when stopped, renders pause button when playing, speed selector changes rate, voice dropdown shows voices, progress bar width reflects progress, browser warning shown when unsupported
  - Mock store state and callbacks
- `src/components/pdf/index.ts`:
  - Updated barrel export

**Acceptance Criteria:**

- [x] Play/Pause toggle correctly reflects TTS state
- [x] Stop button disabled when TTS is not playing
- [x] Speed selector updates store `rate`
- [x] Voice dropdown shows available voices and updates store `selectedVoice`
- [x] Progress bar fills left-to-right as speech progresses, resets on stop
- [x] Sticky bottom bar with professional styling (backdrop blur, border)
- [x] Browser compatibility warning shown when Web Speech API unavailable
- [x] All icon buttons have aria-labels
- [x] Follows component guidelines
- [x] All unit tests pass with 80%+ coverage

**Dependencies:** Task 3.1, Task 3.2

**Risk:** Low — Standard UI composition with existing primitives.

**Implementation notes:**

- `dropdown-menu` shadcn component added via `npx shadcn add dropdown-menu` (installed `@radix-ui/react-dropdown-menu`)
- `isActive` derived state (`isPlaying || isPaused`) used for stop button disabled state and progress bar visibility
- Speed/voice changes update store directly via `useTtsStore.getState()` — takes effect on next utterance
- Voice dropdown conditionally rendered only when `voices.length > 0`
- 9 test cases covering: play/pause button state, stop disabled state, progress bar width, browser warning, click handlers

---

### Task 5.2: Full Integration in PdfViewer & App.tsx

**Description:**
Wire all hooks and components together in `PdfViewer`: text mapping, speech synthesis, highlight sync, overlay, and TTS controls. Update `App.tsx` to render `<PdfViewer url="/sample.pdf" />`. Add bottom padding to account for sticky TtsControls. Compute and pass progress to TtsControls.

**Deliverables:**

- `src/components/pdf/PdfViewer.tsx` (updated):
  - Add `useTextMapping` — runs when text layer is ready
  - Add `useSpeechSynthesis` — takes `flatText` and `segments`
  - Add `useHighlightSync` — takes `charMap`, `segments`, and container ref
  - Render `<HighlightOverlay>` in the overlay slot (z-20)
  - Render `<TtsControls>` with speech synthesis callbacks
  - Compute progress: `charMap ? currentCharIndex / flatText.length : 0`
  - Add `pb-16` or similar bottom padding for sticky controls
  - TTS stops and resets when page changes
- `src/App.tsx` (updated):
  - Replace placeholder content with `<PdfViewer url="/sample.pdf" />`
  - Keep `Header`, `SkipLink`, `ErrorBoundary` wrapping
- `src/components/pdf/PdfViewer.test.tsx` (updated):
  - Integration test: verify all sub-components render when PDF loads
  - Test that TtsControls callbacks are wired to speech synthesis
  - Test that highlights clear on page change

**Acceptance Criteria:**

- [ ] `npm run dev` → PDF renders with canvas visible
- [ ] Text layer spans are in DOM (inspect via DevTools)
- [ ] Click Play → speech starts, boundary events fire
- [ ] Sentence highlights (yellow) and word highlights (blue) track speech
- [ ] Progress bar advances as speech progresses
- [ ] Pause/Resume/Stop work correctly
- [ ] Speed and voice changes take effect
- [ ] Page navigation works with TTS stopping and highlights clearing on page change
- [ ] Auto-scroll keeps active sentence in view
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] All unit tests pass

**Dependencies:** Task 1.3, Task 2.2, Task 3.2, Task 4.1, Task 4.2, Task 5.1

**Risk:** Medium — Integration of all layers. Most likely issues: timing between text layer ready and mapping, charIndex alignment between flatText and utterance.

---

### Task 5.3: Click-to-Start-From-Sentence

**Description:**
Allow users to click on any text in the PDF to start TTS from that sentence. Uses the existing text layer spans (already positioned) as click targets. Maps the clicked text node back to a `charIndex` via the charMap, finds the enclosing sentence, and starts TTS from that offset. Adds a pointer cursor over the text layer to indicate clickability.

**Deliverables:**

- `src/components/pdf/PdfViewer.tsx` (updated):
  - Text layer div: set `pointer-events: auto` and `cursor: pointer` (keep `opacity: 0`)
  - `onClick` handler on text layer:
    - Get clicked text node from `event.target` (walk to text node if needed)
    - Call `findCharIndex(charMap, textNode, offset)` → get `charIndex`
    - Call `findSegmentIndex(sentences, charIndex)` → get sentence index
    - Call `play(sentence.startChar)` to start TTS from that sentence
  - If TTS is already playing, stop current and restart from clicked sentence
- `src/components/pdf/PdfViewer.test.tsx` (updated):
  - Test: clicking text layer triggers play from correct sentence offset

**Acceptance Criteria:**

- [ ] Clicking on text starts TTS from the enclosing sentence
- [ ] Highlight sync works correctly with offset (no charIndex drift)
- [ ] Clicking while already playing restarts from new position
- [ ] Cursor changes to pointer over text layer to indicate clickability

**Dependencies:** Task 5.2

**Risk:** Medium — The `startOffset` adjustment to boundary `charIndex` must be exact or highlights will drift. But the logic is ~15 lines in the click handler.

---

## Phase 6: Documentation

**Phase objective:** Create decision records and feature docs for traceability.

### Task 6.1: Decision Records

**Description:**
Create ADR documents for key architectural decisions made in this PoC.

**Deliverables:**

- `docs/decisions/0002-text-layer-dom-range-api.md`:
  - Why Text Layer DOM + Range API over `getTextContent()` + `measureText`
  - Core reasoning: PDF.js already positions text spans; Range API gives pixel-perfect rects
  - Alternative rejected: proportional width splitting fails with non-monospace fonts
- `docs/decisions/0003-client-only-architecture.md`:
  - Why no server-side component
  - Web Speech API is browser-native, no API key needed for PoC
- `docs/decisions/0004-react-vite-over-sveltekit.md`:
  - Task suggested SvelteKit; React 19 + Vite 7 chosen for team expertise and existing scaffold
- `docs/decisions/README.md` (updated):
  - Add entries for 0002, 0003, 0004

**Acceptance Criteria:**

- [ ] Each decision follows the existing ADR format (see 0001)
- [ ] Alternatives considered section is present in each
- [ ] README index is updated

**Dependencies:** None (can be done in parallel with implementation)

**Risk:** Low

---

### Task 6.2: Feature Documentation & Index Updates

**Description:**
Create feature documentation for each major capability and update the docs index.

**Deliverables:**

- `docs/features/README.md`:
  - Index of all feature docs
- `docs/features/pdf-rendering.md`:
  - PDF.js integration details, worker config, canvas + text layer pipeline, viewport management
  - Key files listed
- `docs/features/text-extraction-mapping.md`:
  - CharMap construction, text normalization, Intl.Segmenter usage, Range API rects
  - Key files listed
- `docs/features/highlight-overlay.md`:
  - Custom overlay layer, sentence/word highlighting, CSS transitions, auto-scroll behavior
  - Key files listed
- `docs/features/tts-synchronization.md`:
  - Web Speech API integration, boundary events, binary search lookup, Zustand store, controls
  - Click-to-start-from-sentence interaction
  - Known limitation: Chrome 15s TTS bug (deferred, not addressed in PoC)
  - Key files listed
- `docs/README.md` (updated):
  - Add `## Features` section linking to `features/README.md`

**Acceptance Criteria:**

- [ ] Each feature doc covers purpose, key files, and important notes
- [ ] TTS doc includes "Known Limitations" section mentioning Chrome 15s bug
- [ ] `docs/README.md` links to features index
- [ ] `docs/features/README.md` links to all feature docs

**Dependencies:** All implementation phases (content depends on final implementation)

**Risk:** Low

---

## Parallel Execution Plan

### Dependency Corrections

The following dependency errors/relaxations were identified in the task definitions above:

| Task | PRD States              | Corrected                   | Reason                                                                                                                                                           |
| ---- | ----------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.1  | Task 0.1 (types)        | **Task 1.1**                | Types (`CharMap`, `SegmentedText`, `HighlightRect`) are defined in Task 1.1's `src/types/pdf.ts`, not in 0.1. Task 0.1 only installs pdfjs-dist.                 |
| 4.2  | Task 1.3 (overlay slot) | **Task 1.1** (relaxed)      | `HighlightOverlay` is a standalone presentational component — only imports `HighlightRect` type (from 1.1). The "plug into overlay slot" concern belongs to 5.2. |
| 5.1  | Task 3.1, Task 3.2      | **Task 3.1 only** (relaxed) | `TtsControls` receives speech synthesis outputs (`onPlay`, `voices`, etc.) as props. Only imports from the store (3.1). Wiring to 3.2 is done in 5.2.            |

### Corrected Dependency Graph

```
0.1 ──→ 1.1 ──┬──→ 1.2 ──┬──→ 1.3 ──────────────────────────────────┐
              │           └──→ 2.2 ──────────────────────────────────┐│
              ├──→ 2.1 ──┬──→ 3.2 ──────────────────────────────────┤││
              │           └──→ 4.1 ─────────────────────────────────┤│││
              └──→ 4.2 ────────────────────────────────────────────┤││││
                                                                    ↓↓↓↓↓
0.2 (standalone)                                                    5.2 → 5.3
3.1 ───────────────┬──→ 3.2 (also needs 2.1)                        ↑
                   ├──→ 4.1 (also needs 2.1)                        │
                   └──→ 5.1 ───────────────────────────────────────-┘
6.1 (standalone)
6.2 (after all implementation)
```

### Execution Waves

| Wave  | Tasks              | Max Parallelism | Unblocked By                         | Story Points |
| ----- | ------------------ | --------------- | ------------------------------------ | ------------ |
| **1** | 0.1, 0.2, 3.1, 6.1 | 4               | — (no deps)                          | 2+1+2+2 = 7  |
| **2** | 1.1                | 1               | 0.1                                  | 3            |
| **3** | 1.2, 2.1, 4.2      | 3               | 1.1 (3.1 already done)               | 3+3+2 = 8    |
| **4** | 1.3, 2.2, 3.2, 4.1 | 4               | 1.2+2.1 done, 3.1 done               | 3+3+3+3 = 12 |
| **5** | 5.1                | 1               | 3.1 (wave 1)                         | 3            |
| **6** | 5.2                | 1               | All of: 1.3, 2.2, 3.2, 4.1, 4.2, 5.1 | 8            |
| **7** | 5.3                | 1               | 5.2                                  | 3            |
| **8** | 6.2                | 1               | All implementation                   | 1            |

> **Note:** Wave 5 (5.1) can actually start as early as Wave 2 since it only needs 3.1 (Wave 1).
> It is placed in Wave 5 for visual clarity but should be started ASAP after 3.1 completes.

### Developer Track Assignment (2-Developer Model)

| Wave  | Developer A (PDF Pipeline)   | Developer B (TTS + Highlight)                    |
| ----- | ---------------------------- | ------------------------------------------------ |
| **1** | 0.1 — Install pdfjs-dist     | 3.1 — TTS Zustand store                          |
| **1** | 0.2 — Generate sample PDF    | 6.1 — Decision records                           |
| **2** | 1.1 — Types + usePdfDocument | 5.1 — TtsControls (needs 3.1 ✓)                  |
| **3** | 1.2 — usePdfPage             | 2.1 — Text mapping functions (needs 1.1 types ✓) |
| **3** | —                            | 4.2 — HighlightOverlay (needs 1.1 types ✓)       |
| **4** | 1.3 — PdfViewer component    | 3.2 — Speech synthesis hook                      |
| **4** | 2.2 — useTextMapping hook    | 4.1 — Highlight sync hook                        |
| **5** | 5.2 — Full integration       | — (code review / assist)                         |
| **6** | 5.3 — Click-to-start         | 6.2 — Feature documentation                      |

### Merge Conflict Hotspots

These files are modified by multiple tasks and will need coordinated merges:

| File                               | Modified By             | Mitigation                                   |
| ---------------------------------- | ----------------------- | -------------------------------------------- |
| `src/hooks/index.ts`               | 1.1, 1.2, 2.2, 3.2, 4.1 | Barrel export — append-only, merge trivially |
| `src/lib/index.ts`                 | 0.1, 2.1                | Barrel export — append-only                  |
| `src/types/index.ts`               | 1.1 only                | No conflict                                  |
| `src/components/pdf/index.ts`      | 1.3, 4.2, 5.1           | Barrel export — append-only                  |
| `src/components/pdf/PdfViewer.tsx` | 1.3, 5.2, 5.3           | **Sequential only** — never parallel         |

### Critical Path

Longest sequential chain by story points:

```
0.1(2) → 1.1(3) → 2.1(3) → 3.2(3) → 5.2(8) → 5.3(3) = 22 points
```

The bottleneck is **Task 5.2** (8 points) — it depends on 6 upstream tasks completing.

---

## Wave 4 Completion Notes (2026-03-13)

**Status:** All Wave 4 tasks (2.2, 3.2, 4.1) plus pre-requisite tasks (2.1, 3.1, 4.2) and early-start task 5.1 are complete. Code reviewed via `/simplify` — no changes needed.

**Test results:** 147 tests pass (16 test files), typecheck clean, lint clean (1 pre-existing warning in ErrorBoundary.tsx unrelated to TTS work).

### Key findings for Phase 5 (next wave):

1. **PdfViewer overlay slot is ready:** The `{/* Overlay slot (z-20) */}` comment in `PdfViewer.tsx:131` marks where `<HighlightOverlay>` should be rendered in Task 5.2.

2. **All hooks are wired to the store:** `useSpeechSynthesis` and `useHighlightSync` both use `useTtsStore` — Task 5.2 just needs to compose them in `PdfViewer`.

3. **TtsControls receives callbacks as props:** The component expects `onPlay/onPause/onResume/onStop/voices/progress` — Task 5.2 should wire these from `useSpeechSynthesis` return values.

4. **Progress computation:** `progress = charMap ? currentCharIndex / flatText.length : 0` — read `currentCharIndex` from store in `PdfViewer`.

5. **TTS must stop on page change:** Task 5.2 should add an effect in `PdfViewer` that calls `stop()` when `pageNumber` changes.

6. **Bottom padding:** `PdfViewer` needs `pb-16` or similar to account for the fixed-position `TtsControls` bar.

7. **Click-to-start (Task 5.3):** The text layer already has all span elements positioned. Task 5.3 needs to add `pointer-events: auto` + `cursor: pointer` + `onClick` handler to the text layer div. Use `findCharIndex` → `findSegmentIndex` → `play(sentence.startChar)`.

---

## Validation Checklist

1. Are **Deliverables** specific (exact file paths using `src/` structure)? **Yes**
2. Are **Acceptance Criteria** actionable checkboxes? **Yes**
3. Do all **Dependencies** reference existing tasks (no forward references)? **Yes**
4. Are there no **circular dependencies** in the task graph? **Yes** — DAG verified
5. Do dependencies follow **chronological order**? **Yes**
6. Do deliverables follow project conventions (`@/` imports, named exports, barrel exports)? **Yes**
7. Testing requirements matrix applied? **Yes** — all tasks include co-located tests per component type

## Verification (End-to-End)

1. `npm run dev` → PDF renders with text visible on canvas
2. Open DevTools → inspect text layer spans are positioned correctly
3. Click Play → speech starts, console logs charIndex from boundary events
4. Sentence highlights appear (yellow) with word highlights (blue) tracking speech
5. Active sentence auto-scrolls into view as speech progresses
6. Progress bar advances in sticky bottom controls
7. Click any sentence in the PDF → TTS starts from that sentence
8. Pause/Resume/Stop controls work; resume scrolls back to active position
9. Speed change takes effect on next utterance
10. Page navigation works; TTS stops and highlights clear on page change
11. `npm run test` — all unit tests pass
12. `npm run typecheck` — no errors
13. `npm run lint` — clean
