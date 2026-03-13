import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { mockAnimationFrameQueue, mockSpeechSynthesis } from '@/test';
import type { SegmentedText } from '@/types';

const mockPlay = vi.fn();
const mockPause = vi.fn();
const mockResume = vi.fn();
const mockStop = vi.fn();
const mockReset = vi.fn();
const mockSetCurrentIndices = vi.fn();

vi.mock('@/stores', () => ({
  useTtsStore: Object.assign(vi.fn(), {
    getState: vi.fn(() => ({
      rate: 1,
      selectedVoice: null,
      play: mockPlay,
      pause: mockPause,
      resume: mockResume,
      stop: mockStop,
      reset: mockReset,
      setCurrentIndices: mockSetCurrentIndices,
    })),
  }),
}));

const mockFindSegmentIndex = vi.fn().mockReturnValue(0);
const mockIsSpeechSynthesisSupported = vi.fn(() => true);
vi.mock('@/lib/textMapping', () => ({
  findSegmentIndex: (...args: unknown[]) => mockFindSegmentIndex(...args),
}));

vi.mock('@/lib/browser', () => ({
  isSpeechSynthesisSupported: () => mockIsSpeechSynthesisSupported(),
}));

const sampleSegments: SegmentedText = {
  sentences: [{ text: 'Hello world.', startChar: 0, endChar: 12 }],
  words: [
    { text: 'Hello', startChar: 0, endChar: 5 },
    { text: 'world', startChar: 6, endChar: 11 },
  ],
};

type MockUtterance = ReturnType<typeof mockSpeechSynthesis>['utteranceInstances'][number];

async function importHook() {
  const { useSpeechSynthesis } = await import('./useSpeechSynthesis');
  return useSpeechSynthesis;
}

