import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Composes conditional class names and resolves Tailwind utility conflicts.
 * Use this for component `className` construction instead of manual string
 * concatenation when classes depend on props or state.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
