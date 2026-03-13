export interface TtsControlsProps {
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  voices: SpeechSynthesisVoice[];
  totalChars: number;
}

export interface SpeedSelectorProps {
  rate: number;
  onSelect: (rate: number) => void;
}

export interface VoiceSelectorProps {
  voices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
  onSelect: (voice: SpeechSynthesisVoice) => void;
}

export interface TtsProgressBarProps {
  totalChars: number;
  isActive: boolean;
}
