/**
 * Computes normalized progress in range [0, 1].
 * Use this for progress bars driven by index/total counters.
 */
export function calculateProgress(currentCharIndex: number, totalChars: number) {
  if (totalChars <= 0) return 0;
  const boundedIndex = Math.min(totalChars, Math.max(0, currentCharIndex));
  return boundedIndex / totalChars;
}

/**
 * Converts normalized progress into a CSS width value.
 * Values outside [0, 1] are clamped.
 */
export function progressToWidth(progress: number) {
  const boundedProgress = Math.min(1, Math.max(0, progress));
  return `${boundedProgress * 100}%`;
}
