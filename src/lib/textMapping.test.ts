import { beforeEach, describe, expect, it } from 'vitest';

import { buildCharMap, computeHighlightRects, findCharIndex, findSegmentIndex, segmentText } from '@/lib/textMapping';
import type { CharMap, TextSegment } from '@/types/pdf';

function makeTextLayer(texts: string[]): HTMLElement {
  const container = document.createElement('div');
  for (const text of texts) {
    const span = document.createElement('span');
    span.textContent = text;
    container.appendChild(span);
  }
  return container;
}

describe('buildCharMap', () => {
  it.each([
    { texts: ['Hello', 'world'], expectedText: 'Hello world', expectedLength: 11 },
    { texts: ['Only'], expectedText: 'Only', expectedLength: 4 },
    { texts: ['A', '', 'B'], expectedText: 'A B', expectedLength: 3 },
  ])('normalizes spans for $texts', ({ texts, expectedText, expectedLength }) => {
    const charMap = buildCharMap(makeTextLayer(texts));
    expect(charMap.flatText).toBe(expectedText);
    expect(charMap.entries).toHaveLength(expectedLength);
  });

  it('returns an empty map for an empty container', () => {
    const charMap = buildCharMap(document.createElement('div'));
    expect(charMap.flatText).toBe('');
    expect(charMap.entries).toHaveLength(0);
  });

  it('marks inserted normalization spaces with synthetic offset', () => {
    const charMap = buildCharMap(makeTextLayer(['AB', 'CD']));
    expect(charMap.entries[2].offsetInNode).toBe(-1);
  });
});

describe('segmentText', () => {
  it('segments text into sentence and word ranges that map back to source text', () => {
    const text = 'Hello world. How are you?';
    const result = segmentText(text);

    expect(result.sentences.length).toBeGreaterThanOrEqual(2);
    expect(result.words.map((word) => word.text)).toEqual(expect.arrayContaining(['Hello', 'world', 'How']));

    for (const sentence of result.sentences) {
      expect(text.slice(sentence.startChar, sentence.endChar)).toBe(sentence.text);
    }
    for (const word of result.words) {
      expect(text.slice(word.startChar, word.endChar)).toBe(word.text);
    }
  });

  it.each([
    { input: 'Hello, world!', expectedWords: ['Hello', 'world'] },
    { input: 'One-word', expectedWords: ['One', 'word'] },
  ])('extracts only word-like tokens for "$input"', ({ input, expectedWords }) => {
    const result = segmentText(input);
    expect(result.words.map((word) => word.text)).toEqual(expectedWords);
  });

  it('returns no segments for empty text', () => {
    const result = segmentText('');
    expect(result.sentences).toHaveLength(0);
    expect(result.words).toHaveLength(0);
  });
});

describe('findSegmentIndex', () => {
  const segments: TextSegment[] = [
    { text: 'Hello', startChar: 0, endChar: 5 },
    { text: 'world', startChar: 6, endChar: 11 },
    { text: 'foo', startChar: 12, endChar: 15 },
  ];

  it.each([
    { charIndex: 0, expected: 0 },
    { charIndex: 4, expected: 0 },
    { charIndex: 7, expected: 1 },
    { charIndex: 14, expected: 2 },
    { charIndex: 5, expected: -1 },
    { charIndex: 20, expected: -1 },
  ])('returns $expected for char index $charIndex', ({ charIndex, expected }) => {
    expect(findSegmentIndex(segments, charIndex)).toBe(expected);
  });

  it('returns -1 for empty segment list', () => {
    expect(findSegmentIndex([], 0)).toBe(-1);
  });
});

describe('findCharIndex', () => {
  it.each([
    { texts: ['AB', 'CD'], entryIndex: 3, offset: 0, expected: 3 },
    { texts: ['A', 'B'], entryIndex: 1, offset: -1, expected: 1 },
    { texts: ['AB'], entryIndex: 0, offset: 99, expected: -1 },
  ])(
    'returns $expected for node/offset lookup (texts: $texts, entry: $entryIndex, offset: $offset)',
    ({ texts, entryIndex, offset, expected }) => {
      const charMap = buildCharMap(makeTextLayer(texts));
      const node = charMap.entries[entryIndex].node;
      expect(findCharIndex(charMap, node, offset)).toBe(expected);
    },
  );

  it('returns -1 for foreign nodes', () => {
    const charMap = buildCharMap(makeTextLayer(['Hi']));
    expect(findCharIndex(charMap, document.createTextNode('nope'), 0)).toBe(-1);
  });
});

