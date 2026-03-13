import {type RefObject, useEffect, useReducer} from 'react';

import type {PDFDocumentProxy, PDFPageProxy, RenderTask} from 'pdfjs-dist';
import type {TextContent} from 'pdfjs-dist/types/src/display/api';
import {TextLayer} from 'pdfjs-dist';

interface UsePdfPageParams {
    document: PDFDocumentProxy | null;
    pageNumber: number;
    canvasRef: RefObject<HTMLCanvasElement | null>;
    textLayerRef: RefObject<HTMLDivElement | null>;
    containerWidth: number;
}

interface State {
    textLayerReady: boolean;
    isRendering: boolean;
    error: Error | null;
    textContent: TextContent | null;
    viewport: ReturnType<PDFPageProxy['getViewport']> | null;
}

type PdfViewport = ReturnType<PDFPageProxy['getViewport']>;

type Action =
    | { type: 'idle' }
    | { type: 'rendering' }
    | { type: 'ready'; textContent: TextContent; viewport: PdfViewport }
    | { type: 'error'; error: Error };

function reducer(_state: State, action: Action): State {
    switch (action.type) {
        case 'idle':
            return {textLayerReady: false, isRendering: false, error: null, textContent: null, viewport: null};
        case 'rendering':
            return {textLayerReady: false, isRendering: true, error: null, textContent: null, viewport: null};
        case 'ready':
            return {textLayerReady: true, isRendering: false, error: null, textContent: action.textContent, viewport: action.viewport};
        case 'error':
            return {textLayerReady: false, isRendering: false, error: action.error, textContent: null, viewport: null};
    }
}

const initialState: State = {textLayerReady: false, isRendering: false, error: null, textContent: null, viewport: null};

function setupCanvas(canvas: HTMLCanvasElement, viewport: PdfViewport) {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = viewport.width * dpr;
    canvas.height = viewport.height * dpr;
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Failed to get canvas 2d context');
    }

    // Render in device pixels while preserving CSS-pixel layout size.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
}

function resetTextLayer(textLayerDiv: HTMLDivElement, viewport: PdfViewport) {
    textLayerDiv.replaceChildren();
    textLayerDiv.style.width = `${viewport.width}px`;
    textLayerDiv.style.height = `${viewport.height}px`;
}

function createTextLayer(textContent: TextContent, container: HTMLDivElement, viewport: PdfViewport) {
    return new TextLayer({
        textContentSource: textContent,
        container,
        viewport,
    });
}

function getScaledViewport(page: PDFPageProxy, containerWidth: number): PdfViewport {
    const unscaledViewport = page.getViewport({scale: 1});
    // Fit page width to container so canvas/text layer stay aligned at one shared scale.
    const scale = containerWidth / unscaledViewport.width;
    return page.getViewport({scale});
}

function normalizeError(err: unknown) {
    return err instanceof Error ? err : new Error(String(err));
}

function isCancelledError(err: unknown) {
    // PDF.js uses "cancelled" errors when a render task is intentionally aborted.
    return err instanceof Error && err.message.includes('cancelled');
}

/**
 * Renders one PDF page into canvas and text layers at the current container size.
 * Use this after loading a document to know when text-layer-dependent features
 * such as mapping and highlighting can run.
 */
export function usePdfPage({document, pageNumber, canvasRef, textLayerRef, containerWidth}: UsePdfPageParams): State {
    const [state, dispatch] = useReducer(reducer, initialState);

    useEffect(() => {
        const canvasElement = canvasRef.current;
        const textLayerElement = textLayerRef.current;

        if (!document || !canvasElement || !textLayerElement) {
            dispatch({type: 'idle'});
            return;
        }

        const measuredContainerWidth = canvasElement.parentElement?.getBoundingClientRect().width ?? null;
        const renderContainerWidth =
            measuredContainerWidth !== null && Number.isFinite(measuredContainerWidth) && measuredContainerWidth > 0
                ? Math.round(measuredContainerWidth)
                : containerWidth;
        if (renderContainerWidth <= 0) {
            dispatch({type: 'idle'});
            return;
        }

        const pdfDocument = document;
        const canvas = canvasElement;
        const textLayerDiv = textLayerElement;

        let cancelled = false;
        let renderTask: RenderTask | null = null;
        let textLayerInstance: TextLayer | null = null;
        let page: PDFPageProxy | null = null;
        dispatch({type: 'rendering'});

        async function renderPage() {
            try {
                page = await pdfDocument.getPage(pageNumber);
                if (cancelled) return;

                const viewport = getScaledViewport(page, renderContainerWidth);

                const canvasContext = setupCanvas(canvas, viewport);
                renderTask = page.render({canvas, canvasContext, viewport});
                await renderTask.promise;
                if (cancelled) return;

                resetTextLayer(textLayerDiv, viewport);
                const textContent = await page.getTextContent();
                if (cancelled) return;

                textLayerInstance = createTextLayer(textContent, textLayerDiv, viewport);
                await textLayerInstance.render();
                if (cancelled) return;
                dispatch({type: 'ready', textContent, viewport});
            } catch (err: unknown) {
                if (cancelled) return;
                if (isCancelledError(err)) {
                    return;
                }
                dispatch({type: 'error', error: normalizeError(err)});
            }
        }

        void renderPage();

        return () => {
            cancelled = true;
            // Cancel in-flight work first, then release page resources.
            renderTask?.cancel();
            textLayerInstance?.cancel();
            page?.cleanup();
        };
    }, [document, pageNumber, canvasRef, textLayerRef, containerWidth]);

    return state;
}
