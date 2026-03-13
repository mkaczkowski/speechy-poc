import { Spinner } from '@/components/ui/spinner';

export function PdfLoadingState() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" data-testid="pdf-loading">
      <Spinner size="lg" />
    </div>
  );
}
