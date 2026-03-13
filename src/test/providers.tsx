import { render, type RenderOptions } from '@testing-library/react';
import { type ReactElement, type ReactNode } from 'react';

interface WrapperProps {
  children: ReactNode;
}

/**
 * Shared provider wrapper for component tests.
 * Extend this when tests need the same provider stack as the app runtime.
 */
function AllProviders({ children }: WrapperProps) {
  return <>{children}</>;
}

/**
 * Testing Library render pre-wired with project providers.
 * Use this helper in tests to avoid repeating wrapper setup.
 */
function customRender(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: AllProviders, ...options });
}

export { customRender as render };
