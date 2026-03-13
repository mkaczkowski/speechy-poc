import { expect, test } from '@playwright/test';

test('renders real PDF text and shows sentence/word highlights during playback', async ({ page }) => {
  await page.addInitScript(() => {
    class MockUtterance {
      text: string;
      rate = 1;
      voice: SpeechSynthesisVoice | null = null;
      onboundary: ((event: { name: string; charIndex: number }) => void) | null = null;
      onend: (() => void) | null = null;
      onerror: ((event: { error: string }) => void) | null = null;

      constructor(text: string) {
        this.text = text;
      }
    }

    const speechSynthesisMock = {
      speak: (utterance: { onboundary: ((event: { name: string; charIndex: number }) => void) | null }) => {
        [0, 10, 25].forEach((charIndex, index) => {
          setTimeout(() => {
            utterance.onboundary?.({ name: 'word', charIndex });
          }, (index + 1) * 30);
        });
      },
      cancel: () => undefined,
      pause: () => undefined,
      resume: () => undefined,
      getVoices: () => [],
      addEventListener: (_type: string, _listener: EventListenerOrEventListenerObject) => undefined,
      removeEventListener: (_type: string, _listener: EventListenerOrEventListenerObject) => undefined,
    };

    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      configurable: true,
      writable: true,
      value: MockUtterance as unknown as typeof SpeechSynthesisUtterance,
    });
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: speechSynthesisMock as unknown as SpeechSynthesis,
    });
  });

  await page.goto('/');

  const canvas = page.getByTestId('pdf-canvas');
  const textLayer = page.getByTestId('pdf-text-layer');
  const previousPageButton = page.getByRole('button', { name: 'Previous page' });
  const nextPageButton = page.getByRole('button', { name: 'Next page' });
  const playButton = page.getByRole('button', { name: /^Play$/ });
  const stopButton = page.getByRole('button', { name: 'Stop' });

  await expect(page.getByRole('heading', { level: 1, name: 'Speechy' })).toBeVisible();
  await expect(page.getByRole('banner')).toBeVisible();
  await expect(page.getByRole('main')).toBeVisible();
  await expect(canvas).toBeVisible();
  await expect(textLayer.locator('span').first()).toBeAttached();
  await expect(textLayer).toContainText('artificial intelligence');
  await expect(page.getByText(/failed to load pdf/i)).toHaveCount(0);
  await expect(page.getByText(/1\s*\/\s*2/)).toBeVisible();
  await expect(previousPageButton).toBeDisabled();
  await expect(nextPageButton).toBeEnabled();
  await expect(playButton).toBeVisible();
  await expect(stopButton).toBeDisabled();

  const canvasBox = await canvas.boundingBox();
  expect(canvasBox).not.toBeNull();
  expect(canvasBox!.width).toBeGreaterThan(100);
  expect(canvasBox!.height).toBeGreaterThan(100);

  await playButton.click();
  await expect(stopButton).toBeEnabled();
  await expect(page.getByTestId('highlight-overlay')).toBeVisible();
  const sentenceHighlight = page.getByTestId('sentence-highlight').first();
  const wordHighlight = page.getByTestId('word-highlight').first();
  await expect(sentenceHighlight).toBeVisible();
  await expect(wordHighlight).toBeVisible();

  const sentenceBox = await sentenceHighlight.boundingBox();
  const wordBox = await wordHighlight.boundingBox();
  expect(sentenceBox).not.toBeNull();
  expect(wordBox).not.toBeNull();
  expect(sentenceBox!.width).toBeGreaterThan(0);
  expect(sentenceBox!.height).toBeGreaterThan(0);
  expect(wordBox!.width).toBeGreaterThan(0);
  expect(wordBox!.height).toBeGreaterThan(0);
  expect(sentenceBox!.x).toBeGreaterThanOrEqual(canvasBox!.x);
  expect(sentenceBox!.y).toBeGreaterThanOrEqual(canvasBox!.y);
  expect(sentenceBox!.x + sentenceBox!.width).toBeLessThanOrEqual(canvasBox!.x + canvasBox!.width);
  expect(sentenceBox!.y + sentenceBox!.height).toBeLessThanOrEqual(canvasBox!.y + canvasBox!.height);
  expect(wordBox!.x).toBeGreaterThanOrEqual(canvasBox!.x);
  expect(wordBox!.y).toBeGreaterThanOrEqual(canvasBox!.y);
  expect(wordBox!.x + wordBox!.width).toBeLessThanOrEqual(canvasBox!.x + canvasBox!.width);
  expect(wordBox!.y + wordBox!.height).toBeLessThanOrEqual(canvasBox!.y + canvasBox!.height);

  await nextPageButton.click();
  await expect(page.getByText(/2\s*\/\s*2/)).toBeVisible();
  await expect(page.getByTestId('highlight-overlay')).toHaveCount(0);
  await expect(page.getByTestId('sentence-highlight')).toHaveCount(0);
  await expect(page.getByTestId('word-highlight')).toHaveCount(0);
  await expect(nextPageButton).toBeDisabled();
  await expect(previousPageButton).toBeEnabled();

  await previousPageButton.click();
  await expect(page.getByText(/1\s*\/\s*2/)).toBeVisible();
  await expect(previousPageButton).toBeDisabled();
  await expect(nextPageButton).toBeEnabled();
});
