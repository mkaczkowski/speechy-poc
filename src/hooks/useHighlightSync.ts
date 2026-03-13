import {useEffect, useMemo, useRef} from 'react';

import {computeHighlightRects} from '@/lib';
import {useTtsStore} from '@/stores';
import type {CharMap, HighlightRect, ItemRect, SegmentedText} from '@/types';

interface UseHighlightSyncParams {
    charMap: CharMap | null;
    segments: SegmentedText | null;
    container: HTMLDivElement | null;
    itemRects: ItemRect[] | null;
    charToItem: Int32Array | null;
    itemStartChars: Int32Array | null;
}

interface SegmentRange {
    startChar: number;
    endChar: number;
}

function scrollToRect(rect: HighlightRect, container: HTMLElement) {
    // Use a temporary marker because scrollIntoView works on elements, not arbitrary rects.
    const marker = document.createElement('div');
    marker.style.position = 'absolute';
    marker.style.top = `${rect.top}px`;
    marker.style.left = `${rect.left}px`;
    marker.style.width = '1px';
    marker.style.height = '1px';
    container.appendChild(marker);
    if (typeof marker.scrollIntoView === 'function') {
        marker.scrollIntoView({behavior: 'smooth', block: 'center'});
    }
    container.removeChild(marker);
}

function computeRects(
    charMap: CharMap | null,
    ranges: ReadonlyArray<SegmentRange> | undefined,
    index: number,
    isPlaying: boolean,
    itemRects: ItemRect[] | null,
    charToItem: Int32Array | null,
    itemStartChars: Int32Array | null,
) {
    if (!charMap || !ranges || index < 0 || !isPlaying) return [];

    const range = ranges[index];
    if (!range) return [];

    return computeHighlightRects(
        charMap,
        range.startChar,
        range.endChar,
        itemRects,
        charToItem,
        itemStartChars,
    );
}

function scrollToFirstRect(rects: HighlightRect[], container: HTMLDivElement | null) {
    if (!container || rects.length === 0) return;
    scrollToRect(rects[0], container);
}

/**
 * Keeps PDF highlight overlays aligned with the current TTS playback position.
 * Use this in the viewer once text mapping is available to drive sentence/word
 * highlight rectangles and auto-scroll the active sentence into view.
 */
export function useHighlightSync({charMap, segments, container, itemRects, charToItem, itemStartChars}: UseHighlightSyncParams) {
    const currentSentenceIndex = useTtsStore.use.currentSentenceIndex();
    const currentWordIndex = useTtsStore.use.currentWordIndex();
    const isPlaying = useTtsStore.use.isPlaying();
    const isPaused = useTtsStore.use.isPaused();

    const prevSentenceIndexRef = useRef(-1);
    const prevIsPausedRef = useRef(false);

    const sentenceRects = useMemo(() => {
        return computeRects(
            charMap,
            segments?.sentences,
            currentSentenceIndex,
            isPlaying,
            itemRects,
            charToItem,
            itemStartChars,
        );
    }, [charMap, segments, currentSentenceIndex, isPlaying, itemRects, charToItem, itemStartChars]);

    const wordRects = useMemo(() => {
        return computeRects(
            charMap,
            segments?.words,
            currentWordIndex,
            isPlaying,
            itemRects,
            charToItem,
            itemStartChars,
        );
    }, [charMap, segments, currentWordIndex, isPlaying, itemRects, charToItem, itemStartChars]);

    useEffect(() => {
        if (!isPlaying || isPaused) return;
        if (currentSentenceIndex < 0) return;
        // Word boundary updates can fire often; only scroll when sentence actually changes.
        if (currentSentenceIndex === prevSentenceIndexRef.current) return;
        prevSentenceIndexRef.current = currentSentenceIndex;

        scrollToFirstRect(sentenceRects, container);
    }, [currentSentenceIndex, sentenceRects, isPlaying, isPaused, container]);

    useEffect(() => {
        // When resuming playback, re-center the active sentence for continuity.
        if (prevIsPausedRef.current && !isPaused && isPlaying) {
            scrollToFirstRect(sentenceRects, container);
        }
        prevIsPausedRef.current = isPaused;
    }, [isPaused, isPlaying, sentenceRects, container]);

    return {sentenceRects, wordRects};
}
