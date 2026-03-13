/**
 * Indicates whether runtime is a browser environment.
 */
export function isBrowser() {
  return typeof window !== 'undefined';
}

/**
 * Feature detection for browser speech synthesis API.
 */
export function isSpeechSynthesisSupported() {
  return isBrowser() && 'speechSynthesis' in window;
}
