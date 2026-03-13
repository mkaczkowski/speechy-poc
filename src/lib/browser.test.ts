import { afterEach, describe, expect, it } from 'vitest';

import { isBrowser, isSpeechSynthesisSupported } from './browser';

const originalSpeechDescriptor = Object.getOwnPropertyDescriptor(window, 'speechSynthesis');

afterEach(() => {
  if (originalSpeechDescriptor) {
    Object.defineProperty(window, 'speechSynthesis', originalSpeechDescriptor);
    return;
  }

  // @ts-expect-error test cleanup for optional browser API
  delete window.speechSynthesis;
});

describe('browser helpers', () => {
  it('detects browser runtime in test environment', () => {
    expect(isBrowser()).toBe(true);
  });

  it('returns false when speech synthesis API is missing', () => {
    // @ts-expect-error test override
    delete window.speechSynthesis;
    expect(isSpeechSynthesisSupported()).toBe(false);
  });

  it('returns true when speech synthesis API is available', () => {
    Object.defineProperty(window, 'speechSynthesis', {
      value: {},
      writable: true,
      configurable: true,
    });
    expect(isSpeechSynthesisSupported()).toBe(true);
  });
});
