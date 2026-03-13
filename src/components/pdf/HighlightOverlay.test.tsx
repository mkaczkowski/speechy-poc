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
  it('renders nothing when no highlights are present', () => {
    const { container } = render(<HighlightOverlay sentenceRects={[]} wordRects={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders sentence and word overlays together', () => {
    render(<HighlightOverlay sentenceRects={sentenceRects} wordRects={wordRects} />);

    expect(screen.getByTestId('highlight-overlay')).toHaveClass('pointer-events-none');
    const sentenceHighlights = screen.getAllByTestId('sentence-highlight');
    const wordHighlights = screen.getAllByTestId('word-highlight');

    expect(sentenceHighlights).toHaveLength(2);
    expect(wordHighlights).toHaveLength(1);
    expect(sentenceHighlights[0]).toHaveClass('pdf-highlight', 'pdf-highlight-sentence');
    expect(wordHighlights[0]).toHaveClass('pdf-highlight', 'pdf-highlight-word');
  });

  it.each([
    {
      testId: 'sentence-highlight',
      expectedStyle: { left: '10px', top: '20px', width: '200px', height: '16px' },
    },
    {
      testId: 'word-highlight',
      expectedStyle: { left: '15px', top: '22px', width: '50px', height: '14px' },
    },
  ])('applies correct style for $testId', ({ testId, expectedStyle }) => {
    render(<HighlightOverlay sentenceRects={sentenceRects} wordRects={wordRects} />);
    expect(screen.getAllByTestId(testId)[0]).toHaveStyle(expectedStyle);
  });
});
