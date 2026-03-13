import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CharMap, HighlightRect, ItemRect, SegmentedText } from '@/types';

const mockStoreState = {
  currentSentenceIndex: -1,
  currentWordIndex: -1,
  isPlaying: false,
  isPaused: false,
};

vi.mock('@/stores', () => ({
  useTtsStore: Object.assign(vi.fn(), {
    use: {
      currentSentenceIndex: () => mockStoreState.currentSentenceIndex,
      currentWordIndex: () => mockStoreState.currentWordIndex,
      isPlaying: () => mockStoreState.isPlaying,
      isPaused: () => mockStoreState.isPaused,
    },
  }),
}));

const mockComputeHighlightRects = vi.fn<
  (
    charMap: CharMap,
    startChar: number,
    endChar: number,
    itemRects: ItemRect[] | null,
    charToItem: Int32Array | null,
    itemStartChars: Int32Array | null,
  ) => HighlightRect[]
>();

vi.mock('@/lib', () => ({
  computeHighlightRects: (...args: [CharMap, number, number, ItemRect[] | null, Int32Array | null, Int32Array | null]) =>
    mockComputeHighlightRects(...args),
}));

import { useHighlightSync } from './useHighlightSync';

const sampleCharMap: CharMap = {
  flatText: 'Hello world. Goodbye.',
  entries: Array.from({ length: 21 }, (_, i) => ({ node: document.createTextNode(''), offsetInNode: i })),
};

const sampleSegments: SegmentedText = {
  sentences: [
    { text: 'Hello world.', startChar: 0, endChar: 12 },
    { text: 'Goodbye.', startChar: 13, endChar: 21 },
  ],
  words: [{ text: 'world', startChar: 6, endChar: 11 }],
};

const sampleRects: HighlightRect[] = [{ left: 10, top: 20, width: 100, height: 16 }];

const hookParams = {
  charMap: sampleCharMap,
  segments: sampleSegments,
  container: null as HTMLDivElement | null,
  itemRects: null,
  charToItem: null,
  itemStartChars: null,
};

describe('useHighlightSync', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState.currentSentenceIndex = -1;
    mockStoreState.currentWordIndex = -1;
    mockStoreState.isPlaying = false;
    mockStoreState.isPaused = false;
    mockComputeHighlightRects.mockReturnValue(sampleRects);

    container = document.createElement('div');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns no highlights when playback is inactive', () => {
    mockStoreState.currentSentenceIndex = 0;
    const { result } = renderHook(() =>
      useHighlightSync({ ...hookParams, container }),
    );
    expect(result.current.sentenceRects).toEqual([]);
    expect(result.current.wordRects).toEqual([]);
  });

  it('computes sentence and word highlights when playback is active', () => {
    mockStoreState.isPlaying = true;
    mockStoreState.currentSentenceIndex = 0;
    mockStoreState.currentWordIndex = 0;

    const { result } = renderHook(() =>
      useHighlightSync({ ...hookParams, container }),
    );

    expect(result.current.sentenceRects).toEqual(sampleRects);
    expect(result.current.wordRects).toEqual(sampleRects);

    const firstCall = mockComputeHighlightRects.mock.calls[0];
    const secondCall = mockComputeHighlightRects.mock.calls[1];
    expect(firstCall?.[0]).toBe(sampleCharMap);
    expect(firstCall?.[1]).toBe(0);
    expect(firstCall?.[2]).toBe(12);
    expect(secondCall?.[0]).toBe(sampleCharMap);
    expect(secondCall?.[1]).toBe(6);
    expect(secondCall?.[2]).toBe(11);
  });

  it('does not recompute when only container changes', () => {
    mockStoreState.isPlaying = true;
    mockStoreState.currentSentenceIndex = 0;

    const { rerender } = renderHook(
      ({ cont }) =>
        useHighlightSync({ ...hookParams, container: cont }),
      { initialProps: { cont: container } },
    );

    const callsAfterFirst = mockComputeHighlightRects.mock.calls.length;

    // Changing container should not trigger recompute of rects (container is only used for scrolling).
    const newContainer = document.createElement('div');
    rerender({ cont: newContainer });
    expect(mockComputeHighlightRects.mock.calls.length).toBe(callsAfterFirst);
  });
});
