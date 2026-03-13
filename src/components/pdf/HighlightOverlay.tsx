import { memo } from 'react';

import { cn } from '@/lib/utils';
import type { HighlightRect } from '@/types';

interface HighlightOverlayProps {
  sentenceRects: HighlightRect[];
  wordRects: HighlightRect[];
  debug?: boolean;
}

// Word highlights extend vertically beyond the sentence rect, centered on the same midpoint.
const WORD_VERTICAL_EXPAND = 0.2;

const DEBUG_OUTLINE = { outline: '1px solid red', outlineOffset: '-1px' } as const;

function rectToStyle(rect: HighlightRect) {
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

function wordRectToStyle(rect: HighlightRect) {
  const extra = rect.height * WORD_VERTICAL_EXPAND;
  return {
    left: rect.left,
    top: rect.top - extra / 2,
    width: rect.width,
    height: rect.height + extra,
  };
}

const highlightBaseClass =
  'pdf-highlight absolute rounded-sm border transition-opacity duration-200 ease-out motion-reduce:transition-none';

const sentenceHighlightClass = cn(highlightBaseClass, 'pdf-highlight-sentence');
const wordHighlightClass = cn(highlightBaseClass, 'pdf-highlight-word');

export const HighlightOverlay = memo(function HighlightOverlay({
  sentenceRects,
  wordRects,
  debug = false,
}: HighlightOverlayProps) {
  if (sentenceRects.length === 0 && wordRects.length === 0 && !debug) {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute inset-0"
      data-testid="highlight-overlay"
      style={
        debug
          ? {
              backgroundColor: 'rgba(0, 120, 255, 0.06)',
              border: '2px dashed rgba(0, 120, 255, 0.4)',
            }
          : undefined
      }
    >
      {sentenceRects.map((rect, index) => (
        <div
          key={`sentence-${index}`}
          className={sentenceHighlightClass}
          data-testid="sentence-highlight"
          style={debug ? { ...rectToStyle(rect), ...DEBUG_OUTLINE } : rectToStyle(rect)}
        />
      ))}
      {wordRects.map((rect, index) => (
        <div
          key={`word-${index}`}
          className={wordHighlightClass}
          data-testid="word-highlight"
          style={debug ? { ...wordRectToStyle(rect), ...DEBUG_OUTLINE } : wordRectToStyle(rect)}
        />
      ))}
    </div>
  );
});
