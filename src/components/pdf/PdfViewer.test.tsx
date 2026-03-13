import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { render } from '@/test';

import { PdfViewer } from './PdfViewer';

const mockUsePdfDocument = vi.fn();
const mockUsePdfPage = vi.fn();
const mockUseTextMapping = vi.fn();
const mockUseSpeechSynthesis = vi.fn();
const mockUseHighlightSync = vi.fn();
const mockUseObservedWidth = vi.fn();

vi.mock('@/hooks', () => ({
  usePdfDocument: (...args: unknown[]) => mockUsePdfDocument(...args),
  usePdfPage: (...args: unknown[]) => mockUsePdfPage(...args),
  useObservedWidth: (...args: unknown[]) => mockUseObservedWidth(...args),
  useTextMapping: (...args: unknown[]) => mockUseTextMapping(...args),
  useSpeechSynthesis: (...args: unknown[]) => mockUseSpeechSynthesis(...args),
  useHighlightSync: (...args: unknown[]) => mockUseHighlightSync(...args),
}));

function mockDocState(overrides?: Record<string, unknown>) {
  mockUsePdfDocument.mockReturnValue({
    document: {},
    numPages: 3,
    isLoading: false,
    error: null,
    retry: vi.fn(),
    ...overrides,
  });
}

describe('PdfViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePdfDocument.mockReturnValue({
      document: null,
      numPages: 0,
      isLoading: true,
      error: null,
      retry: vi.fn(),
    });
    mockUsePdfPage.mockReturnValue({
      textLayerReady: false,
      isRendering: false,
      error: null,
    });
    mockUseObservedWidth.mockReturnValue(800);
    mockUseTextMapping.mockReturnValue({ charMap: null, segments: null });
    mockUseSpeechSynthesis.mockReturnValue({
      play: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      stop: vi.fn(),
      voices: [],
    });
    mockUseHighlightSync.mockReturnValue({ sentenceRects: [], wordRects: [] });
  });

  it('renders loading state while document is loading', () => {
    render(<PdfViewer url="/test.pdf" />);
    expect(screen.getByTestId('pdf-loading')).toBeInTheDocument();
  });

  it('renders error state with retry action', () => {
    mockDocState({
      document: null,
      numPages: 0,
      error: new Error('Network error'),
    });

    render(<PdfViewer url="/test.pdf" />);
    expect(screen.getByTestId('pdf-error')).toBeInTheDocument();
    expect(screen.getByText(/Network error/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('renders PDF canvas/text layer when document is ready', () => {
    mockDocState();
    render(<PdfViewer url="/test.pdf" />);

    expect(screen.getByTestId('pdf-container')).toBeInTheDocument();
    expect(screen.getByTestId('pdf-canvas')).toBeInTheDocument();
    expect(screen.getByTestId('pdf-text-layer')).toHaveStyle({ opacity: '0' });
  });

  it('renders text layer with pointer events disabled', () => {
    mockDocState();
    render(<PdfViewer url="/test.pdf" />);

    const textLayer = screen.getByTestId('pdf-text-layer');
    expect(textLayer).toHaveClass('pointer-events-none');
  });

  it.each([
    { numPages: 1, shouldShowNavigation: false },
    { numPages: 3, shouldShowNavigation: true },
  ])('navigation visibility matches page count ($numPages)', ({ numPages, shouldShowNavigation }) => {
    mockDocState({ numPages });
    render(<PdfViewer url="/test.pdf" />);

    if (shouldShowNavigation) {
      expect(screen.getByTestId('pdf-navigation')).toBeInTheDocument();
    } else {
      expect(screen.queryByTestId('pdf-navigation')).not.toBeInTheDocument();
    }
  });

  it('navigates pages with previous/next controls', async () => {
    const user = userEvent.setup();
    mockDocState({ numPages: 3 });

    render(<PdfViewer url="/test.pdf" />);

    const nextButton = screen.getByRole('button', { name: /next page/i });
    const previousButton = screen.getByRole('button', { name: /previous page/i });

    expect(previousButton).toBeDisabled();

    await user.click(nextButton);
    expect(screen.getByText('2 / 3')).toBeInTheDocument();

    await user.click(nextButton);
    expect(screen.getByText('3 / 3')).toBeInTheDocument();
    expect(nextButton).toBeDisabled();

    await user.click(previousButton);
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
  });

  it('resets to first page when URL changes', async () => {
    const user = userEvent.setup();
    mockDocState({ numPages: 3 });

    const { rerender } = render(<PdfViewer url="/a.pdf" />);
    const nextButton = screen.getByRole('button', { name: /next page/i });

    await user.click(nextButton);
    await user.click(nextButton);
    expect(screen.getByText('3 / 3')).toBeInTheDocument();

    rerender(<PdfViewer url="/b.pdf" />);

    await waitFor(() => {
      expect(screen.getByText('1 / 3')).toBeInTheDocument();
    });
  });

  it('clamps current page when a new document has fewer pages', async () => {
    const user = userEvent.setup();
    mockDocState({ numPages: 3 });

    const { rerender } = render(<PdfViewer url="/test.pdf" />);
    const nextButton = screen.getByRole('button', { name: /next page/i });

    await user.click(nextButton);
    await user.click(nextButton);
    expect(screen.getByText('3 / 3')).toBeInTheDocument();

    mockDocState({ numPages: 1 });
    rerender(<PdfViewer url="/test.pdf" />);

    await waitFor(() => {
      expect(mockUsePdfPage).toHaveBeenLastCalledWith(
        expect.objectContaining({
          pageNumber: 1,
        }),
      );
    });
    expect(screen.queryByTestId('pdf-navigation')).not.toBeInTheDocument();
  });

});
