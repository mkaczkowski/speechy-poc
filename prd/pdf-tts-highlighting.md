# PDF Text-to-Speech Highlighting PoC

## Context

Business needs improved TTS-to-PDF text synchronization. Current backend approach estimates word/sentence positions with limited accuracy. This PoC validates a **frontend-only approach** using PDF.js text layer DOM + Range API for pixel-perfect highlighting, synchronized with Web Speech API boundary events. Reference: Speechify.

## Approach: Text Layer DOM + Range API

Instead of computing positions from `getTextContent()` + `measureText` (font mismatch issues), we leverage the text layer DOM that PDF.js already renders with correct positioning:

```
PDF.js text layer <span> elements (already positioned)
    → Build charIndex-to-DOM-node map
    → Range API → getBoundingClientRect()
    → Pixel-perfect highlight rects

Web Speech API boundary events (charIndex)
    → Lookup in charMap → active word/sentence
    → Draw highlights in overlay
```

## Implementation Phases

### Phase 0: Setup (~15 min)

1. `npm install pdfjs-dist`
2. Add sample PDF to `public/sample.pdf` (short, text-heavy, 1-2 pages)
3. Create `src/lib/pdf-worker.ts` — configure `GlobalWorkerOptions.workerSrc`
4. Import PDF.js text layer CSS (ships with pdfjs-dist)
5. Add `pdfjs-dist` to `manualChunks` in `vite.config.ts`

### Phase 1: PDF Rendering (get visual feedback first)

**New files:**

- `src/types/pdf.ts` — shared interfaces
- `src/types/index.ts` — barrel export
- `src/hooks/use-pdf-document.ts` — load PDFDocumentProxy from URL
- `src/hooks/use-pdf-page.ts` — render canvas + text layer, expose `textLayerReady` flag
- `src/hooks/index.ts` — barrel export
- `src/components/pdf/PdfViewer.tsx` — orchestrator: canvas + text layer + overlay
- `src/components/pdf/index.ts` — barrel export

**Layer stack (z-order):**

```
┌─────────────────────────────┐
│ 3. Highlight Overlay        │  pointer-events: none
│ 2. Text Layer (PDF.js)      │  opacity: 0 (invisible but in layout)
│ 1. Canvas (rendered PDF)    │
└─────────────────────────────┘
```

**Key detail:** Text layer must be `opacity: 0` (NOT `display: none`) so Range API works.

### Phase 2: Text Extraction & Mapping (core logic)

**New files:**

- `src/lib/text-mapping.ts` — pure functions (most testable layer)
- `src/lib/text-mapping.test.ts` — unit tests
- `src/hooks/use-text-mapping.ts` — runs mapping when `textLayerReady` flips

**Pure functions in `text-mapping.ts`:**

1. **`buildCharMap(container: HTMLElement)`** → `{ flatText, charMap[] }`
   - TreeWalker over TEXT_NODEs in text layer spans
   - Maps every charIndex to `{ node: Text, offsetInNode }`
   - Inserts single space between spans (normalization)
   - This `flatText` is THE canonical string — fed verbatim to TTS

2. **`segmentText(flatText: string)`** → `{ sentences: SentenceSegment[], words: WordSegment[] }`
   - `Intl.Segmenter` with `granularity: 'sentence'` then `'word'`
   - Fallback: regex for unsupported browsers
   - Each segment: `{ text, startChar, endChar }`

3. **`computeHighlightRects(charMap, startChar, endChar, containerRect)`** → `HighlightRect[]`
   - Creates DOM Range from charMap entries
   - `range.getClientRects()` → multiple rects for multi-line text
   - Offsets relative to container

**Critical invariant:** `flatText` from `buildCharMap` must be passed _verbatim_ to `SpeechSynthesisUtterance.text`. Any mismatch = charIndex drift = wrong highlights.

### Phase 3: TTS Engine (Web Speech API)

**New files:**

- `src/hooks/use-speech-synthesis.ts` — Web Speech API wrapper
- `src/stores/tts-store.ts` — Zustand store for TTS state
- `src/stores/index.ts` — barrel export

**tts-store state:**

- `isPlaying`, `isPaused`, `currentCharIndex`, `currentWordIndex`, `currentSentenceIndex`, `rate`, `selectedVoice`
- Actions: `setPlaying`, `setCurrentCharIndex`, `reset`, etc.
- Wrapped with `createSelectors` (reuse from `@/lib/createSelectors`)
- No persistence needed

**use-speech-synthesis hook:**

- Takes `flatText` from Phase 2
- Creates `SpeechSynthesisUtterance`, listens to `boundary` events
- On `boundary(name='word')`: binary search through word segments to find active word/sentence → update store
- Exposes: `play()`, `pause()`, `resume()`, `stop()`, `voices[]`
- Target Chrome (best boundary event support). Show warning on unsupported browsers.

### Phase 4: Highlight Overlay (connect the dots)

**New files:**

- `src/components/pdf/HighlightOverlay.tsx` — renders highlight rects
- `src/hooks/use-highlight-sync.ts` — connects TTS state to rects

**use-highlight-sync:**

- Reads `currentWordIndex` / `currentSentenceIndex` from ttsStore
- Calls `computeHighlightRects` for active sentence + active word
- Caches rects per segment (avoid recomputing on every boundary event)
- Returns `{ sentenceRects, wordRects }`

**HighlightOverlay:**

- Absolute-positioned div, `pointer-events: none`
- Sentence: `bg-yellow-200/40` (light translucent)
- Word: `bg-blue-400/50` (prominent)
- CSS `transition: opacity 100ms` for smooth highlighting

