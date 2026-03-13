import { ErrorBoundary } from '@/components/shared';
import { PdfViewer } from '@/components/pdf';
import { Header } from '@/components/layout';
import { SkipLink } from '@/components/ui/visually-hidden';

export default function App() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <SkipLink />
      <Header />
      <main id="main">
        <div className="container mx-auto px-4 py-8">
          <ErrorBoundary>
            <PdfViewer url="/sample.pdf" />
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
