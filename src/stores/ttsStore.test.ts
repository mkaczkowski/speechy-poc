import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useTtsStore } from '@/stores/ttsStore';

describe('useTtsStore', () => {
  beforeEach(() => {
    act(() => {
      useTtsStore.getState().reset();
      useTtsStore.getState().setRate(1);
      useTtsStore.getState().setSelectedVoice(null);
    });
  });

  it('starts with expected defaults', () => {
    const state = useTtsStore.getState();

    expect(state.isPlaying).toBe(false);
    expect(state.isPaused).toBe(false);
    expect(state.currentCharIndex).toBe(-1);
    expect(state.currentWordIndex).toBe(-1);
    expect(state.currentSentenceIndex).toBe(-1);
    expect(state.rate).toBe(1);
    expect(state.selectedVoice).toBeNull();
  });

  it('supports the core play lifecycle and index reset on stop', () => {
    const state = useTtsStore.getState();

    act(() => {
      state.play();
      state.setCurrentIndices(12, 3, 1);
      state.pause();
    });

    expect(useTtsStore.getState().isPlaying).toBe(true);
    expect(useTtsStore.getState().isPaused).toBe(true);
    expect(useTtsStore.getState().currentCharIndex).toBe(12);

    act(() => {
      useTtsStore.getState().resume();
      useTtsStore.getState().stop();
    });

    expect(useTtsStore.getState().isPlaying).toBe(false);
    expect(useTtsStore.getState().isPaused).toBe(false);
    expect(useTtsStore.getState().currentCharIndex).toBe(-1);
    expect(useTtsStore.getState().currentWordIndex).toBe(-1);
    expect(useTtsStore.getState().currentSentenceIndex).toBe(-1);
  });

  it.each([
    { rate: 0.75 },
    { rate: 1.25 },
    { rate: 2 },
  ])('updates playback rate to $rate', ({ rate }) => {
    act(() => {
      useTtsStore.getState().setRate(rate);
    });
    expect(useTtsStore.getState().rate).toBe(rate);
  });

  it('updates selected voice and allows clearing it', () => {
    const voice = { name: 'Test Voice' } as SpeechSynthesisVoice;

    act(() => {
      useTtsStore.getState().setSelectedVoice(voice);
    });
    expect(useTtsStore.getState().selectedVoice).toBe(voice);

    act(() => {
      useTtsStore.getState().setSelectedVoice(null);
    });
    expect(useTtsStore.getState().selectedVoice).toBeNull();
  });

  it('reset clears playback state but preserves preferences', () => {
    const voice = { name: 'Voice A' } as SpeechSynthesisVoice;

    act(() => {
      useTtsStore.getState().play();
      useTtsStore.getState().setCurrentIndices(7, 2, 0);
      useTtsStore.getState().setRate(1.5);
      useTtsStore.getState().setSelectedVoice(voice);
      useTtsStore.getState().reset();
    });

    const state = useTtsStore.getState();
    expect(state.isPlaying).toBe(false);
    expect(state.currentCharIndex).toBe(-1);
    expect(state.rate).toBe(1.5);
    expect(state.selectedVoice).toBe(voice);
  });

  it('exposes selector hooks through the use namespace', () => {
    const { result: isPlayingResult } = renderHook(() => useTtsStore.use.isPlaying());
    const { result: rateResult } = renderHook(() => useTtsStore.use.rate());

    expect(isPlayingResult.current).toBe(false);
    expect(rateResult.current).toBe(1);
  });
});
