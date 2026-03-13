import { useCallback, useEffect, useRef, useState } from 'react';

import { isSpeechSynthesisSupported } from '@/lib/browser';
import { findSegmentIndex } from '@/lib/textMapping';
import { useTtsStore } from '@/stores';
import type { SegmentedText } from '@/types';

interface UseSpeechSynthesisParams {
  flatText: string | null;
  segments: SegmentedText | null;
}

interface PendingIndices {
  charIndex: number;
  wordIndex: number;
  sentenceIndex: number;
}

function normalizeStartOffset(startOffset: unknown, textLength: number): number {
  if (typeof startOffset !== 'number' || !Number.isFinite(startOffset)) {
    return 0;
  }
  const normalized = Math.trunc(startOffset);
  if (normalized <= 0) return 0;
  if (normalized >= textLength) return textLength;
  return normalized;
}

function useSpeechVoices() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (!isSpeechSynthesisSupported()) return;

    const loadVoices = () => {
      const available = speechSynthesis.getVoices();
      if (available.length > 0) setVoices(available);
    };

    loadVoices();
    speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => {
      speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, []);

  return voices;
}

function useQueuedIndicesUpdate() {
  const pendingIndicesRef = useRef<PendingIndices | null>(null);
  const frameRef = useRef<number | null>(null);

  const clearPendingIndices = useCallback(() => {
    pendingIndicesRef.current = null;
    if (frameRef.current === null) return;
    cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
  }, []);

  const queueIndicesUpdate = useCallback((charIndex: number, wordIndex: number, sentenceIndex: number) => {
    // Keep only the latest boundary event and flush once per frame.
    pendingIndicesRef.current = { charIndex, wordIndex, sentenceIndex };
    if (frameRef.current !== null) return;

    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      const pending = pendingIndicesRef.current;
      if (!pending) return;
      pendingIndicesRef.current = null;
      useTtsStore.getState().setCurrentIndices(pending.charIndex, pending.wordIndex, pending.sentenceIndex);
    });
  }, []);

  return { clearPendingIndices, queueIndicesUpdate };
}

/**
 * Wraps browser speech synthesis and mirrors playback progress into the TTS store.
 * Use this when you need play/pause controls together with word/sentence index
 * updates that keep highlights synchronized while reading.
 */
export function useSpeechSynthesis({ flatText, segments }: UseSpeechSynthesisParams) {
  const voices = useSpeechVoices();
  const utteranceIdRef = useRef(0);
  const { clearPendingIndices, queueIndicesUpdate } = useQueuedIndicesUpdate();

  const invalidateCurrentUtterance = useCallback(() => {
    // Bumping the token invalidates late callbacks from older utterances.
    utteranceIdRef.current += 1;
    clearPendingIndices();
  }, [clearPendingIndices]);

  const play = useCallback(
    (startOffset?: number) => {
      if (!isSpeechSynthesisSupported() || !flatText || !segments) return;

      const synth = speechSynthesis;
      invalidateCurrentUtterance();
      synth.cancel();
      const store = useTtsStore.getState();

      const offset = normalizeStartOffset(startOffset, flatText.length);
      const utteranceId = utteranceIdRef.current;
      const utterance = new SpeechSynthesisUtterance(flatText.slice(offset));
      // Guards onboundary/onend/onerror against callbacks from superseded speech requests.
      const isStaleUtterance = () => utteranceId !== utteranceIdRef.current;

      utterance.rate = store.rate;
      if (store.selectedVoice) utterance.voice = store.selectedVoice;

      utterance.onboundary = (event: SpeechSynthesisEvent) => {
        // We only sync visual progress from word boundaries.
        if (isStaleUtterance() || event.name !== 'word') return;
        const charIndex = event.charIndex + offset;
        const wordIndex = findSegmentIndex(segments.words, charIndex);
        const sentenceIndex = findSegmentIndex(segments.sentences, charIndex);
        queueIndicesUpdate(charIndex, wordIndex, sentenceIndex);
      };

      utterance.onend = () => {
        if (isStaleUtterance()) return;
        clearPendingIndices();
        store.reset();
      };

      utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
        if (isStaleUtterance()) return;
        clearPendingIndices();
        if (event.error === 'canceled') return;
        store.reset();
      };

      synth.speak(utterance);
      store.play();
    },
    [clearPendingIndices, flatText, invalidateCurrentUtterance, queueIndicesUpdate, segments],
  );

  const pause = useCallback(() => {
    if (!isSpeechSynthesisSupported()) return;
    speechSynthesis.pause();
    const store = useTtsStore.getState();
    store.pause();
  }, []);

  const resume = useCallback(() => {
    if (!isSpeechSynthesisSupported()) return;
    speechSynthesis.resume();
    const store = useTtsStore.getState();
    store.resume();
  }, []);

  const stop = useCallback(() => {
    if (!isSpeechSynthesisSupported()) return;
    invalidateCurrentUtterance();
    speechSynthesis.cancel();
    const store = useTtsStore.getState();
    store.stop();
  }, [invalidateCurrentUtterance]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (!isSpeechSynthesisSupported()) return;
      invalidateCurrentUtterance();
      speechSynthesis.cancel();
    };
  }, [invalidateCurrentUtterance]);

  return { play, pause, resume, stop, voices };
}
