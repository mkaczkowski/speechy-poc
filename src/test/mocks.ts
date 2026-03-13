/**
 * Browser API mocks for testing.
 *
 * Provides reusable mock implementations for browser APIs
 * that are commonly needed across tests.
 */

import { type Mock, vi } from 'vitest';

// =============================================================================
// Media Query Mocks
// =============================================================================

/**
 * Creates a `window.matchMedia` mock with a fixed match result.
 * Use this in tests that branch on responsive media-query behavior.
 */
export const mockMatchMedia = (matches: boolean) =>
  vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));

// =============================================================================
// Console Mocks
// =============================================================================

/**
 * Silence console.error during a test.
 * Use this to keep expected error-path tests quiet while still asserting calls.
 */
export function silenceConsoleError() {
  return vi.spyOn(console, 'error').mockImplementation(() => {});
}

/**
 * Silence console.warn during a test.
 */
export function silenceConsoleWarn() {
  return vi.spyOn(console, 'warn').mockImplementation(() => {});
}

/**
 * Silence console.log during a test.
 */
export function silenceConsoleLog() {
  return vi.spyOn(console, 'log').mockImplementation(() => {});
}

// =============================================================================
// Animation Frame Mocks
// =============================================================================

/**
 * Creates mocks for requestAnimationFrame and cancelAnimationFrame.
 * Use the returned getter to manually trigger queued RAF callbacks in tests.
 */
export function mockAnimationFrame() {
  let callback: FrameRequestCallback | null = null;

  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
    callback = cb;
    return 1;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

  return () => callback;
}

interface AnimationFrameQueueControls {
  flush: () => void;
  clear: () => void;
}

/**
 * Queues RAF callbacks and provides manual flush helpers.
 * Use this for tests that need deterministic frame batching behavior.
 */
export function mockAnimationFrameQueue(): AnimationFrameQueueControls {
  const queue = new Map<number, FrameRequestCallback>();
  let nextId = 1;

  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => {
    const id = nextId++;
    queue.set(id, callback);
    return id;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id: number) => {
    queue.delete(id);
  });

  return {
    flush: () => {
      const callbacks = Array.from(queue.values());
      queue.clear();
      for (const callback of callbacks) {
        callback(performance.now());
      }
    },
    clear: () => {
      queue.clear();
      nextId = 1;
    },
  };
}

// =============================================================================
// Scroll Mocks
// =============================================================================

/**
 * Mocks `window.scrollTo` and returns a spy for assertions.
 * Use this when test environments do not implement native scrolling.
 */
export function mockScrollTo() {
  return vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
}

// =============================================================================
// Speech Synthesis Mocks
// =============================================================================

/**
 * Mock Web Speech API for testing.
 * Returns helpers to simulate speech events.
 */
export function mockSpeechSynthesis() {
  const speak: Mock = vi.fn();
  const cancel: Mock = vi.fn();
  const pause: Mock = vi.fn();
  const resume: Mock = vi.fn();
  const getVoices: Mock = vi.fn().mockReturnValue([]);
  const addEventListener: Mock = vi.fn();
  const removeEventListener: Mock = vi.fn();

  Object.defineProperty(window, 'speechSynthesis', {
    value: { speak, cancel, pause, resume, getVoices, addEventListener, removeEventListener },
    writable: true,
    configurable: true,
  });

  // Mock SpeechSynthesisUtterance
  const utteranceInstances: Array<{
    rate: number;
    voice: SpeechSynthesisVoice | null;
    text: string;
    onboundary: ((e: unknown) => void) | null;
    onend: (() => void) | null;
    onerror: ((e: unknown) => void) | null;
  }> = [];

  class MockUtterance {
    text: string;
    rate = 1;
    voice: SpeechSynthesisVoice | null = null;
    onboundary: ((e: unknown) => void) | null = null;
    onend: (() => void) | null = null;
    onerror: ((e: unknown) => void) | null = null;

    constructor(text: string) {
      this.text = text;
      utteranceInstances.push(this);
    }
  }

  vi.stubGlobal('SpeechSynthesisUtterance', MockUtterance);

  return {
    speak,
    cancel,
    pause,
    resume,
    getVoices,
    addEventListener,
    removeEventListener,
    utteranceInstances,
  };
}
