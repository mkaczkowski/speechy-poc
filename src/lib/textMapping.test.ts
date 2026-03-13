import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  let containerEl: HTMLElement;

  beforeEach(() => {
    containerEl = makeTextLayer(['Hello', 'world']);
    document.body.appendChild(containerEl);
    charMap = buildCharMap(containerEl);

    if (!Range.prototype.getClientRects) {
      Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
    }
  });

  it('maps browser rects into container-relative highlight rects', () => {
    vi.spyOn(Range.prototype, 'getClientRects').mockReturnValue(
      [{ left: 110, top: 220, width: 50, height: 16 }] as unknown as DOMRectList,
    );
    vi.spyOn(containerEl, 'getBoundingClientRect').mockReturnValue({ left: 100, top: 200 } as DOMRect);

    expect(computeHighlightRects(charMap, 0, 5, containerEl)).toEqual([
      { left: 10, top: 20, width: 50, height: 16 },
    ]);
  });

  it('filters out zero-sized browser rects', () => {
    vi.spyOn(Range.prototype, 'getClientRects').mockReturnValue(
      [
        { left: 10, top: 20, width: 0, height: 0 },
        { left: 30, top: 40, width: 50, height: 16 },
      ] as unknown as DOMRectList,
    );
    vi.spyOn(containerEl, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0 } as DOMRect);

    const rects = computeHighlightRects(charMap, 0, 5, containerEl);
    expect(rects).toHaveLength(1);
    expect(rects[0].width).toBe(50);
  });

  it.each([
    { startChar: 5, endChar: 5 },
    { startChar: 5, endChar: 3 },
    { startChar: -1, endChar: 5 },
    { startChar: 0, endChar: 1000 },
  ])('returns empty array for invalid range ($startChar, $endChar)', ({ startChar, endChar }) => {
    expect(computeHighlightRects(charMap, startChar, endChar, containerEl)).toEqual([]);
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