describe('computeHighlightRects', () => {
  let charMap: CharMap;

  // Helper: build simple itemRects and charToItem from the charMap.
  // Each span becomes one ItemRect positioned at the given coords.
  function makeItemData(rects: { left: number; top: number; width: number; height: number }[]) {
    const itemRects = rects.map((r, idx) => {
      // Count chars belonging to this item.
      let count = 0;
      let itemIdx = 0;
      let prevNode: Text | null = null;
      for (const entry of charMap.entries) {
        if (entry.offsetInNode < 0) continue;
        if (entry.node !== prevNode) {
          if (prevNode !== null) itemIdx++;
          prevNode = entry.node;
        }
        if (itemIdx === idx) count++;
      }
      // Equal-width charOffsets for tests (no font measurement in jsdom).
      const charOffsets = new Float32Array(count + 1);
      for (let i = 0; i <= count; i++) {
        charOffsets[i] = i / count;
      }
      return { ...r, charCount: count, textLeft: r.left, textWidth: r.width, charOffsets };
    });

    const charToItem = new Int32Array(charMap.entries.length).fill(-1);
    const itemStartChars = new Int32Array(itemRects.length).fill(-1);
    let itemIdx = 0;
    let prevNode: Text | null = null;
    for (let ci = 0; ci < charMap.entries.length; ci++) {
      const entry = charMap.entries[ci];
      if (entry.offsetInNode < 0) continue;
      if (entry.node !== prevNode) {
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
    // Back-fill synthetic spaces.
    for (let ci = charMap.entries.length - 1; ci >= 0; ci--) {
      if (charToItem[ci] === -1 && ci + 1 < charToItem.length) {
        charToItem[ci] = charToItem[ci + 1];
      }
    }

    return { itemRects, charToItem, itemStartChars };
  }

  beforeEach(() => {
    const containerEl = makeTextLayer(['Hello', 'world']);
    document.body.appendChild(containerEl);
    charMap = buildCharMap(containerEl);
  });

  it('returns item rect for a full-item range', () => {
    const { itemRects, charToItem, itemStartChars } = makeItemData([
      { left: 10, top: 20, width: 50, height: 16 },
      { left: 70, top: 20, width: 60, height: 16 },
    ]);

    // "Hello" occupies chars 0..4 — the full first item.
    const rects = computeHighlightRects(charMap, 0, 5, itemRects, charToItem, itemStartChars);
    expect(rects).toEqual([{ left: 10, top: 20, width: 50, height: 16 }]);
  });

  it('returns one rect per item for a multi-item range', () => {
    const { itemRects, charToItem, itemStartChars } = makeItemData([
      { left: 10, top: 20, width: 50, height: 16 },
      { left: 70, top: 20, width: 60, height: 16 },
    ]);

    // "Hello world" — chars 0..11, covers both items fully.
    const rects = computeHighlightRects(charMap, 0, 11, itemRects, charToItem, itemStartChars);
    expect(rects).toHaveLength(2);
    expect(rects).toEqual([
      { left: 10, top: 20, width: 50, height: 16 },
      { left: 70, top: 20, width: 60, height: 16 },
    ]);
  });

  it('filters out zero-sized item rects', () => {
    const { itemRects, charToItem, itemStartChars } = makeItemData([
      { left: 0, top: 0, width: 0, height: 0 },
      { left: 30, top: 40, width: 50, height: 16 },
    ]);

    const rects = computeHighlightRects(charMap, 0, 11, itemRects, charToItem, itemStartChars);
    expect(rects).toHaveLength(1);
    expect(rects[0].width).toBe(50);
  });

  it('returns empty array when itemRects are not provided', () => {
    expect(computeHighlightRects(charMap, 0, 5, null, null, null)).toEqual([]);
  });

  it.each([
    { startChar: 5, endChar: 5 },
    { startChar: 5, endChar: 3 },
    { startChar: -1, endChar: 5 },
    { startChar: 0, endChar: 1000 },
  ])('returns empty array for invalid range ($startChar, $endChar)', ({ startChar, endChar }) => {
    expect(computeHighlightRects(charMap, startChar, endChar, null, null, null)).toEqual([]);
  });
});

describe('performance guardrails', () => {
  it('builds stable char maps for large text layers', () => {
    const manySpans = Array.from({ length: 1500 }, (_, index) => `Word${index}`);
    const charMap = buildCharMap(makeTextLayer(manySpans));

    expect(charMap.entries.length).toBe(charMap.flatText.length);
    expect(charMap.nodeOffsetIndex).toBeDefined();

    const lastEntry = charMap.entries[charMap.entries.length - 1];
    expect(findCharIndex(charMap, lastEntry.node, lastEntry.offsetInNode)).toBe(charMap.entries.length - 1);
  });

  it('uses reverse node/offset index for fast char lookup when available', () => {
    const node = document.createTextNode('abc');
    const proxyEntries = new Proxy([] as CharMap['entries'], {
      get() {
        throw new Error('Fallback scan should not run when reverse index exists');
      },
    });
    const nodeOffsetIndex = new WeakMap<Text, Map<number, number>>();
    nodeOffsetIndex.set(node, new Map([[2, 42]]));

    const charMap: CharMap = {
      flatText: 'abc',
      entries: proxyEntries,
      nodeOffsetIndex,
    };

    expect(findCharIndex(charMap, node, 2)).toBe(42);
  });

  it('segments large text payloads without dropping sentence/word coverage', () => {
    const text = `${Array.from({ length: 6000 }, () => 'token').join(' ')}.`;
    const segmented = segmentText(text);

    expect(segmented.sentences.length).toBeGreaterThan(0);
    expect(segmented.words.length).toBeGreaterThan(5000);
    expect(segmented.words[0].text.toLowerCase()).toBe('token');
  });
});
