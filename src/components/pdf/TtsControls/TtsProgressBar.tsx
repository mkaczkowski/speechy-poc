import { calculateProgress, progressToWidth } from '@/lib/progress';
import { useTtsStore } from '@/stores';
import type { TtsProgressBarProps } from '@/types';

export function TtsProgressBar({ totalChars, isActive }: TtsProgressBarProps) {
  const currentCharIndex = useTtsStore.use.currentCharIndex();
  const progress = calculateProgress(currentCharIndex, totalChars);
  const progressWidth = progressToWidth(isActive ? progress : 0);

  return (
    <div
      data-testid="tts-progress-bar"
      className="h-1 bg-primary transition-all duration-200"
      style={{ width: progressWidth }}
    />
  );
}
