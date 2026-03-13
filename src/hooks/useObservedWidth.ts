import { type RefObject, useEffect, useRef, useState } from 'react';

const WIDTH_JITTER_TOLERANCE_PX = 1;

/**
 * Tracks an element's rendered width using ResizeObserver.
 * Use this for responsive rendering logic that depends on container width.
 */
export function useObservedWidth(containerRef: RefObject<HTMLElement | null>) {
  const [width, setWidth] = useState(0);
  const frameRef = useRef<number | null>(null);
  const pendingWidthRef = useRef<number | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  const observedElementRef = useRef<HTMLElement | null>(null);

  const commitWidth = (nextWidth: number) => {
    setWidth((prevWidth) => {
      if (prevWidth === nextWidth) {
        return prevWidth;
      }
      // Ignore tiny oscillations that can happen near viewport/scrollbar boundaries.
      if (prevWidth > 0 && Math.abs(prevWidth - nextWidth) <= WIDTH_JITTER_TOLERANCE_PX) {
        return prevWidth;
      }
      return nextWidth;
    });
  };

  const scheduleWidthUpdate = (nextWidth: number) => {
    pendingWidthRef.current = nextWidth;
    if (frameRef.current !== null) return;

    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      if (pendingWidthRef.current === null) return;
      commitWidth(pendingWidthRef.current);
      pendingWidthRef.current = null;
    });
  };

  const clearPendingFrame = () => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    // Drop stale width sampled for a previous element/frame.
    pendingWidthRef.current = null;
  };

  // Ref mutations do not trigger effects, so sync observed target each render.
  useEffect(() => {
    const nextElement = containerRef.current;
    if (nextElement === observedElementRef.current) return;

    observerRef.current?.disconnect();
    observerRef.current = null;
    clearPendingFrame();
    observedElementRef.current = nextElement;
    if (!nextElement) return;

    commitWidth(Math.round(nextElement.getBoundingClientRect().width));

    observerRef.current = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      scheduleWidthUpdate(Math.round(entry.contentRect.width));
    });

    observerRef.current.observe(nextElement);
  });

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      observedElementRef.current = null;
      clearPendingFrame();
    };
  }, []);

  return width;
}