describe('useSpeechSynthesis', () => {
  let speechMock: ReturnType<typeof mockSpeechSynthesis>;
  let animationFrameQueue: ReturnType<typeof mockAnimationFrameQueue>;

  beforeEach(() => {
    speechMock = mockSpeechSynthesis();
    vi.clearAllMocks();
    mockIsSpeechSynthesisSupported.mockReturnValue(true);
    animationFrameQueue = mockAnimationFrameQueue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('play() creates utterance and starts speech with store state sync', async () => {
    const useSpeechSynthesis = await importHook();
    const { result } = renderHook(() =>
      useSpeechSynthesis({ flatText: 'Hello world.', segments: sampleSegments }),
    );

    act(() => {
      result.current.play();
    });

    expect(speechMock.cancel).toHaveBeenCalled();
    expect(speechMock.speak).toHaveBeenCalled();
    expect(speechMock.utteranceInstances[0].text).toBe('Hello world.');
    expect(mockPlay).toHaveBeenCalled();
  });

  it('play(startOffset) offsets utterance text and word boundary indices', async () => {
    const useSpeechSynthesis = await importHook();
    mockFindSegmentIndex.mockReturnValueOnce(1).mockReturnValueOnce(0);

    const { result } = renderHook(() =>
      useSpeechSynthesis({ flatText: 'Hello world.', segments: sampleSegments }),
    );

    act(() => {
      result.current.play(6);
    });

    const utterance = speechMock.utteranceInstances[0];
    expect(utterance.text).toBe('world.');

    act(() => {
      utterance.onboundary!({ name: 'word', charIndex: 0 });
    });
    act(() => {
      animationFrameQueue.flush();
    });
    expect(mockSetCurrentIndices).toHaveBeenCalledWith(6, 1, 0);
  });

  it('play() normalizes invalid startOffset values to zero', async () => {
    const useSpeechSynthesis = await importHook();
    const { result } = renderHook(() =>
      useSpeechSynthesis({ flatText: 'Hello world.', segments: sampleSegments }),
    );

    act(() => {
      result.current.play({} as unknown as number);
    });

    const utterance = speechMock.utteranceInstances[0];
    expect(utterance.text).toBe('Hello world.');

    act(() => {
      utterance.onboundary!({ name: 'word', charIndex: 0 });
    });
    act(() => {
      animationFrameQueue.flush();
    });
    expect(mockSetCurrentIndices).toHaveBeenCalledWith(0, 0, 0);
  });

  it.each([
    { boundaryName: 'sentence', shouldUpdate: false },
    { boundaryName: 'word', shouldUpdate: true },
  ])('boundary "$boundaryName" updates store: $shouldUpdate', async ({ boundaryName, shouldUpdate }) => {
    const useSpeechSynthesis = await importHook();
    const { result } = renderHook(() =>
      useSpeechSynthesis({ flatText: 'Hello world.', segments: sampleSegments }),
    );

    act(() => {
      result.current.play();
    });

    mockSetCurrentIndices.mockClear();
    act(() => {
      speechMock.utteranceInstances[0].onboundary!({ name: boundaryName, charIndex: 0 });
    });
    act(() => {
      animationFrameQueue.flush();
    });

    if (shouldUpdate) {
      expect(mockSetCurrentIndices).toHaveBeenCalled();
    } else {
      expect(mockSetCurrentIndices).not.toHaveBeenCalled();
    }
  });

  it.each([
    { label: 'flatText is null', flatText: null, segments: sampleSegments },
    { label: 'segments are null', flatText: 'Hello world.', segments: null },
  ])('play() is a no-op when $label', async ({ flatText, segments }) => {
    const useSpeechSynthesis = await importHook();
    const { result } = renderHook(() => useSpeechSynthesis({ flatText, segments }));

    act(() => {
      result.current.play();
    });

    expect(speechMock.speak).not.toHaveBeenCalled();
  });

  it('play() is a no-op when speech synthesis is unsupported', async () => {
    mockIsSpeechSynthesisSupported.mockReturnValue(false);
    const useSpeechSynthesis = await importHook();
    const { result } = renderHook(() =>
      useSpeechSynthesis({ flatText: 'Hello world.', segments: sampleSegments }),
    );

    act(() => {
      result.current.play();
    });

    expect(speechMock.speak).not.toHaveBeenCalled();
    expect(mockPlay).not.toHaveBeenCalled();
  });

  it.each([
    {
      action: 'pause',
      invoke: (controls: { pause: () => void }) => controls.pause(),
      speechCall: () => speechMock.pause,
      storeCall: mockPause,
    },
    {
      action: 'resume',
      invoke: (controls: { resume: () => void }) => controls.resume(),
      speechCall: () => speechMock.resume,
      storeCall: mockResume,
    },
    {
      action: 'stop',
      invoke: (controls: { stop: () => void }) => controls.stop(),
      speechCall: () => speechMock.cancel,
      storeCall: mockStop,
    },
  ])('$action() delegates to speech API and store', async ({ invoke, speechCall, storeCall }) => {
    const useSpeechSynthesis = await importHook();
    const { result } = renderHook(() =>
      useSpeechSynthesis({ flatText: 'Hello world.', segments: sampleSegments }),
    );

    act(() => {
      invoke(result.current);
    });

    expect(speechCall()).toHaveBeenCalled();
    expect(storeCall).toHaveBeenCalled();
  });

  it.each([
    {
      event: 'onend',
      trigger: (utterance: MockUtterance) => utterance.onend?.(),
      expectReset: true,
    },
    {
      event: 'onerror(network)',
      trigger: (utterance: MockUtterance) => utterance.onerror?.({ error: 'network' }),
      expectReset: true,
    },
    {
      event: 'onerror(canceled)',
      trigger: (utterance: MockUtterance) => utterance.onerror?.({ error: 'canceled' }),
      expectReset: false,
    },
  ])('$event reset behavior is correct', async ({ trigger, expectReset }) => {
    const useSpeechSynthesis = await importHook();
    const { result } = renderHook(() =>
      useSpeechSynthesis({ flatText: 'Hello world.', segments: sampleSegments }),
    );

    act(() => {
      result.current.play();
    });

    mockReset.mockClear();
    act(() => {
      trigger(speechMock.utteranceInstances[0]);
    });

    if (expectReset) {
      expect(mockReset).toHaveBeenCalled();
    } else {
      expect(mockReset).not.toHaveBeenCalled();
    }
  });

  it('batches rapid boundary updates into one store write per animation frame', async () => {
    const useSpeechSynthesis = await importHook();
    const { result } = renderHook(() =>
      useSpeechSynthesis({ flatText: 'Hello world.', segments: sampleSegments }),
    );

    act(() => {
      result.current.play();
    });

    mockSetCurrentIndices.mockClear();
    act(() => {
      const utterance = speechMock.utteranceInstances[0];
      utterance.onboundary?.({ name: 'word', charIndex: 1 });
      utterance.onboundary?.({ name: 'word', charIndex: 2 });
      utterance.onboundary?.({ name: 'word', charIndex: 3 });
    });

    expect(mockSetCurrentIndices).not.toHaveBeenCalled();
    act(() => {
      animationFrameQueue.flush();
    });
    expect(mockSetCurrentIndices).toHaveBeenCalledTimes(1);
    expect(mockSetCurrentIndices).toHaveBeenLastCalledWith(3, 0, 0);
  });

  it('ignores stale boundary callbacks after playback is stopped', async () => {
    const useSpeechSynthesis = await importHook();
    const { result } = renderHook(() =>
      useSpeechSynthesis({ flatText: 'Hello world.', segments: sampleSegments }),
    );

    act(() => {
      result.current.play();
    });
    const staleUtterance = speechMock.utteranceInstances[0];

    act(() => {
      result.current.stop();
    });

    mockSetCurrentIndices.mockClear();
    act(() => {
      staleUtterance.onboundary?.({ name: 'word', charIndex: 4 });
      animationFrameQueue.flush();
    });

    expect(mockSetCurrentIndices).not.toHaveBeenCalled();
  });

  it('loads voices from speechSynthesis', async () => {
    const mockVoice = { name: 'Test Voice', lang: 'en-US' } as SpeechSynthesisVoice;
    speechMock.getVoices.mockReturnValue([mockVoice]);

    const useSpeechSynthesis = await importHook();
    const { result } = renderHook(() =>
      useSpeechSynthesis({ flatText: 'Hello world.', segments: sampleSegments }),
    );

    expect(result.current.voices).toEqual([mockVoice]);
  });

  it('cancels active speech on unmount', async () => {
    const useSpeechSynthesis = await importHook();
    const { unmount } = renderHook(() =>
      useSpeechSynthesis({ flatText: 'Hello world.', segments: sampleSegments }),
    );

    speechMock.cancel.mockClear();
    unmount();

    expect(speechMock.cancel).toHaveBeenCalled();
  });
});
