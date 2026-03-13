import '@testing-library/jest-dom/vitest';

// =============================================================================
// Browser API Mocks
// =============================================================================

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock scrollTo
window.scrollTo = () => {};

// pdfjs-dist expects these browser APIs in Node test environments.
if (typeof DOMMatrix === 'undefined') {
  class DOMMatrixMock {
    multiplySelf() {
      return this;
    }
    preMultiplySelf() {
      return this;
    }
    translateSelf() {
      return this;
    }
    scaleSelf() {
      return this;
    }
    rotateSelf() {
      return this;
    }
    invertSelf() {
      return this;
    }
  }
  (globalThis as unknown as { DOMMatrix: typeof DOMMatrix }).DOMMatrix = DOMMatrixMock as unknown as typeof DOMMatrix;
}

if (typeof Path2D === 'undefined') {
  (globalThis as unknown as { Path2D: typeof Path2D }).Path2D = class Path2DMock {} as unknown as typeof Path2D;
}
