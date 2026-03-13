import { memo, useState } from 'react';

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

const sentenceHighlightClass =
  'pdf-highlight absolute rounded-sm border pdf-highlight-sentence transition-opacity duration-200 ease-out motion-reduce:transition-none';

const wordHighlightClass = 'pdf-highlight absolute rounded-sm border pdf-highlight-word';

const TRANSITION_FULL =
  'left 150ms ease-out, top 150ms ease-out, width 150ms ease-out, height 150ms ease-out, opacity 150ms ease-out';
const TRANSITION_OPACITY = 'opacity 150ms ease-out';

interface WordAnimState {
  /** wordRects reference from the last processed render */
  trackedRects: HighlightRect[];
  /** Whether at least one word has been positioned */
  hasPosition: boolean;
  /** Previous word rect top (for large-jump detection) */
  prevTop: number;
  /** Previous word rect height (for large-jump detection) */
  prevHeight: number;
  /** Computed CSS transition string */
  transition: string | undefined;
}

const INITIAL_ANIM_STATE: WordAnimState = {
  trackedRects: [],
  hasPosition: false,
  prevTop: 0,
  prevHeight: 0,
  transition: undefined,
};

export const HighlightOverlay = memo(function HighlightOverlay({
  sentenceRects,
  wordRects,
  debug = false,
}: HighlightOverlayProps) {
  const [anim, setAnim] = useState<WordAnimState>(INITIAL_ANIM_STATE);

  const hasWord = wordRects.length > 0;
  const wordStyle = hasWord ? wordRectToStyle(wordRects[0]) : undefined;

  // React-approved "adjust state during render" pattern:
  // When wordRects changes by reference, compute the new animation state
  // and schedule a synchronous re-render before commit.
  if (wordRects !== anim.trackedRects) {
    let transition: string | undefined;
    let hasPosition: boolean;

    if (!hasWord) {
      transition = undefined;
      hasPosition = false;
    } else if (!anim.hasPosition) {
      // First word — appear instantly, no animation
      transition = undefined;
      hasPosition = true;
    } else {
      hasPosition = true;
      const yDelta = Math.abs((wordStyle?.top ?? 0) - anim.prevTop);
      const isLargeJump = yDelta > (wordStyle?.height ?? 0) * 1.5;
      transition = isLargeJump ? TRANSITION_OPACITY : TRANSITION_FULL;
    }

    setAnim({
      trackedRects: wordRects,
      hasPosition,
      prevTop: wordStyle?.top ?? 0,
      prevHeight: wordStyle?.height ?? 0,
      transition,
    });
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
      {hasWord && wordStyle && (
        <div
          className={wordHighlightClass}
          data-testid="word-highlight"
          style={{
            ...wordStyle,
            transition: anim.transition,
            ...(debug ? DEBUG_OUTLINE : {}),
          }}
        />
      )}
    </div>
  );
});
