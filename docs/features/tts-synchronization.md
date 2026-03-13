# TTS Synchronization

**Added:** 2026-03-13

## Overview

This feature integrates browser speech synthesis with live PDF highlighting. It keeps playback state, speech boundary events, sentence/word index lookup, and UI controls synchronized so users can play, pause, resume, and stop reading.

## How It Works

1. `useSpeechSynthesis` (`src/hooks/useSpeechSynthesis.ts`) wraps `window.speechSynthesis` and exposes `play/pause/resume/stop` plus available voices.
2. `play(startOffset?)` creates `SpeechSynthesisUtterance(flatText.slice(startOffset ?? 0))`, applies rate/voice from store, and starts speech.
3. On word boundary events, the hook maps `event.charIndex + startOffset` into:
   - word index (`findSegmentIndex(segments.words, charIndex)`)
   - sentence index (`findSegmentIndex(segments.sentences, charIndex)`)
4. Those indices are queued with `requestAnimationFrame` batching, then committed to the Zustand store using `setCurrentIndices`.
5. `useHighlightSync` consumes store indices and computes sentence/word overlay rectangles, keeping visual highlighting aligned with speech progress.
6. `TtsControls` reads store state for play/pause status, voice/rate selections, and progress bar width (`currentCharIndex` against total chars).

## Key Files

- `src/stores/ttsStore.ts` -- core playback/index/rate/voice state and transitions.
- `src/hooks/useSpeechSynthesis.ts` -- Web Speech API integration and boundary event processing.
- `src/lib/textMapping.ts` -- `findSegmentIndex` for char-to-segment lookup.
- `src/hooks/useHighlightSync.ts` -- speech index -> highlight rectangle synchronization.
- `src/components/pdf/TtsControls.tsx` -- playback controls, speed/voice selectors, and progress bar.
- `src/components/pdf/PdfViewer.tsx` -- integration point for speech hooks, controls, and overlay rendering.

## Known Limitations

- Chrome has a known issue where long `speechSynthesis` utterances can stop around ~15 seconds; this PoC does not implement chunked utterance retry logic yet.
- Boundary event behavior varies by browser/engine, so sentence tracking reliability is strongest on Chrome (PoC target) and may differ in Safari/other environments.
- Playback is page-scoped: changing pages stops current speech and resets active highlight state.
