import { AlertTriangle, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { ErrorFallbackUIProps } from '@/types';

export function ErrorFallbackUI({ error, onRetry, onReload }: ErrorFallbackUIProps) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="max-w-md rounded-lg border p-6">
        <div className="mb-2 flex items-center gap-2">
          <AlertTriangle className="text-destructive size-5" />
          <h2 className="text-lg font-semibold">Something went wrong</h2>
        </div>
        <p className="text-muted-foreground mb-4 text-sm">
          An unexpected error occurred. You can try again or reload the page.
        </p>
        {error && (
          <div className="bg-muted mb-4 rounded-md p-3">
            <p className="text-muted-foreground font-mono text-xs break-all">{error.message}</p>
          </div>
        )}
        <div className="flex gap-2">
          <Button onClick={onRetry} variant="default">
            Try Again
          </Button>
          <Button onClick={onReload} variant="outline">
            <RefreshCw className="mr-2 size-4" />
            Reload Page
          </Button>
        </div>
      </div>
    </div>
  );
}
