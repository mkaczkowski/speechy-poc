import { memo } from 'react';

import { cn } from '@/lib/utils';
import type { HighlightRect } from '@/types';

interface HighlightOverlayProps {
  sentenceRects: HighlightRect[];
  wordRects: HighlightRect[];
}

function rectToStyle(rect: HighlightRect) {
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

const highlightBaseClass =
  'pdf-highlight absolute rounded-sm border transition-opacity duration-200 ease-out motion-reduce:transition-none';

const sentenceHighlightClass = cn(highlightBaseClass, 'pdf-highlight-sentence');
const wordHighlightClass = cn(highlightBaseClass, 'pdf-highlight-word');

export const HighlightOverlay = memo(function HighlightOverlay({ sentenceRects, wordRects }: HighlightOverlayProps) {
  if (sentenceRects.length === 0 && wordRects.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0" data-testid="highlight-overlay">
      {sentenceRects.map((rect, index) => (
        <div
          key={`sentence-${index}`}
          className={sentenceHighlightClass}
          data-testid="sentence-highlight"
          style={rectToStyle(rect)}
        />
      ))}
      {wordRects.map((rect, index) => (
        <div
          key={`word-${index}`}
          className={wordHighlightClass}
          data-testid="word-highlight"
          style={rectToStyle(rect)}
        />
      ))}
    </div>
  );
});
