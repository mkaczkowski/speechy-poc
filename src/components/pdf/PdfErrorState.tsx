import { RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface PdfErrorStateProps {
  message: string;
  onRetry: () => void;
}

export function PdfErrorState({ message, onRetry }: PdfErrorStateProps) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4" data-testid="pdf-error">
      <p className="text-destructive text-sm">Failed to load PDF: {message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RotateCcw className="mr-2 size-4" />
        Retry
      </Button>
    </div>
  );
}
