import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { mockAnimationFrameQueue } from '@/test';

import { useObservedWidth } from './useObservedWidth';

type ResizeObserverCallback = ConstructorParameters<typeof ResizeObserver>[0];

let resizeObserverCallback: ResizeObserverCallback | null = null;
let animationFrameQueue: ReturnType<typeof mockAnimationFrameQueue>;

function emitResize(width: number, element: HTMLElement) {
  if (!resizeObserverCallback) return;
  resizeObserverCallback(
    [{ target: element, contentRect: { width } as DOMRectReadOnly } as unknown as ResizeObserverEntry],
    {} as ResizeObserver,
  );
}

describe('useObservedWidth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resizeObserverCallback = null;
    animationFrameQueue = mockAnimationFrameQueue();
    vi.stubGlobal(
      'ResizeObserver',
      class ResizeObserverMock {
        constructor(callback: ResizeObserverCallback) {
          resizeObserverCallback = callback;
        }
        observe() {}
        disconnect() {}
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals(); // for ResizeObserver
    vi.restoreAllMocks();
  });

  it('coalesces multiple resize events into one animation-frame update', async () => {
    const element = document.createElement('div');
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 500, 300));
    const ref = { current: element };

    const { result } = renderHook(() => useObservedWidth(ref));

    await waitFor(() => {
      expect(result.current).toBe(500);
    });

    act(() => {
      emitResize(620, element);
      emitResize(640, element);
      emitResize(660, element);
    });

    expect(result.current).toBe(500);
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);

    act(() => {
      animationFrameQueue.flush();
    });

    expect(result.current).toBe(660);
  });

  it('ignores 1px width jitter but applies larger width changes', async () => {
    const element = document.createElement('div');
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 500, 300));
    const ref = { current: element };

    const { result } = renderHook(() => useObservedWidth(ref));

    await waitFor(() => {
      expect(result.current).toBe(500);
    });

    act(() => {
      emitResize(501, element);
      animationFrameQueue.flush();
    });

    expect(result.current).toBe(500);

    act(() => {
      emitResize(503, element);
      animationFrameQueue.flush();
    });

    expect(result.current).toBe(503);
  });

  it('starts observing when ref element appears after initial mount', async () => {
    const element = document.createElement('div');
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 700, 300));
    const ref: { current: HTMLElement | null } = { current: null };

    const { result, rerender } = renderHook(() => useObservedWidth(ref));
    expect(result.current).toBe(0);

    act(() => {
      ref.current = element;
    });
    rerender();

    await waitFor(() => {
      expect(result.current).toBe(700);
    });
  });

  it('drops pending frame updates when switching observed elements', async () => {
    const firstElement = document.createElement('div');
    const secondElement = document.createElement('div');
    vi.spyOn(firstElement, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 400, 200));
    vi.spyOn(secondElement, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 800, 200));
    const ref: { current: HTMLElement | null } = { current: firstElement };

    const { result, rerender } = renderHook(() => useObservedWidth(ref));

    await waitFor(() => {
      expect(result.current).toBe(400);
    });

    act(() => {
      emitResize(450, firstElement);
    });
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);

    act(() => {
      ref.current = secondElement;
    });
    rerender();

    await waitFor(() => {
      expect(result.current).toBe(800);
    });

    act(() => {
      animationFrameQueue.flush();
    });

    expect(result.current).toBe(800);
  });

  it('drops pending frame updates when observed element is removed', async () => {
    const element = document.createElement('div');
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 320, 200));
    const ref: { current: HTMLElement | null } = { current: element };

    const { result, rerender } = renderHook(() => useObservedWidth(ref));

    await waitFor(() => {
      expect(result.current).toBe(320);
    });

    act(() => {
      emitResize(600, element);
    });
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);

    act(() => {
      ref.current = null;
    });
    rerender();

    expect(result.current).toBe(320);

    act(() => {
      animationFrameQueue.flush();
    });

    expect(result.current).toBe(320);
  });

  it('cancels pending animation frame on unmount', async () => {
    const element = document.createElement('div');
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 320, 200));
    const ref = { current: element };

    const { unmount } = renderHook(() => useObservedWidth(ref));

    await waitFor(() => {
      expect(resizeObserverCallback).not.toBeNull();
    });

    act(() => {
      emitResize(480, element);
    });

    unmount();
    expect(cancelAnimationFrame).toHaveBeenCalledTimes(1);
  });
});
