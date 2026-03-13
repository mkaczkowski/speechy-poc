import { renderHook, waitFor } from '@testing-library/react';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockTextLayerRender = vi.fn().mockResolvedValue(undefined);
const mockTextLayerCancel = vi.fn();

vi.mock('pdfjs-dist', () => ({
  TextLayer: vi.fn().mockImplementation(function () {
    return {
      render: mockTextLayerRender,
      cancel: mockTextLayerCancel,
    };
  }),
}));

import { usePdfPage } from './usePdfPage';

function createMockPage(): PDFPageProxy {
  return {
    getViewport: vi.fn().mockReturnValue({ width: 600, height: 800 }),
    render: vi.fn().mockReturnValue({
      promise: Promise.resolve(),
      cancel: vi.fn(),
    }),
    getTextContent: vi.fn().mockResolvedValue({ items: [], styles: {} }),
    cleanup: vi.fn(),
  } as unknown as PDFPageProxy;
}

function createMockDoc(page?: PDFPageProxy): PDFDocumentProxy {
  return {
    numPages: 2,
    getPage: vi.fn().mockResolvedValue(page ?? createMockPage()),
    destroy: vi.fn(),
  } as unknown as PDFDocumentProxy;
}

const canvas = document.createElement('canvas');
canvas.getContext = vi.fn().mockReturnValue({ setTransform: vi.fn() });
const canvasRef = { current: canvas };
const textLayerDiv = document.createElement('div');
const textLayerRef = { current: textLayerDiv };

function renderUsePdfPage(overrides?: Partial<Parameters<typeof usePdfPage>[0]>) {
  return renderHook(() =>
    usePdfPage({
      document: createMockDoc(),
      pageNumber: 1,
      canvasRef,
      textLayerRef,
      containerWidth: 800,
      ...overrides,
    }),
  );
}

describe('usePdfPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTextLayerRender.mockResolvedValue(undefined);
    textLayerDiv.innerHTML = '';
  });

  it.each([
    {
      label: 'document is null',
      setup: () => ({ hook: renderUsePdfPage({ document: null }), doc: null as PDFDocumentProxy | null }),
    },
    {
      label: 'container width is 0',
      setup: () => {
        const doc = createMockDoc();
        return { hook: renderUsePdfPage({ document: doc, containerWidth: 0 }), doc };
      },
    },
  ])('does not render when $label', ({ setup }) => {
    const { hook, doc } = setup();
    expect(hook.result.current.isRendering).toBe(false);
    expect(hook.result.current.textLayerReady).toBe(false);
    if (doc) {
      expect(doc.getPage).not.toHaveBeenCalled();
    }
  });

  it('renders the page and marks text layer as ready', async () => {
    const doc = createMockDoc();
    const { result } = renderUsePdfPage({ document: doc });

    await waitFor(() => {
      expect(result.current.textLayerReady).toBe(true);
    });

    expect(result.current.isRendering).toBe(false);
    expect(result.current.error).toBeNull();
    expect(doc.getPage).toHaveBeenCalledWith(1);
  });

  it('renders again when page number changes', async () => {
    const doc = createMockDoc();
    const { result, rerender } = renderHook(
      ({ pageNumber }) =>
        usePdfPage({
          document: doc,
          pageNumber,
          canvasRef,
          textLayerRef,
          containerWidth: 800,
        }),
      { initialProps: { pageNumber: 1 } },
    );

    await waitFor(() => {
      expect(result.current.textLayerReady).toBe(true);
    });

    rerender({ pageNumber: 2 });

    await waitFor(() => {
      expect(doc.getPage).toHaveBeenCalledWith(2);
      expect(result.current.textLayerReady).toBe(true);
    });
  });

  it('surfaces render errors', async () => {
    const page = createMockPage();
    (page.render as ReturnType<typeof vi.fn>).mockReturnValue({
      promise: Promise.reject(new Error('Render failed')),
      cancel: vi.fn(),
    });
    const doc = createMockDoc(page);
    const { result } = renderUsePdfPage({ document: doc });

    await waitFor(() => {
      expect(result.current.error?.message).toBe('Render failed');
    });

    expect(result.current.isRendering).toBe(false);
    expect(result.current.textLayerReady).toBe(false);
  });

  it('resets to idle state when prerequisites become unavailable', async () => {
    const doc = createMockDoc();

    const { result, rerender } = renderHook(
      ({ document, containerWidth }) =>
        usePdfPage({
          document,
          pageNumber: 1,
          canvasRef,
          textLayerRef,
          containerWidth,
        }),
      {
        initialProps: {
          document: doc as PDFDocumentProxy | null,
          containerWidth: 800,
        },
      },
    );

    await waitFor(() => {
      expect(result.current.textLayerReady).toBe(true);
    });

    rerender({ document: null, containerWidth: 800 });

    expect(result.current.textLayerReady).toBe(false);
    expect(result.current.isRendering).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('cancels in-flight render tasks when container width changes quickly', async () => {
    const page = createMockPage();
    const renderCancels: Array<ReturnType<typeof vi.fn>> = [];
    (page.render as ReturnType<typeof vi.fn>).mockImplementation(() => {
      const cancel = vi.fn();
      renderCancels.push(cancel);
      return {
        promise: new Promise<void>(() => {
          // Keep unresolved to simulate long-running render task.
        }),
        cancel,
      };
    });
    const doc = createMockDoc(page);

    const { rerender } = renderHook(
      ({ containerWidth }) =>
        usePdfPage({
          document: doc,
          pageNumber: 1,
          canvasRef,
          textLayerRef,
          containerWidth,
        }),
      { initialProps: { containerWidth: 800 } },
    );

    await waitFor(() => {
      expect(renderCancels).toHaveLength(1);
    });

    rerender({ containerWidth: 820 });

    expect(renderCancels[0]).toHaveBeenCalledOnce();
  });
});
