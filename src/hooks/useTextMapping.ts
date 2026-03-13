import { type RefObject, useEffect, useState } from 'react';

import { buildCharMap, segmentText } from '@/lib';
import type { CharMap, SegmentedText } from '@/types';

interface UseTextMappingParams {
  textLayerRef: RefObject<HTMLDivElement | null>;
  textLayerReady: boolean;
}

function scheduleDeferredWork(callback: () => void) {
  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    // Prefer idle time to keep post-render DOM walking off the critical paint path.
    const requestId = window.requestIdleCallback(callback, { timeout: 120 });
    return () => window.cancelIdleCallback(requestId);
  }

  // Fallback keeps behavior deterministic in environments without requestIdleCallback.
  const timeoutId = window.setTimeout(callback, 0);
  return () => window.clearTimeout(timeoutId);
}

/**
 * Builds a char map plus sentence/word segments from a rendered PDF text layer.
 * Use this once `textLayerReady` is true to enable precise highlights and
 * speech-synchronization against the page text.
 */
export function useTextMapping({ textLayerRef, textLayerReady }: UseTextMappingParams) {
  const [charMap, setCharMap] = useState<CharMap | null>(null);
  const [segments, setSegments] = useState<SegmentedText | null>(null);

  useEffect(() => {
    if (!textLayerReady || !textLayerRef.current) {
      setCharMap(null);
      setSegments(null);
      return;
    }

    // Capture once so deferred work reads the exact text layer that signaled ready.
    const textLayerElement = textLayerRef.current;
    let cancelled = false;

    const cancelScheduledWork = scheduleDeferredWork(() => {
      if (cancelled) return;

      const map = buildCharMap(textLayerElement);
      const seg = segmentText(map.flatText);
      if (cancelled) return;

      setCharMap(map);
      setSegments(seg);
    });

    return () => {
      cancelled = true;
      cancelScheduledWork();
    };
    // textLayerRef is stable — excluded from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textLayerReady]);

  return { charMap, segments };
}
