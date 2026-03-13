import * as pdfjsLib from 'pdfjs-dist';

// Keep worker setup centralized so every PDF load shares the same configuration.
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString();

/**
 * Preconfigured PDF.js namespace with worker source already set.
 * Use this export for all PDF document operations to avoid worker setup drift.
 */
export { pdfjsLib };
