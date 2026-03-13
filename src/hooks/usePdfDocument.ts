import { useCallback, useEffect, useReducer } from 'react';

import { pdfjsLib } from '@/lib/pdfWorker';

import type { PDFDocumentProxy } from 'pdfjs-dist';

interface State {
  document: PDFDocumentProxy | null;
  numPages: number;
  isLoading: boolean;
  error: Error | null;
}

type Action = { type: 'loading' } | { type: 'loaded'; document: PDFDocumentProxy } | { type: 'error'; error: Error };

function reducer(_state: State, action: Action): State {
  switch (action.type) {
    case 'loading':
      return { document: null, numPages: 0, isLoading: true, error: null };
    case 'loaded':
      return { document: action.document, numPages: action.document.numPages, isLoading: false, error: null };
    case 'error':
      return { document: null, numPages: 0, isLoading: false, error: action.error };
  }
}

const initialState: State = { document: null, numPages: 0, isLoading: true, error: null };

/**
 * Loads a PDF document from a URL and tracks loading, failure, and retry state.
 * Use this as the document source of truth before rendering individual pages.
 */
export function usePdfDocument(url: string) {
  const [state, dispatch] = useReducer(reducer, initialState);
  // Incrementing retryCount forces this effect to re-run for the same URL.
  const [retryCount, incrementRetry] = useReducer((c: number) => c + 1, 0);
  const retry = useCallback(() => incrementRetry(), []);

  useEffect(() => {
    let cancelled = false;

    dispatch({ type: 'loading' });

    const loadingTask = pdfjsLib.getDocument(url);

    loadingTask.promise
      .then((loadedDoc) => {
        if (cancelled) {
          // Effect was disposed while loading; tear down the just-loaded document immediately.
          loadedDoc.destroy();
          return;
        }
        dispatch({ type: 'loaded', document: loadedDoc });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        dispatch({ type: 'error', error: err instanceof Error ? err : new Error(String(err)) });
      });

    return () => {
      cancelled = true;
      loadingTask.destroy();
    };
  }, [url, retryCount]);

  return { ...state, retry };
}
