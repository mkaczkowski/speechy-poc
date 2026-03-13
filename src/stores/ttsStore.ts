import { create } from 'zustand';

import { createSelectors } from '@/lib/createSelectors';

interface TtsState {
  isPlaying: boolean;
  isPaused: boolean;
  currentCharIndex: number;
  currentWordIndex: number;
  currentSentenceIndex: number;
  rate: number;
  selectedVoice: SpeechSynthesisVoice | null;

  play: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setCurrentIndices: (charIndex: number, wordIndex: number, sentenceIndex: number) => void;
  setRate: (rate: number) => void;
  setSelectedVoice: (voice: SpeechSynthesisVoice | null) => void;
  reset: () => void;
}

const initialState = {
  isPlaying: false,
  isPaused: false,
  currentCharIndex: -1,
  currentWordIndex: -1,
  currentSentenceIndex: -1,
  rate: 1,
  selectedVoice: null,
};

const useStoreBase = create<TtsState>()((set, get) => ({
  ...initialState,

  play: () => set({ isPlaying: true, isPaused: false }),

  pause: () => set({ isPaused: true }),

  resume: () => set({ isPaused: false }),

  stop: () =>
    set({
      isPlaying: false,
      isPaused: false,
      currentCharIndex: -1,
      currentWordIndex: -1,
      currentSentenceIndex: -1,
    }),

  setCurrentIndices: (charIndex: number, wordIndex: number, sentenceIndex: number) =>
    set((state) => {
      // Ignore no-op updates to prevent unnecessary selector notifications.
      if (
        state.currentCharIndex === charIndex &&
        state.currentWordIndex === wordIndex &&
        state.currentSentenceIndex === sentenceIndex
      ) {
        return state;
      }
      return {
        currentCharIndex: charIndex,
        currentWordIndex: wordIndex,
        currentSentenceIndex: sentenceIndex,
      };
    }),

  setRate: (rate: number) => set({ rate }),

  setSelectedVoice: (voice: SpeechSynthesisVoice | null) => set({ selectedVoice: voice }),

  reset() {
    // Keep reset semantics centralized through stop() so all playback flags/indices clear together.
    get().stop();
  },
}));

/**
 * Central TTS playback store for transport controls, voice settings, and active
 * text indices.
 *
 * Usage policy:
 * - Render-time reads: use `useTtsStore.use.*` selectors for reactive subscriptions.
 * - Imperative writes/actions (event handlers, effects, callbacks, tests): call
 *   actions via `useTtsStore.getState().*`.
 */
export const useTtsStore = createSelectors(useStoreBase);
