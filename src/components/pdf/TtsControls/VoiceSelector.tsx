import { ChevronUp, Volume2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { VoiceSelectorProps } from '@/types';

const EXAMPLE_VOICE_LIMIT = 5;

export function VoiceSelector({ voices, selectedVoice, onSelect }: VoiceSelectorProps) {
  const exampleVoices = voices.slice(0, EXAMPLE_VOICE_LIMIT);
  if (exampleVoices.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button data-testid="tts-voice" variant="ghost" size="sm" aria-label="Select voice" className="shrink-0">
          <Volume2 className="mr-1 h-4 w-4" />
          {selectedVoice?.name ?? 'Default'}
          <ChevronUp className="ml-1 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-max min-w-[20rem]">
        {exampleVoices.map((voice) => (
          <DropdownMenuItem key={voice.voiceURI} className="whitespace-nowrap" onClick={() => onSelect(voice)}>
            {voice.name} ({voice.lang})
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
