import type { CharMap, HighlightRect, SegmentedText, TextSegment } from '@/types/pdf';

/**
 * Walks all Text nodes inside a text-layer container and builds a flat
 * character map that links every character index back to its DOM node.
 * A single space is inserted between sibling spans for normalisation.
 * Use this after PDF.js text-layer render when you need char-level lookups.
 */
export function buildCharMap(container: HTMLElement): CharMap {
  const entries: CharMap['entries'] = [];
  const textParts: string[] = [];
  // Fast reverse lookup for click mapping: Text node + offset -> flatText char index.
  const nodeOffsetIndex = new WeakMap<Text, Map<number, number>>();

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);

  let isFirstTextNode = true;
  let node: Text | null = null;

  while ((node = walker.nextNode() as Text | null)) {
    const text = node.textContent ?? '';
    let nodeIndexMap = nodeOffsetIndex.get(node);
    if (!nodeIndexMap) {
      nodeIndexMap = new Map<number, number>();
      nodeOffsetIndex.set(node, nodeIndexMap);
    }

    // Insert a normalisation space between spans (not before the very first node)
    if (!isFirstTextNode && text.length > 0) {
      textParts.push(' ');
      // The space doesn't belong to any real text node – store a synthetic entry
      nodeIndexMap.set(-1, entries.length);
      entries.push({ node, offsetInNode: -1 });
    }

    for (let i = 0; i < text.length; i++) {
      nodeIndexMap.set(i, entries.length);
      entries.push({ node, offsetInNode: i });
    }

    if (text.length > 0) {
      textParts.push(text);
      isFirstTextNode = false;
    }
  }

  return { flatText: textParts.join(''), entries, nodeOffsetIndex };
}

/**
 * Segments flat text into sentences and words using `Intl.Segmenter`
 * with a regex fallback for environments that lack it.
 * Use this to derive speaking/highlighting ranges from mapped page text.
 */
export function segmentText(flatText: string): SegmentedText {
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
    return segmentWithIntl(flatText);
  }
  return segmentWithRegex(flatText);
}

let cachedSentenceSegmenter: Intl.Segmenter | null = null;
let cachedWordSegmenter: Intl.Segmenter | null = null;

function getSentenceSegmenter(): Intl.Segmenter {
  return (cachedSentenceSegmenter ??= new Intl.Segmenter('en', { granularity: 'sentence' }));
}

function getWordSegmenter(): Intl.Segmenter {
  return (cachedWordSegmenter ??= new Intl.Segmenter('en', { granularity: 'word' }));
}

function segmentWithIntl(flatText: string): SegmentedText {
  const sentenceSegmenter = getSentenceSegmenter();
  const wordSegmenter = getWordSegmenter();

  const sentences: TextSegment[] = [];
  for (const seg of sentenceSegmenter.segment(flatText)) {
    sentences.push({
      text: seg.segment,
      startChar: seg.index,
      endChar: seg.index + seg.segment.length,
    });
  }

  const words: TextSegment[] = [];
  for (const seg of wordSegmenter.segment(flatText)) {
    if (seg.isWordLike) {
      words.push({
        text: seg.segment,
        startChar: seg.index,
        endChar: seg.index + seg.segment.length,
      });
    }
  }

  return { sentences, words };
}

function segmentWithRegex(flatText: string): SegmentedText {
  const sentences: TextSegment[] = [];
  // Split on sentence-ending punctuation followed by whitespace or end-of-string
  const sentenceRegex = /[^.!?]*[.!?]+[\s]?|[^.!?]+$/g;
  let match: RegExpExecArray | null;

  while ((match = sentenceRegex.exec(flatText)) !== null) {
    if (match[0].length === 0) break;
    sentences.push({
      text: match[0],
      startChar: match.index,
      endChar: match.index + match[0].length,
    });
  }

  // If no sentences were found (e.g. text without punctuation), treat the whole text as one sentence
  if (sentences.length === 0 && flatText.length > 0) {
    sentences.push({ text: flatText, startChar: 0, endChar: flatText.length });
  }

  const words: TextSegment[] = [];
  const wordRegex = /\w+/g;
  while ((match = wordRegex.exec(flatText)) !== null) {
    words.push({
      text: match[0],
      startChar: match.index,
      endChar: match.index + match[0].length,
    });
  }

  return { sentences, words };
}

/**
 * Given a charMap range, creates a DOM Range and converts its client rects
 * into coordinates relative to `containerEl`.
 * Use this to turn sentence/word character ranges into overlay rectangles.
 */
export function computeHighlightRects(
  charMap: CharMap,
  startChar: number,
  endChar: number,
  containerEl: HTMLElement,
  containerRect?: DOMRect,
): HighlightRect[] {
  if (
    startChar < 0 ||
    endChar < 0 ||
    startChar >= charMap.entries.length ||
    endChar > charMap.entries.length ||
    startChar >= endChar
  ) {
    return [];
  }

  const startEntry = charMap.entries[startChar];
  const endEntry = charMap.entries[endChar - 1];

  const range = document.createRange();
  range.setStart(startEntry.node, Math.max(0, startEntry.offsetInNode));

  // End is exclusive in Range – set to offset + 1 (clamped to node length)
  const endOffset = Math.max(0, endEntry.offsetInNode) + 1;
  const clampedEndOffset = Math.min(endOffset, endEntry.node.textContent?.length ?? endOffset);
  range.setEnd(endEntry.node, clampedEndOffset);

  const resolvedContainerRect = containerRect ?? containerEl.getBoundingClientRect();
  const clientRects = range.getClientRects();

  const rects: HighlightRect[] = [];
  for (const rect of clientRects) {
    if (rect.width === 0 && rect.height === 0) continue;
    rects.push({
      left: rect.left - resolvedContainerRect.left,
      top: rect.top - resolvedContainerRect.top,
      width: rect.width,
      height: rect.height,
    });
  }

  return rects;
}

/**
 * Binary search for the segment that contains the given `charIndex`.
 * Returns the segment index or `-1` if not found.
 * Use this for fast playback-progress to segment mapping.
 */
export function findSegmentIndex(segments: TextSegment[], charIndex: number): number {
  let lo = 0;
  let hi = segments.length - 1;

  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    const seg = segments[mid];

    if (charIndex < seg.startChar) {
      hi = mid - 1;
    } else if (charIndex >= seg.endChar) {
      lo = mid + 1;
    } else {
      return mid;
    }
  }

  return -1;
}

/**
 * Reverse lookup: given a DOM Text node and an offset within it, find the
 * corresponding flat-text character index. Returns `-1` if not found.
 * Use this when converting DOM caret/selection positions back to text indices.
 */
export function findCharIndex(charMap: CharMap, node: Text, offset: number): number {
  // Prefer indexed lookup; fallback linear scan keeps compatibility with older char maps in tests.
  const indexedResult = charMap.nodeOffsetIndex?.get(node)?.get(offset);
  if (indexedResult !== undefined) {
    return indexedResult;
  }

  for (let i = 0; i < charMap.entries.length; i++) {
    const entry = charMap.entries[i];
    if (entry.node === node && entry.offsetInNode === offset) {
      return i;
    }
  }
  return -1;
}
