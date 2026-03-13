import { Pause, Play, Square } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useTtsStore } from '@/stores';
import type { TtsControlsProps } from '@/types';

import { SpeedSelector } from './TtsControls/SpeedSelector';
import { TtsProgressBar } from './TtsControls/TtsProgressBar';
import { VoiceSelector } from './TtsControls/VoiceSelector';

export function TtsControls({
  onPlay,
  onPause,
  onResume,
  onStop,
  voices,
  totalChars,
}: TtsControlsProps) {
  const isPlaying = useTtsStore.use.isPlaying();
  const isPaused = useTtsStore.use.isPaused();
  const rate = useTtsStore.use.rate();
  const selectedVoice = useTtsStore.use.selectedVoice();
  const isActive = isPlaying || isPaused;
  const isPlayingNow = isPlaying && !isPaused;
  const playPauseLabel = isPlayingNow ? 'Pause' : 'Play';
  const playPauseAction = isPlayingNow ? onPause : isPaused ? onResume : onPlay;

  const handleSpeedChange = (newRate: number) => {
    const { setRate } = useTtsStore.getState();
    setRate(newRate);
  };

  const handleVoiceChange = (voice: SpeechSynthesisVoice) => {
    const { setSelectedVoice } = useTtsStore.getState();
    setSelectedVoice(voice);
  };

  return (
    <div
      data-testid="tts-controls"
      className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/80 backdrop-blur-sm"
    >
      <TtsProgressBar totalChars={totalChars} isActive={isActive} />

      <div className="flex items-center gap-2 px-4 py-2">
        <Button
          data-testid="tts-play-pause"
          variant="ghost"
          size="icon"
          onClick={() => playPauseAction()}
          aria-label={playPauseLabel}
        >
          {isPlayingNow ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </Button>

        <Button
          data-testid="tts-stop"
          variant="ghost"
          size="icon"
          onClick={onStop}
          disabled={!isActive}
          aria-label="Stop"
        >
          <Square className="h-5 w-5" />
        </Button>

        <SpeedSelector rate={rate} onSelect={handleSpeedChange} />
        <VoiceSelector voices={voices} selectedVoice={selectedVoice} onSelect={handleVoiceChange} />
      </div>
    </div>
  );
}
