import type { TextContent } from 'pdfjs-dist/types/src/display/api';
import type { PageViewport } from 'pdfjs-dist/types/src/display/display_utils';

import type { CharMap, HighlightRect, ItemRect, SegmentedText, TextSegment } from '@/types/pdf';

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
    const trimmed = seg.segment.trimEnd();
    if (trimmed.length === 0) continue;
    sentences.push({
      text: trimmed,
      startChar: seg.index,
      endChar: seg.index + trimmed.length,
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
    const trimmed = match[0].trimEnd();
    if (trimmed.length === 0) continue;
    sentences.push({
      text: trimmed,
      startChar: match.index,
      endChar: match.index + trimmed.length,
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
 * Measures cumulative character width fractions from a DOM text node using
 * Range. Returns a Float32Array of length `len + 1` where entry `i` is the
 * fractional x-position (0→1) where character `i` starts, and the last entry
 * is 1.0.
 *
 * Using Range on the actual rendered span guarantees pixel-exact widths
 * including the text layer's scaleX transform and the browser's actual font
 * rendering — no OffscreenCanvas font mismatch.
 */
function measureCharOffsetsFromDOM(textNode: Text, len: number): Float32Array | null {
  const offsets = new Float32Array(len + 1);
  if (len === 0) return offsets;

  const range = document.createRange();
  range.setStart(textNode, 0);
  range.setEnd(textNode, len);
  const totalWidth = range.getBoundingClientRect().width;

  if (totalWidth === 0) return null;

  for (let i = 1; i < len; i++) {
    range.setEnd(textNode, i);
    offsets[i] = range.getBoundingClientRect().width / totalWidth;
  }
  offsets[len] = 1.0;

  return offsets;
}

/**
 * Builds an array of viewport-space bounding rects, one per text item, plus a
 * parallel `charToItem` array that maps every flatText character index to its
 * `ItemRect` index.
 *
 * Uses `viewport.convertToViewportRectangle()` to transform each item's PDF
 * coordinates into CSS-pixel positions that exactly match the canvas rendering.
 *
 * Each item also gets `charOffsets` — per-character fractional positions
 * measured with the text layer's font — for accurate sub-item slicing
 * with variable-width fonts.
 */
export function buildItemRects(
  textContent: TextContent,
  viewport: PageViewport,
  charMap: CharMap,
  textLayerElement?: HTMLElement,
): { itemRects: ItemRect[]; charToItem: Int32Array; itemStartChars: Int32Array } {
  const items = textContent.items;
  const itemRects: ItemRect[] = [];

  // Collect text layer spans for per-character measurement.
  const spans: HTMLElement[] = [];
  if (textLayerElement) {
    for (const child of textLayerElement.children) {
      if (child instanceof HTMLElement && child.textContent) {
        spans.push(child);
      }
    }
  }

  let spanIdx = 0;

  // Only process text items (skip marked-content items which have no `str`).
  for (const item of items) {
    if (!('str' in item) || item.str.length === 0) continue;

    // item.transform = [scaleX, shearY, shearX, scaleY, x, y]
    // item.width / item.height are in the same coordinate system as the page.
    const tx = item.transform[4];
    const ty = item.transform[5];
    const itemHeight = item.height;
    const itemWidth = item.width;

    // PDF rect: [xMin, yMin, xMax, yMax] — y increases upward.
    // Text origin (tx, ty) is at the baseline-left; height extends upward.
    const pdfRect = [tx, ty, tx + itemWidth, ty + itemHeight];
    const [vx1, vy1, vx2, vy2] = viewport.convertToViewportRectangle(pdfRect);

    // convertToViewportRectangle may return flipped coordinates.
    const rawLeft = Math.min(vx1, vx2);
    const rawTop = Math.min(vy1, vy2);
    const rawWidth = Math.abs(vx2 - vx1);
    const rawHeight = Math.abs(vy2 - vy1);

    // PDF item height covers baseline→ascent only. Extend downward for
    // descenders (g, p, y, etc.) and add horizontal padding for breathing room.
    // All values are proportional to the item height so they scale with the viewport.
    const descentExtension = rawHeight * 0.25;
    const horizontalPad = rawHeight * 0.15;

    // Measure per-character offsets from the rendered DOM span for pixel-exact
    // widths that include scaleX and the browser's actual font rendering.
    let charOffsets: Float32Array | null = null;
    const span = spans[spanIdx];
    if (span && span.textContent === item.str) {
      const textNode = span.firstChild;
      if (textNode instanceof Text) {
        charOffsets = measureCharOffsetsFromDOM(textNode, item.str.length);
      }
      spanIdx++;
    } else {
      if (span) spanIdx++;
    }

    // Fallback: equal-width distribution.
    if (!charOffsets) {
      const len = item.str.length;
      charOffsets = new Float32Array(len + 1);
      for (let i = 0; i <= len; i++) {
        charOffsets[i] = i / len;
      }
    }

    itemRects.push({
      left: rawLeft - horizontalPad,
      top: rawTop,
      width: rawWidth + horizontalPad * 2,
      height: rawHeight + descentExtension,
      charCount: item.str.length,
      textLeft: rawLeft,
      textWidth: rawWidth,
      charOffsets,
    });
  }

  // Map each flatText char to its itemRect index and simultaneously record
  // the first real (non-synthetic) char index per item for sub-item slicing.
  const charToItem = new Int32Array(charMap.entries.length).fill(-1);
  const itemStartChars = new Int32Array(itemRects.length).fill(-1);
  let itemIdx = 0;
  let prevNode: Text | null = null;

  for (let ci = 0; ci < charMap.entries.length; ci++) {
    const entry = charMap.entries[ci];
    if (entry.offsetInNode < 0) {
      // Synthetic space — inherit the next real item.
      continue;
    }
    if (entry.node !== prevNode) {
      // New text node → advance to the next item.
      if (prevNode !== null) itemIdx++;
      prevNode = entry.node;
    }
    if (itemIdx < itemRects.length) {
      charToItem[ci] = itemIdx;
      if (itemStartChars[itemIdx] === -1) {
        itemStartChars[itemIdx] = ci;
      }
    }
  }

  // Back-fill synthetic spaces: assign them to the item of the next real char.
  for (let ci = charMap.entries.length - 1; ci >= 0; ci--) {
    if (charToItem[ci] === -1 && ci + 1 < charToItem.length) {
      charToItem[ci] = charToItem[ci + 1];
    }
  }

  return { itemRects, charToItem, itemStartChars };
}

interface ItemSlice {
  itemIdx: number;
  /** First covered char offset within the item (0-based). */
  startInItem: number;
  /** Exclusive end char offset within the item. */
  endInItem: number;
}

/**
 * Given a charMap range, computes highlight rectangles using pre-computed
 * `itemRects` (from `buildItemRects`) so highlights match canvas rendering
 * exactly — no DOM measurements, no system-font metric mismatch.
 *
 * For sub-item ranges (e.g. one word inside a multi-word item) the item rect
 * is proportionally sliced by character count.
 */
export function computeHighlightRects(
  charMap: CharMap,
  startChar: number,
  endChar: number,
  itemRects: ItemRect[] | null,
  charToItem: Int32Array | null,
  itemStartChars: Int32Array | null,
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

  // Fallback: no item rects available (e.g. in tests without PDF data).
  if (!itemRects || !charToItem || !itemStartChars) {
    return [];
  }

  // Group the char range by item index, tracking how many chars of the item
  // are covered and the first/last char offsets within the item.
  const slices: ItemSlice[] = [];
  let currentItemIdx = -1;
  let itemCharOffset = 0; // running char offset within current item

  for (let ci = startChar; ci < endChar; ci++) {
    // Skip synthetic normalization spaces — they don't map to real item characters.
    if (charMap.entries[ci].offsetInNode < 0) continue;
    const idx = charToItem[ci];
    if (idx < 0) continue;

    if (idx !== currentItemIdx) {
      // Count how many real chars precede `ci` in this item to find startInItem.
      itemCharOffset = ci - itemStartChars[idx];
      currentItemIdx = idx;
      slices.push({ itemIdx: idx, startInItem: itemCharOffset, endInItem: itemCharOffset + 1 });
    } else {
      itemCharOffset++;
      slices[slices.length - 1].endInItem = itemCharOffset + 1;
    }
  }

  const rects: HighlightRect[] = [];

  for (const slice of slices) {
    const ir = itemRects[slice.itemIdx];
    if (!ir || ir.width === 0) continue;

    const isFullItem = slice.startInItem === 0 && slice.endInItem >= ir.charCount;

    if (isFullItem) {
      rects.push({ left: ir.left, top: ir.top, width: ir.width, height: ir.height });
    } else {
      // Apply charOffsets to the original text width (not the padded ir.width)
      // to avoid distributing horizontal padding across character positions.
      const wordPad = ir.height * 0.12;
      const startFrac = ir.charOffsets[slice.startInItem];
      const endFrac = ir.charOffsets[slice.endInItem];
      const sliceLeft = ir.textLeft + ir.textWidth * startFrac;
      const sliceWidth = ir.textWidth * (endFrac - startFrac);
      rects.push({
        left: sliceLeft - wordPad,
        top: ir.top,
        width: sliceWidth + wordPad * 2,
        height: ir.height,
      });
    }
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
