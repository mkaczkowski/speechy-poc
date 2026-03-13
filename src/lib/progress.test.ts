import { describe, expect, it } from 'vitest';

import { calculateProgress, progressToWidth } from './progress';

describe('progress helpers', () => {
  it.each([
    { currentCharIndex: -3, totalChars: 10, expected: 0 },
    { currentCharIndex: 5, totalChars: 10, expected: 0.5 },
    { currentCharIndex: 25, totalChars: 10, expected: 1 },
    { currentCharIndex: 1, totalChars: 0, expected: 0 },
  ])(
    'calculateProgress($currentCharIndex, $totalChars) = $expected',
    ({ currentCharIndex, totalChars, expected }) => {
      expect(calculateProgress(currentCharIndex, totalChars)).toBe(expected);
    },
  );

  it.each([
    { progress: -0.3, expected: '0%' },
    { progress: 0, expected: '0%' },
    { progress: 0.25, expected: '25%' },
    { progress: 1.4, expected: '100%' },
  ])('progressToWidth($progress) = $expected', ({ progress, expected }) => {
    expect(progressToWidth(progress)).toBe(expected);
  });
});
