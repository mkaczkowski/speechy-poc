import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import type { CharMap, SegmentedText } from '@/types';

vi.mock('@/lib', () => ({
  buildCharMap: vi.fn(),
  segmentText: vi.fn(),
  buildItemRects: vi.fn(),
  isBrowser: () => true,
}));

import { useTextMapping } from './useTextMapping';
import { buildCharMap, segmentText } from '@/lib';

const mockBuildCharMap = buildCharMap as ReturnType<typeof vi.fn>;
const mockSegmentText = segmentText as ReturnType<typeof vi.fn>;

const mockCharMap: CharMap = {
  flatText: 'Hello world.',
  entries: [],
};

const mockSegments: SegmentedText = {
  sentences: [{ text: 'Hello world.', startChar: 0, endChar: 12 }],
  words: [
    { text: 'Hello', startChar: 0, endChar: 5 },
    { text: 'world', startChar: 6, endChar: 11 },
  ],
};

const textLayerDiv = document.createElement('div');
const textLayerRef = { current: textLayerDiv };

describe('useTextMapping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBuildCharMap.mockReturnValue(mockCharMap);
    mockSegmentText.mockReturnValue(mockSegments);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null when textLayerReady is false', () => {
    const { result } = renderHook(() =>
      useTextMapping({ textLayerRef, textLayerReady: false, textContent: null, viewport: null }),
    );

    expect(result.current.charMap).toBeNull();
    expect(result.current.segments).toBeNull();
    expect(mockBuildCharMap).not.toHaveBeenCalled();
    expect(mockSegmentText).not.toHaveBeenCalled();
  });

  it('runs mapping when textLayerReady flips to true', async () => {
    const { result, rerender } = renderHook(
      ({ textLayerReady }) => useTextMapping({ textLayerRef, textLayerReady, textContent: null, viewport: null }),
      { initialProps: { textLayerReady: false } },
    );

    expect(result.current.charMap).toBeNull();

    rerender({ textLayerReady: true });

    await waitFor(() => {
      expect(mockBuildCharMap).toHaveBeenCalledWith(textLayerDiv);
      expect(mockSegmentText).toHaveBeenCalledWith('Hello world.');
      expect(result.current.charMap).toBe(mockCharMap);
      expect(result.current.segments).toBe(mockSegments);
    });
  });

  it('resets when textLayerReady goes back to false', async () => {
    const { result, rerender } = renderHook(
      ({ textLayerReady }) => useTextMapping({ textLayerRef, textLayerReady, textContent: null, viewport: null }),
      { initialProps: { textLayerReady: true } },
    );

    await waitFor(() => {
      expect(result.current.charMap).toBe(mockCharMap);
    });

    rerender({ textLayerReady: false });

    expect(result.current.charMap).toBeNull();
    expect(result.current.segments).toBeNull();
  });

  it('does not re-run if textLayerReady stays true', async () => {
    const { rerender } = renderHook(
      ({ textLayerReady }) => useTextMapping({ textLayerRef, textLayerReady, textContent: null, viewport: null }),
      { initialProps: { textLayerReady: true } },
    );

    await waitFor(() => {
      expect(mockBuildCharMap).toHaveBeenCalledTimes(1);
    });

    rerender({ textLayerReady: true });

    expect(mockBuildCharMap).toHaveBeenCalledTimes(1);
  });

  it('cancels scheduled mapping when readiness flips back quickly', () => {
    vi.useFakeTimers();

    const { rerender } = renderHook(
      ({ textLayerReady }) => useTextMapping({ textLayerRef, textLayerReady, textContent: null, viewport: null }),
      { initialProps: { textLayerReady: false } },
    );

    rerender({ textLayerReady: true });
    rerender({ textLayerReady: false });

    vi.runAllTimers();
    expect(mockBuildCharMap).not.toHaveBeenCalled();
    expect(mockSegmentText).not.toHaveBeenCalled();
  });
});
