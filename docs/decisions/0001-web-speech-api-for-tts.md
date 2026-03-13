# 0001: Web Speech API for Text-to-Speech

**Date:** 2026-03-13 | **Status:** Accepted

## Context

The application needs text-to-speech (TTS) functionality with real-time tracking of which **word** and **sentence** is currently being spoken. This tracking is essential for features like text highlighting, karaoke-style reading, and accessibility-driven read-along experiences.

The key constraint: we need the TTS engine to emit timing events (word/sentence boundaries) as speech progresses — not just produce a raw audio blob.

## Decision

Use the **Web Speech API** (`window.speechSynthesis`) — the browser-native TTS engine available in all modern browsers.

The `SpeechSynthesisUtterance` fires `boundary` events with `charIndex` and `charLength` for each word and sentence as it is spoken, giving us exactly the real-time tracking we need with zero external dependencies.

```typescript
const utterance = new SpeechSynthesisUtterance(text);
utterance.onboundary = (event) => {
  // event.name: 'word' | 'sentence'
  // event.charIndex: position in text
  // event.charLength: length of current word/sentence
};
speechSynthesis.speak(utterance);
```

## Alternatives Considered

### OpenAI TTS (`/v1/audio/speech` via TanStack AI or direct fetch)

- **Pros:** High-quality, natural-sounding voices (tts-1, tts-1-hd). Provider-agnostic via `@tanstack/ai`.
- **Cons:** Returns a raw audio blob (mp3/wav) with **no timing metadata whatsoever**. No word-level timestamps, no boundary events. To achieve word tracking, you would need to either:
  - Split text into individual words/sentences, make separate API calls per chunk, and play them sequentially — resulting in unnatural pauses, high latency, and significant API cost.
  - Use a separate forced-alignment tool post-generation — adding complexity and latency.
- **Verdict:** Rejected. The core requirement (word/sentence tracking) is fundamentally unsupported by the API. Confirmed via Context7 docs for `@tanstack/ai` — `generateSpeech` returns only `{ audio, format, contentType, duration }`.

### Amazon Polly (Speech Marks)