### Phase 5: UI Controls & Polish

**New files:**

- `src/components/pdf/TtsControls.tsx` — Play/Pause/Stop + speed + voice

**Reuse existing:**

- `Button` from `@/components/ui/button`
- `DropdownMenu` from `@/components/ui/dropdown-menu`
- Icons from `lucide-react` (Play, Pause, Square, Volume2)

**Controls:**

- Play/Pause toggle
- Stop button
- Speed selector: 0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x
- Voice dropdown (from `speechSynthesis.getVoices()`)

### Phase 6: Integration

Update `App.tsx` to render `<PdfViewer url="/sample.pdf" />`.

## File Summary

```
src/
├── types/pdf.ts                              # Interfaces
├── types/index.ts                            # Barrel
├── lib/pdf-worker.ts                         # Worker config
├── lib/text-mapping.ts                       # Core pure logic
├── lib/text-mapping.test.ts                  # Tests
├── stores/tts-store.ts                       # TTS Zustand store
├── stores/tts-store.test.ts                  # Tests
├── stores/index.ts                           # Barrel
├── hooks/use-pdf-document.ts                 # Load PDF
├── hooks/use-pdf-page.ts                     # Render page
├── hooks/use-text-mapping.ts                 # Build char map
├── hooks/use-speech-synthesis.ts             # Web Speech API
├── hooks/use-highlight-sync.ts               # Connect TTS → rects
├── hooks/index.ts                            # Barrel
├── components/pdf/PdfViewer.tsx              # Main orchestrator
├── components/pdf/HighlightOverlay.tsx       # Highlight rects
├── components/pdf/TtsControls.tsx            # Playback controls
├── components/pdf/index.ts                   # Barrel
└── test/mocks.ts                             # + mockSpeechSynthesis
```

## Risks & Mitigations

| Risk                                        | Impact                    | Mitigation                                                                               |
| ------------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------------- |
| flatText ≠ utterance text (charIndex drift) | Highlights on wrong words | Single source of truth: `buildCharMap` output is the ONLY text fed to TTS                |
| Text layer not ready when mapping runs      | Empty charMap             | `textLayerReady` flag from `renderTextLayer` promise; gate mapping on it                 |
| Spans split mid-word                        | Broken word boundaries    | charMap is per-character, segmentation runs on concatenated flatText — handles naturally |
| `Range.getClientRects()` empty              | No highlights             | Text layer must be `opacity: 0` not `display: none`                                      |
| Firefox/Safari weak boundary events         | No word tracking          | Target Chrome for PoC; show browser warning                                              |
| Large pages slow rect computation           | UI jank                   | Compute rects lazily (only active sentence), cache results                               |

## Phase 7: Documentation

Create individual decision and feature docs so each choice and feature is traceable.

### Decisions (docs/decisions/)

Already exists:

- `0001-web-speech-api-for-tts.md` — Why Web Speech API over OpenAI/ElevenLabs/Google Cloud TTS

To create:

- `0002-text-layer-dom-range-api.md` — Why Text Layer DOM + Range API over `getTextContent()` + `measureText`. Core reasoning: PDF.js already positions text layer spans correctly; Range API gives pixel-perfect rects without font measurement. Alternative (`getTextContent` + proportional width splitting) fails with non-monospace fonts.
- `0003-client-only-architecture.md` — Why no server-side component. User provides their own API key (if needed for future cloud TTS). Web Speech API is browser-native. No proxy/serverless function required for the PoC.
- `0004-react-vite-over-sveltekit.md` — Task suggested SvelteKit but allowed stack choice. React 19 + Vite 7 chosen because it matches team expertise and existing project scaffold.

### Features (docs/features/)

Create `docs/features/README.md` index, then:

- `pdf-rendering.md` — PDF.js integration: pdfjs-dist setup, worker config, canvas + text layer rendering pipeline, viewport management. Key files: `lib/pdf-worker.ts`, `hooks/use-pdf-document.ts`, `hooks/use-pdf-page.ts`, `components/pdf/PdfViewer.tsx`.
- `text-extraction-mapping.md` — CharMap construction from text layer DOM, text normalization (space insertion between spans), sentence/word segmentation via `Intl.Segmenter`, highlight rect computation via Range API. Key files: `lib/text-mapping.ts`, `hooks/use-text-mapping.ts`.
- `highlight-overlay.md` — Custom overlay layer above PDF.js text layer, sentence highlighting (yellow), word highlighting (blue), multi-line rect support, CSS transitions. Key files: `components/pdf/HighlightOverlay.tsx`, `hooks/use-highlight-sync.ts`.
- `tts-synchronization.md` — Web Speech API integration, boundary event handling, charIndex-to-segment lookup (binary search), Zustand store for playback state, play/pause/stop/speed/voice controls. Key files: `hooks/use-speech-synthesis.ts`, `stores/tts-store.ts`, `components/pdf/TtsControls.tsx`.

### Index updates

- Update `docs/decisions/README.md` with new entries
- Update `docs/README.md` to add `## [Features](features/README.md)` section

## Verification

1. `npm run dev` — PDF renders with text visible on canvas
2. Open DevTools → inspect text layer spans are positioned correctly
3. Click Play → speech starts, console logs charIndex from boundary events
4. Sentence highlights appear (yellow) with word highlights (blue) tracking speech
5. Pause/Resume/Stop controls work
6. Speed change takes effect on next utterance
7. `npm run test` — all unit tests pass
8. `npm run typecheck` — no errors
9. `npm run lint` — clean
