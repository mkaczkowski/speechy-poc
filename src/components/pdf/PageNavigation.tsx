import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface PageNavigationProps {
  pageNumber: number;
  numPages: number;
  onPrevious: () => void;
  onNext: () => void;
}

export function PageNavigation({ pageNumber, numPages, onPrevious, onNext }: PageNavigationProps) {
  return (
    <div className="flex items-center gap-2" data-testid="pdf-navigation">
      <Button variant="outline" size="icon-sm" onClick={onPrevious} disabled={pageNumber <= 1} aria-label="Previous page">
        <ChevronLeft className="size-4" />
      </Button>
      <span className="text-muted-foreground text-sm">
        {pageNumber} / {numPages}
      </span>
      <Button variant="outline" size="icon-sm" onClick={onNext} disabled={pageNumber >= numPages} aria-label="Next page">
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
