import { ChevronUp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TTS_SPEED_OPTIONS } from '@/lib/tts';
import type { SpeedSelectorProps } from '@/types';

export function SpeedSelector({ rate, onSelect }: SpeedSelectorProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button data-testid="tts-speed" variant="ghost" size="sm" aria-label="Playback speed">
          {rate}x
          <ChevronUp className="ml-1 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {TTS_SPEED_OPTIONS.map((speed) => (
          <DropdownMenuItem key={speed} data-testid={`tts-speed-${speed}`} onClick={() => onSelect(speed)}>
            {speed}x
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
