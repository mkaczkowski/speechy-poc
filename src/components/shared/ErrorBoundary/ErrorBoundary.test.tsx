import { fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { render } from '@/test';

function ThrowingComponent({ shouldThrow = true }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>Normal content</div>;
}

const originalConsoleError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});
afterEach(() => {
  console.error = originalConsoleError;
});

describe('ErrorBoundary', () => {
  it('renders children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <div>Safe content</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText('Safe content')).toBeInTheDocument();
  });

  it('renders fallback UI and forwards caught errors', () => {
    const onError = vi.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowingComponent />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ componentStack: expect.any(String) }),
    );
  });

  it('renders custom fallback instead of default UI', () => {
    render(
      <ErrorBoundary fallback={<div>Custom fallback</div>}>
        <ThrowingComponent />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Custom fallback')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it.each([
    {
      label: 'Try Again',
      click: () => fireEvent.click(screen.getByRole('button', { name: /try again/i })),
      assert: (onReset: ReturnType<typeof vi.fn>, reload: ReturnType<typeof vi.fn>) => {
        expect(onReset).toHaveBeenCalledTimes(1);
        expect(reload).not.toHaveBeenCalled();
      },
    },
    {
      label: 'Reload Page',
      click: () => fireEvent.click(screen.getByRole('button', { name: /reload page/i })),
      assert: (onReset: ReturnType<typeof vi.fn>, reload: ReturnType<typeof vi.fn>) => {
        expect(reload).toHaveBeenCalledTimes(1);
        expect(onReset).not.toHaveBeenCalled();
      },
    },
  ])('handles $label action', ({ click, assert }) => {
    const onReset = vi.fn();
    const reloadMock = vi.fn();
    const originalLocation = window.location;

    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, reload: reloadMock },
      writable: true,
    });

    render(
      <ErrorBoundary onReset={onReset}>
        <ThrowingComponent />
      </ErrorBoundary>,
    );

    click();
    assert(onReset, reloadMock);

    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
    });
  });
});
