import { renderHook, waitFor } from '@testing-library/react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/pdfWorker', () => ({
  pdfjsLib: {
    getDocument: vi.fn(),
  },
}));

import { pdfjsLib } from '@/lib/pdfWorker';
import { usePdfDocument } from './usePdfDocument';

const mockGetDocument = vi.mocked(pdfjsLib.getDocument);

function createMockDoc(numPages = 3): PDFDocumentProxy {
  return {
    numPages,
    destroy: vi.fn(),
  } as unknown as PDFDocumentProxy;
}

function createMockLoadingTask(doc: PDFDocumentProxy) {
  return {
    promise: Promise.resolve(doc),
    destroy: vi.fn(),
  };
}

function createFailedLoadingTask(error: Error) {
  return {
    promise: Promise.reject(error),
    destroy: vi.fn(),
  };
}

describe('usePdfDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts in loading state', () => {
    const doc = createMockDoc();
    mockGetDocument.mockReturnValue(createMockLoadingTask(doc) as unknown as ReturnType<typeof pdfjsLib.getDocument>);

    const { result } = renderHook(() => usePdfDocument('/test.pdf'));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.document).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.numPages).toBe(0);
  });

  it('loads document successfully', async () => {
    const doc = createMockDoc(5);
    mockGetDocument.mockReturnValue(createMockLoadingTask(doc) as unknown as ReturnType<typeof pdfjsLib.getDocument>);

    const { result } = renderHook(() => usePdfDocument('/test.pdf'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.document).toBe(doc);
    expect(result.current.numPages).toBe(5);
    expect(result.current.error).toBeNull();
  });

  it('handles load error', async () => {
    const error = new Error('Failed to load');
    mockGetDocument.mockReturnValue(
      createFailedLoadingTask(error) as unknown as ReturnType<typeof pdfjsLib.getDocument>,
    );

    const { result } = renderHook(() => usePdfDocument('/bad.pdf'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe(error);
    expect(result.current.document).toBeNull();
    expect(result.current.numPages).toBe(0);
  });

  it('destroys document on unmount', async () => {
    const doc = createMockDoc();
    const loadingTask = createMockLoadingTask(doc);
    mockGetDocument.mockReturnValue(loadingTask as unknown as ReturnType<typeof pdfjsLib.getDocument>);

    const { unmount } = renderHook(() => usePdfDocument('/test.pdf'));

    await waitFor(() => expect(doc.destroy).not.toHaveBeenCalled());

    unmount();

    expect(loadingTask.destroy).toHaveBeenCalled();
  });

  it('reloads when url changes', async () => {
    const doc1 = createMockDoc(2);
    const doc2 = createMockDoc(4);
    mockGetDocument
      .mockReturnValueOnce(createMockLoadingTask(doc1) as unknown as ReturnType<typeof pdfjsLib.getDocument>)
      .mockReturnValueOnce(createMockLoadingTask(doc2) as unknown as ReturnType<typeof pdfjsLib.getDocument>);

    const { result, rerender } = renderHook(({ url }) => usePdfDocument(url), {
      initialProps: { url: '/a.pdf' },
    });

    await waitFor(() => {
      expect(result.current.numPages).toBe(2);
    });

    rerender({ url: '/b.pdf' });

    await waitFor(() => {
      expect(result.current.numPages).toBe(4);
    });

    expect(mockGetDocument).toHaveBeenCalledTimes(2);
  });

  it('retries loading when retry is called', async () => {
    const error = new Error('Failed');
    const doc = createMockDoc(3);

    mockGetDocument
      .mockReturnValueOnce(createFailedLoadingTask(error) as unknown as ReturnType<typeof pdfjsLib.getDocument>)
      .mockReturnValueOnce(createMockLoadingTask(doc) as unknown as ReturnType<typeof pdfjsLib.getDocument>);

    const { result } = renderHook(() => usePdfDocument('/test.pdf'));

    await waitFor(() => {
      expect(result.current.error).toBe(error);
    });

    result.current.retry();

    await waitFor(() => {
      expect(result.current.document).toBe(doc);
    });

    expect(mockGetDocument).toHaveBeenCalledTimes(2);
  });
});
