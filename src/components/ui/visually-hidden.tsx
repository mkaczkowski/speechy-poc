import type { ReactNode } from 'react';

/**
 * Skip link for keyboard navigation.
 * Becomes visible on focus.
 */
export function SkipLink({
  href = '#main',
  children = 'Skip to main content',
}: {
  href?: string;
  children?: ReactNode;
}) {
  return (
    <a
      href={href}
      className="bg-background text-foreground ring-ring fixed top-4 left-4 z-50 -translate-y-16 rounded-md px-4 py-2 font-medium transition-transform focus:translate-y-0 focus:ring-2"
    >
      {children}
    </a>
  );
}
