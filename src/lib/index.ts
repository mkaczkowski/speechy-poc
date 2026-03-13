/**
 * Central lib exports.
 * Import from '@/lib' for shared, side-effect-free utilities.
 * Import `pdfjsLib` directly from '@/lib/pdfWorker' where PDF loading is needed.
 */

export { cn } from './utils';
export { isBrowser, isSpeechSynthesisSupported } from './browser';
export { createSelectors } from './createSelectors';
export { calculateProgress, progressToWidth } from './progress';
export { TTS_SPEED_OPTIONS } from './tts';
export { buildCharMap, segmentText, computeHighlightRects, findSegmentIndex, findCharIndex } from './textMapping';
