/**
 * Application configuration.
 * Centralized config derived from environment variables.
 */

export const config = {
  appName: import.meta.env.VITE_APP_NAME || 'Speechy',
} as const;
