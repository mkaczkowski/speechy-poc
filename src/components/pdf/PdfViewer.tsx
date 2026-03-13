import { useCallback, useEffect, useRef, useState } from 'react';

import {
  useHighlightSync,
  useObservedWidth,
  usePdfDocument,
  usePdfPage,
  useSpeechSynthesis,
  useTextMapping,
} from '@/hooks';
import type { PdfViewerProps } from '@/types';

import { Spinner } from '@/components/ui/spinner';

import { HighlightOverlay } from './HighlightOverlay';
import { PageNavigation } from './PageNavigation';
import { PdfErrorState } from './PdfErrorState';
import { PdfLoadingState } from './PdfLoadingState';
import { TtsControls } from './TtsControls';

// Toggle debug overlay: shows text layer, highlight bounds, and rect outlines.
const HIGHLIGHT_DEBUG = import.meta.env.DEV && false;

export function PdfViewer({ url }: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);

  const containerWidth = useObservedWidth(containerRef);
  const [containerElement, setContainerElement] = useState<HTMLDivElement | null>(null);
  const [pageState, setPageState] = useState({ url, pageNumber: 1 });

  const { document, numPages, isLoading, error, retry } = usePdfDocument(url);

  // Keep per-URL page position isolated; switching documents starts from page 1.
  const rawPageNumber = pageState.url === url ? pageState.pageNumber : 1;
  const maxPageNumber = numPages > 0 ? numPages : 1;
  const pageNumber = Math.max(1, Math.min(rawPageNumber, maxPageNumber));

  const {
    textLayerReady,
    isRendering,
    error: pageError,
    textContent,
    viewport,
  } = usePdfPage({
    document,
    pageNumber,
    canvasRef,
    textLayerRef,
    containerWidth,
  });

  const { charMap, segments, itemRects, charToItem, itemStartChars } = useTextMapping({
    textLayerRef,
    textLayerReady,
    textContent,
    viewport,
  });

  const { play, pause, resume, stop, voices } = useSpeechSynthesis({
    flatText: charMap?.flatText ?? null,
    segments,
  });

  const { sentenceRects, wordRects } = useHighlightSync({
    charMap,
    segments,
    container: containerElement,
    itemRects,
    charToItem,
    itemStartChars,
  });

  const prevPageNumberRef = useRef(pageNumber);
  useEffect(() => {
    if (prevPageNumberRef.current === pageNumber) return;
    prevPageNumberRef.current = pageNumber;
    // Speech/highlight indices are page-scoped; stop playback before rendering a new page.
    stop();
  }, [pageNumber, stop]);

  const goToPreviousPage = useCallback(() => {
    setPageState((prevPageState) => {
      const currentPageNumber = prevPageState.url === url ? prevPageState.pageNumber : 1;
      return { url, pageNumber: Math.max(1, currentPageNumber - 1) };
    });
  }, [url]);

  const goToNextPage = useCallback(() => {
    setPageState((prevPageState) => {
      const currentPageNumber = prevPageState.url === url ? prevPageState.pageNumber : 1;
      return { url, pageNumber: Math.min(maxPageNumber, currentPageNumber + 1) };
    });
  }, [maxPageNumber, url]);

  const totalChars = charMap?.flatText.length ?? 0;

  const setContainerNode = useCallback((node: HTMLDivElement | null) => {
    // `useObservedWidth` reads from a ref, while highlight sync needs state to trigger effects.
    containerRef.current = node;
    setContainerElement(node);
  }, []);

  const displayError = error || pageError;

  if (displayError && !isLoading) {
    return <PdfErrorState message={displayError.message} onRetry={retry} />;
  }

  if (isLoading) {
    return <PdfLoadingState />;
  }

  return (
    <div className="flex flex-col items-center gap-4 pb-16">
      {numPages > 1 ? (
        <PageNavigation
          pageNumber={pageNumber}
          numPages={numPages}
          onPrevious={goToPreviousPage}
          onNext={goToNextPage}
        />
      ) : null}

      <div ref={setContainerNode} className="relative w-full max-w-4xl" data-testid="pdf-container">
        {isRendering && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/50">
            <Spinner size="default" />
          </div>
        )}

        <canvas ref={canvasRef} className="relative z-0 block" data-testid="pdf-canvas" />

        <div
          ref={textLayerRef}
          className="textLayer absolute top-0 left-0 z-10 pointer-events-none"
          style={{
            opacity: HIGHLIGHT_DEBUG ? 0.25 : 0,
            ...(HIGHLIGHT_DEBUG && {
              border: '2px solid rgba(255, 0, 0, 0.5)',
              backgroundColor: 'rgba(255, 0, 0, 0.03)',
            }),
          }}
          data-testid="pdf-text-layer"
          data-ready={textLayerReady}
        />

        <HighlightOverlay sentenceRects={sentenceRects} wordRects={wordRects} debug={HIGHLIGHT_DEBUG} />
      </div>

      <TtsControls
        onPlay={play}
        onPause={pause}
        onResume={resume}
        onStop={stop}
        voices={voices}
        totalChars={totalChars}
      />
    </div>
  );
}