- **Pros:** Dedicated **Speech Marks** feature returns explicit `word` and `sentence` types with `time` (ms offset into audio), `start`/`end` (char offsets into input text), and `value` (word text) — matching the same charIndex/charLength mental model as Web Speech API `boundary` events. AWS has an [official blog post](https://aws.amazon.com/blogs/machine-learning/highlight-text-as-its-being-spoken-using-amazon-polly/) demonstrating this exact use case.
- **Cons:**
  - Requires two API calls per utterance: one for audio, one for speech marks.
  - Requires AWS credentials (Cognito or backend proxy).
  - $4/1M chars (standard) or $16/1M chars (neural); 12-month free tier only.
- **Verdict:** Rejected for this PoC. Strongest migration target if Web Speech API proves unreliable — the speech marks data model maps almost 1:1 to our current boundary event model, making future migration low-effort.

### Azure Speech Services

- **Pros:** JavaScript SDK emits real-time `wordBoundary` and `SentenceBoundary` events during streaming synthesis — no second API call needed. Event payload includes `audioOffset` (100ns ticks), `text`, `textOffset`, `wordLength`. Excellent neural voice quality (400+ voices across 140+ languages). Official React sample: `Azure-Samples/AzureSpeechReactSample`. Always-free tier of 500K chars/month.
- **Cons:**
  - SDK uses WebSocket connections — adds complexity vs. native browser API.
  - Some OpenAI-branded Azure voices do NOT emit word boundary events.
  - $15/1M chars beyond free tier.
- **Verdict:** Rejected for this PoC. Best option for real-time streaming word highlighting if Web Speech API is abandoned — events fire live during synthesis rather than requiring pre-fetched timing data.

### ElevenLabs TTS API

- **Pros:** Best-in-class voice quality. Provides **character-level alignment timestamps** via `/v1/text-to-speech/{voice_id}/with-timestamps` REST endpoint and streaming SSE variant. Character-level granularity is the most precise available — you can highlight at word, sentence, or syllable level.
- **Cons:**
  - Requires a **paid plan** ($5-99+/mo depending on volume; no sufficient free tier).
  - Character-level timestamps require aggregation into word boundaries (no native word/sentence type).
  - Adds an external dependency and API key management.
  - Increased complexity: audio chunk buffering, alignment data parsing.
- **Verdict:** Rejected for now. Viable upgrade path if voice quality becomes a hard requirement. Best choice when voice naturalness is the top priority over implementation simplicity.

### Google Cloud Text-to-Speech

- **Pros:** High-quality WaveNet/Neural2 voices.
- **Cons:** Only supports timing via **SSML `<mark>` tags** (v1beta1). You must manually wrap every word in `<mark>` tags before sending — no automatic word-level timing. Extremely cumbersome for dynamic text.
- **Verdict:** Rejected. The manual SSML markup approach is impractical and brittle.

### TanStack AI `generateSpeech` (provider-agnostic)

- **Pros:** Clean, type-safe API. Supports OpenAI and Gemini adapters.
- **Cons:** Inherits the limitations of the underlying provider. Neither the OpenAI nor Gemini adapter returns word-level timing data. The `TTSResult` interface only contains `{ id, model, audio, format, contentType, duration }`.
- **Verdict:** Rejected. Same limitation as calling OpenAI directly — no timing events.

## Consequences

**Enables:**

- Zero-cost TTS with no API key or external service required
- Real-time word and sentence boundary tracking via native browser events
- Simple implementation — no audio chunk buffering, no WebSocket management, no alignment parsing
- Works offline (uses OS-level voices)

**Costs:**

- Voice quality is lower than cloud providers (OS-dependent, varies by platform)
- Voice selection is limited to what the OS/browser provides
- Slight behavioral differences across browsers (Chrome, Firefox, Safari)

**Watch out for:**

- Chrome has a known bug where `speechSynthesis` stops after ~15 seconds of continuous speech — workaround is to chunk long text into smaller utterances
- `boundary` event support varies: Chrome supports both `word` and `sentence`, Safari may only fire `word` events
- Voice availability differs by OS: macOS has high-quality voices, Windows/Linux may have fewer options

**Watch out for (Web Speech API reliability):**

- The spec says the browser "must fire boundary events _if_ the speech synthesis engine provides the event" — compliance is not guaranteed. In practice, events sometimes stop mid-utterance on Chrome Android and some mobile browsers.
- The Web Speech API is appropriate for a PoC but carries real reliability risk in production across the full browser/device matrix (~75% effective cross-browser support).

**How word/sentence sync works regardless of provider:**
All viable cloud providers converge on the same frontend pattern — the provider is only the source of timing metadata:

```typescript
// Generic pattern (works with Polly speech marks, Azure events, ElevenLabs timestamps)
const marks = [{ word: "Mary", startMs: 0 }, { word: "had", startMs: 373 }, ...];
audioElement.addEventListener("timeupdate", () => {
  const currentMs = audioElement.currentTime * 1000;
  const active = marks.findLast((m) => m.startMs <= currentMs);
  // map active.word back to DOM node → apply highlight class
});
```

**Upgrade path decision tree:**

1. **Web Speech API unreliable** → migrate to **Amazon Polly** (speech marks data model maps 1:1 to `boundary` events; lowest migration cost)
2. **Need real-time streaming synthesis** → use **Azure Speech Services** (`wordBoundary` events fire live during generation)
3. **Voice quality is the top priority** → use **ElevenLabs** (character-level timestamps, best-in-class voices)
4. **Need a unified abstraction over multiple providers** → consider **js-tts-wrapper** (open-source, normalizes word boundary callbacks across Azure/Polly/ElevenLabs/Google)
