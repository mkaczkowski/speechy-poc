import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CharMap, HighlightRect, SegmentedText } from '@/types';

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
    containerEl: HTMLElement,
    containerRect?: DOMRect,
  ) => HighlightRect[]
>();

vi.mock('@/lib', () => ({
  computeHighlightRects: (...args: [CharMap, number, number, HTMLElement, DOMRect | undefined]) =>
    mockComputeHighlightRects(...args),
}));

import { useHighlightSync } from './useHighlightSync';

const sampleCharMap: CharMap = {
  flatText: 'Hello world. Goodbye.',
  entries: Array.from({ length: 21 }, (_, i) => ({ node: document.createTextNode(''), offsetInNode: i })),
};

const sampleSegments: SegmentedText = {
  sentences: [
    { text: 'Hello world. ', startChar: 0, endChar: 13 },
    { text: 'Goodbye.', startChar: 13, endChar: 21 },
  ],
  words: [{ text: 'world', startChar: 6, endChar: 11 }],
};

const sampleRects: HighlightRect[] = [{ left: 10, top: 20, width: 100, height: 16 }];
const rafQueue = new Map<number, FrameRequestCallback>();
let nextRafId = 1;
let resizeObserverCallback: ResizeObserverCallback | null = null;

function flushRaf() {
  const callbacks = Array.from(rafQueue.values());
  rafQueue.clear();
  for (const callback of callbacks) {
    callback(performance.now());
  }
}

describe('useHighlightSync', () => {
  let container: HTMLDivElement;
  let containerRectSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    rafQueue.clear();
    nextRafId = 1;
    resizeObserverCallback = null;
    mockStoreState.currentSentenceIndex = -1;
    mockStoreState.currentWordIndex = -1;
    mockStoreState.isPlaying = false;
    mockStoreState.isPaused = false;
    mockComputeHighlightRects.mockReturnValue(sampleRects);

    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        const id = nextRafId++;
        rafQueue.set(id, callback);
        return id;
      }),
    );
    vi.stubGlobal(
      'cancelAnimationFrame',
      vi.fn((id: number) => {
        rafQueue.delete(id);
      }),
    );
    vi.stubGlobal(
      'ResizeObserver',
      class ResizeObserverMock {
        constructor(callback: ResizeObserverCallback) {
          resizeObserverCallback = callback;
        }

        observe() {}

        disconnect() {}
      },
    );

    container = document.createElement('div');
    containerRectSpy = vi
      .spyOn(container, 'getBoundingClientRect')
      .mockReturnValue(new DOMRect(0, 0, 800, 1000));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns no highlights when playback is inactive', () => {
    mockStoreState.currentSentenceIndex = 0;
    const { result } = renderHook(() =>
      useHighlightSync({ charMap: sampleCharMap, segments: sampleSegments, container }),
    );
    expect(result.current.sentenceRects).toEqual([]);
    expect(result.current.wordRects).toEqual([]);
  });

  it('computes sentence and word highlights when playback is active', () => {
    mockStoreState.isPlaying = true;
    mockStoreState.currentSentenceIndex = 0;
    mockStoreState.currentWordIndex = 0;

    const { result } = renderHook(() =>
      useHighlightSync({ charMap: sampleCharMap, segments: sampleSegments, container }),
    );

    expect(result.current.sentenceRects).toEqual(sampleRects);
    expect(result.current.wordRects).toEqual(sampleRects);

    const firstCall = mockComputeHighlightRects.mock.calls[0];
    const secondCall = mockComputeHighlightRects.mock.calls[1];
    expect(firstCall?.[0]).toBe(sampleCharMap);
    expect(firstCall?.[1]).toBe(0);
    expect(firstCall?.[2]).toBe(13);
    expect(firstCall?.[3]).toBe(container);
    expect(secondCall?.[0]).toBe(sampleCharMap);
    expect(secondCall?.[1]).toBe(6);
    expect(secondCall?.[2]).toBe(11);
    expect(secondCall?.[3]).toBe(container);
  });

  it('reuses cached container rect between high-frequency index updates', () => {
    mockStoreState.isPlaying = true;
    mockStoreState.currentSentenceIndex = 0;

    const { rerender } = renderHook(() =>
      useHighlightSync({ charMap: sampleCharMap, segments: sampleSegments, container }),
    );

    act(() => {
      flushRaf();
    });
    const baselineCalls = containerRectSpy.mock.calls.length;
    expect(baselineCalls).toBeGreaterThan(0);

    mockStoreState.currentWordIndex = 0;
    rerender();
    expect(containerRectSpy.mock.calls.length).toBe(baselineCalls);

    act(() => {
      resizeObserverCallback?.(
        [{ target: container, contentRect: { width: 840 } as DOMRectReadOnly } as unknown as ResizeObserverEntry],
        {} as ResizeObserver,
      );
      flushRaf();
    });
    expect(containerRectSpy.mock.calls.length).toBe(baselineCalls + 1);
  });
});
