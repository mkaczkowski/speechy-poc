import { type RefObject, useEffect, useState } from 'react';

import type { TextContent } from 'pdfjs-dist/types/src/display/api';
import type { PageViewport } from 'pdfjs-dist/types/src/display/display_utils';

import { isBrowser } from '@/lib';
import { buildCharMap, buildItemRects, segmentText } from '@/lib';
import type { CharMap, ItemRect, SegmentedText } from '@/types';

interface UseTextMappingParams {
  textLayerRef: RefObject<HTMLDivElement | null>;
  textLayerReady: boolean;
  textContent: TextContent | null;
  viewport: PageViewport | null;
}

interface TextMappingState {
  charMap: CharMap | null;
  segments: SegmentedText | null;
  itemRects: ItemRect[] | null;
  charToItem: Int32Array | null;
  itemStartChars: Int32Array | null;
}

const emptyState: TextMappingState = {
  charMap: null,
  segments: null,
  itemRects: null,
  charToItem: null,
  itemStartChars: null,
};

function scheduleDeferredWork(callback: () => void) {
  if (isBrowser() && typeof window.requestIdleCallback === 'function') {
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
 * Also pre-computes viewport-space item rects for pixel-perfect highlighting.
 * Use this once `textLayerReady` is true to enable precise highlights and
 * speech-synchronization against the page text.
 */
export function useTextMapping({ textLayerRef, textLayerReady, textContent, viewport }: UseTextMappingParams) {
  const [state, setState] = useState<TextMappingState>(emptyState);

  useEffect(() => {
    if (!textLayerReady || !textLayerRef.current) {
      setState(emptyState);
      return;
    }

    // Capture once so deferred work reads the exact text layer that signaled ready.
    const textLayerElement = textLayerRef.current;
    const capturedTextContent = textContent;
    const capturedViewport = viewport;
    let cancelled = false;

    const cancelScheduledWork = scheduleDeferredWork(() => {
      if (cancelled) return;

      const map = buildCharMap(textLayerElement);
      const seg = segmentText(map.flatText);
      if (cancelled) return;

      // Build item-level rects from PDF text content for pixel-perfect highlights.
      let rects: ItemRect[] | null = null;
      let mapping: Int32Array | null = null;
      let starts: Int32Array | null = null;
      if (capturedTextContent && capturedViewport) {
        const result = buildItemRects(capturedTextContent, capturedViewport, map, textLayerElement);
        rects = result.itemRects;
        mapping = result.charToItem;
        starts = result.itemStartChars;
      }

      if (cancelled) return;

      setState({ charMap: map, segments: seg, itemRects: rects, charToItem: mapping, itemStartChars: starts });
    });

    return () => {
      cancelled = true;
      cancelScheduledWork();
    };
    // textLayerRef is stable — excluded from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textLayerReady, textContent, viewport]);

  return state;
}
