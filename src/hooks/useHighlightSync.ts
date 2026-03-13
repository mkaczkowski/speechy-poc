import {useEffect, useMemo, useRef, useState} from 'react';

import {computeHighlightRects} from '@/lib';
import {useTtsStore} from '@/stores';
import type {CharMap, HighlightRect, SegmentedText} from '@/types';

interface UseHighlightSyncParams {
    charMap: CharMap | null;
    segments: SegmentedText | null;
    container: HTMLDivElement | null;
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
    container: HTMLDivElement | null,
    containerRect: DOMRect | null,
) {
    if (!charMap || !ranges || index < 0 || !isPlaying || !container) return [];

    const range = ranges[index];
    if (!range) return [];

    const rects = computeHighlightRects(charMap, range.startChar, range.endChar, container, containerRect ?? undefined);
    return rects;
}

function cloneRect(rect: DOMRect): DOMRect {
    return new DOMRect(rect.x, rect.y, rect.width, rect.height);
}

function hasRectChanged(previousRect: DOMRect | null, nextRect: DOMRect): boolean {
    if (!previousRect) return true;
    return (
        previousRect.x !== nextRect.x ||
        previousRect.y !== nextRect.y ||
        previousRect.width !== nextRect.width ||
        previousRect.height !== nextRect.height
    );
}

function useContainerRect(container: HTMLDivElement | null) {
    const [containerRect, setContainerRect] = useState<DOMRect | null>(null);

    useEffect(() => {
        if (!container) return;

        let frame: number | null = null;

        const updateRect = () => {
            const nextRect = cloneRect(container.getBoundingClientRect());
            setContainerRect((prevRect) => (hasRectChanged(prevRect, nextRect) ? nextRect : prevRect));
        };

        const scheduleRectUpdate = () => {
            if (frame !== null) return;
            // Coalesce rapid ResizeObserver callbacks into a single layout read per frame.
            frame = requestAnimationFrame(() => {
                frame = null;
                updateRect();
            });
        };

        scheduleRectUpdate();
        const observer = new ResizeObserver(() => {
            scheduleRectUpdate();
        });
        observer.observe(container);
        // Position can change without element resize (e.g. viewport width changes around max-width layout).
        window.addEventListener('resize', scheduleRectUpdate);
        window.addEventListener('scroll', scheduleRectUpdate, true);
        window.visualViewport?.addEventListener('resize', scheduleRectUpdate);
        window.visualViewport?.addEventListener('scroll', scheduleRectUpdate);

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', scheduleRectUpdate);
            window.removeEventListener('scroll', scheduleRectUpdate, true);
            window.visualViewport?.removeEventListener('resize', scheduleRectUpdate);
            window.visualViewport?.removeEventListener('scroll', scheduleRectUpdate);
            if (frame !== null) {
                cancelAnimationFrame(frame);
            }
        };
    }, [container]);

    return containerRect;
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
export function useHighlightSync({charMap, segments, container}: UseHighlightSyncParams) {
    const currentSentenceIndex = useTtsStore.use.currentSentenceIndex();
    const currentWordIndex = useTtsStore.use.currentWordIndex();
    const isPlaying = useTtsStore.use.isPlaying();
    const isPaused = useTtsStore.use.isPaused();
    const containerRect = useContainerRect(container);

    const prevSentenceIndexRef = useRef(-1);
    const prevIsPausedRef = useRef(false);

    const sentenceRects = useMemo(() => {
        return computeRects(
            charMap,
            segments?.sentences,
            currentSentenceIndex,
            isPlaying,
            container,
            containerRect,
        );
    }, [charMap, segments, currentSentenceIndex, isPlaying, container, containerRect]);

    const wordRects = useMemo(() => {
        return computeRects(
            charMap,
            segments?.words,
            currentWordIndex,
            isPlaying,
            container,
            containerRect,
        );
    }, [charMap, segments, currentWordIndex, isPlaying, container, containerRect]);

    useEffect(() => {
        if (!isPlaying || isPaused) return;
        if (currentSentenceIndex < 0) return;
        // Word boundary updates can fire often; only scroll when sentence actually changes.
        if (currentSentenceIndex === prevSentenceIndexRef.current) return;
        prevSentenceIndexRef.current = currentSentenceIndex;

        scrollToFirstRect(sentenceRects, container);
    }, [currentSentenceIndex, sentenceRects, isPlaying, isPaused, container, containerRect]);

    useEffect(() => {
        // When resuming playback, re-center the active sentence for continuity.
        if (prevIsPausedRef.current && !isPaused && isPlaying) {
            scrollToFirstRect(sentenceRects, container);
        }
        prevIsPausedRef.current = isPaused;
    }, [isPaused, isPlaying, sentenceRects, container]);

    return {sentenceRects, wordRects};
}
