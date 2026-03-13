import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSetRate = vi.fn();
const mockSetSelectedVoice = vi.fn();

vi.mock('@/stores', () => ({
  useTtsStore: Object.assign(
    vi.fn(() => ({ isPlaying: false, isPaused: false, rate: 1, selectedVoice: null })),
    {
      use: {
        isPlaying: vi.fn(() => false),
        isPaused: vi.fn(() => false),
        rate: vi.fn(() => 1),
        selectedVoice: vi.fn(() => null),
        currentCharIndex: vi.fn(() => 0),
      },
      getState: vi.fn(() => ({
        setRate: mockSetRate,
        setSelectedVoice: mockSetSelectedVoice,
      })),
    },
  ),
}));

import { useTtsStore } from '@/stores';
import { render } from '@/test';

import { TtsControls } from './TtsControls';

const defaultProps = {
  onPlay: vi.fn(),
  onPause: vi.fn(),
  onResume: vi.fn(),
  onStop: vi.fn(),
  voices: [],
  totalChars: 10,
};

function setStoreState(overrides?: { isPlaying?: boolean; isPaused?: boolean; rate?: number; currentCharIndex?: number }) {
  (useTtsStore.use.isPlaying as ReturnType<typeof vi.fn>).mockReturnValue(overrides?.isPlaying ?? false);
  (useTtsStore.use.isPaused as ReturnType<typeof vi.fn>).mockReturnValue(overrides?.isPaused ?? false);
  (useTtsStore.use.rate as ReturnType<typeof vi.fn>).mockReturnValue(overrides?.rate ?? 1);
  (useTtsStore.use.selectedVoice as ReturnType<typeof vi.fn>).mockReturnValue(null);
  (useTtsStore.use.currentCharIndex as ReturnType<typeof vi.fn>).mockReturnValue(overrides?.currentCharIndex ?? 0);
}

function createVoice(index: number): SpeechSynthesisVoice {
  return {
    voiceURI: `voice-${index}`,
    name: `Example Voice ${index}`,
    lang: 'en-US',
  } as SpeechSynthesisVoice;
}

describe('TtsControls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setStoreState();
  });

  it.each([
    {
      state: 'stopped',
      isPlaying: false,
      isPaused: false,
      expectedLabel: 'Play',
      expectedHandler: 'onPlay',
    },
    {
      state: 'playing',
      isPlaying: true,
      isPaused: false,
      expectedLabel: 'Pause',
      expectedHandler: 'onPause',
    },
    {
      state: 'paused',
      isPlaying: true,
      isPaused: true,
      expectedLabel: 'Play',
      expectedHandler: 'onResume',
    },
  ])(
    'play/pause button behaves correctly when $state',
    async ({ isPlaying, isPaused, expectedLabel, expectedHandler }) => {
      const user = userEvent.setup();
      setStoreState({ isPlaying, isPaused });
      const handlers = {
        onPlay: vi.fn(),
        onPause: vi.fn(),
        onResume: vi.fn(),
      };

      render(<TtsControls {...defaultProps} {...handlers} />);
      const button = screen.getByTestId('tts-play-pause');

      expect(button).toHaveAttribute('aria-label', expectedLabel);
      await user.click(button);
      expect(handlers[expectedHandler as keyof typeof handlers]).toHaveBeenCalledOnce();
    },
  );

  it('invokes onPlay without forwarding click event arguments', async () => {
    const user = userEvent.setup();
    const onPlay = vi.fn();

    setStoreState({ isPlaying: false, isPaused: false });
    render(<TtsControls {...defaultProps} onPlay={onPlay} />);

    await user.click(screen.getByTestId('tts-play-pause'));

    expect(onPlay).toHaveBeenCalledOnce();
    expect(onPlay).toHaveBeenCalledWith();
  });

  it.each([
    { isPlaying: false, isPaused: false, disabled: true },
    { isPlaying: true, isPaused: false, disabled: false },
  ])('stop button disabled=$disabled when active flags are $isPlaying/$isPaused', ({ isPlaying, isPaused, disabled }) => {
    setStoreState({ isPlaying, isPaused });
    render(<TtsControls {...defaultProps} />);

    const stopBtn = screen.getByTestId('tts-stop');
    if (disabled) {
      expect(stopBtn).toBeDisabled();
    } else {
      expect(stopBtn).not.toBeDisabled();
    }
  });

  it.each([
    { isPlaying: false, isPaused: false, currentCharIndex: 5, expectedWidth: '0%' },
    { isPlaying: true, isPaused: false, currentCharIndex: 5, expectedWidth: '50%' },
  ])(
    'progress bar width is $expectedWidth when active flags are $isPlaying/$isPaused',
    ({ isPlaying, isPaused, currentCharIndex, expectedWidth }) => {
      setStoreState({ isPlaying, isPaused, currentCharIndex });
      render(<TtsControls {...defaultProps} totalChars={10} />);
      expect(screen.getByTestId('tts-progress-bar')).toHaveStyle({ width: expectedWidth });
    },
  );

  it('renders only five example voices in the selector menu', async () => {
    const user = userEvent.setup();
    const voices = Array.from({ length: 7 }, (_, index) => createVoice(index + 1));

    render(<TtsControls {...defaultProps} voices={voices} />);
    await user.click(screen.getByTestId('tts-voice'));

    await screen.findByText('Example Voice 1 (en-US)');
    expect(screen.getByText('Example Voice 5 (en-US)')).toBeInTheDocument();
    expect(screen.queryByText('Example Voice 6 (en-US)')).not.toBeInTheDocument();
  });

  it('uses a wide, non-wrapping voice menu layout', async () => {
    const user = userEvent.setup();
    render(<TtsControls {...defaultProps} voices={[createVoice(1)]} />);

    await user.click(screen.getByTestId('tts-voice'));

    const menu = screen.getByRole('menu');
    const menuItem = screen.getByText('Example Voice 1 (en-US)');

    expect(menu).toHaveClass('w-max', 'min-w-[20rem]');
    expect(menuItem).toHaveClass('whitespace-nowrap');
  });
});
