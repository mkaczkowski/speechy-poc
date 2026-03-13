import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { HighlightOverlay } from '@/components/pdf/HighlightOverlay';
import { render } from '@/test';
import type { HighlightRect } from '@/types';

const sentenceRects: HighlightRect[] = [
  { left: 10, top: 20, width: 200, height: 16 },
  { left: 10, top: 40, width: 180, height: 16 },
];
const wordRects: HighlightRect[] = [{ left: 15, top: 22, width: 50, height: 14 }];

describe('HighlightOverlay', () => {
  it('renders overlay with no word highlight when no highlights are present', () => {
    render(<HighlightOverlay sentenceRects={[]} wordRects={[]} />);
    const overlay = screen.getByTestId('highlight-overlay');
    expect(overlay).toBeInTheDocument();
    expect(screen.queryByTestId('word-highlight')).not.toBeInTheDocument();
  });

  it('renders sentence and word overlays together', () => {
    render(<HighlightOverlay sentenceRects={sentenceRects} wordRects={wordRects} />);

    expect(screen.getByTestId('highlight-overlay')).toHaveClass('pointer-events-none');
    const sentenceHighlights = screen.getAllByTestId('sentence-highlight');
    const wordHighlight = screen.getByTestId('word-highlight');

    expect(sentenceHighlights).toHaveLength(2);
    expect(sentenceHighlights[0]).toHaveClass('pdf-highlight', 'pdf-highlight-sentence');
    expect(wordHighlight).toHaveClass('pdf-highlight', 'pdf-highlight-word');
  });

  it('renders a single word highlight div when wordRects provided', () => {
    render(<HighlightOverlay sentenceRects={sentenceRects} wordRects={wordRects} />);
    const wordHighlights = screen.getAllByTestId('word-highlight');
    expect(wordHighlights).toHaveLength(1);
  });

  it('first word highlight has no transition (appears instantly)', () => {
    render(<HighlightOverlay sentenceRects={[]} wordRects={wordRects} />);
    const wordHighlight = screen.getByTestId('word-highlight');
    expect(wordHighlight.style.transition).toBe('');
  });

  it.each([
    {
      testId: 'sentence-highlight',
      expectedStyle: { left: '10px', top: '20px', width: '200px', height: '16px' },
    },
    {
      testId: 'word-highlight',
      // Word rects expand vertically by 20%, centered: top = 22 - (14*0.2)/2 = 20.6, height = 14 * 1.2 = 16.8
      expectedStyle: { left: '15px', top: '20.6px', width: '50px', height: '16.8px' },
    },
  ])('applies correct style for $testId', ({ testId, expectedStyle }) => {
    render(<HighlightOverlay sentenceRects={sentenceRects} wordRects={wordRects} />);
    expect(screen.getAllByTestId(testId)[0]).toHaveStyle(expectedStyle);
  });
});
