import { Suspense } from 'react';
import { TechPrintContent } from './content';

export default function TechPrintPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground text-sm">جارٍ تحميل تقرير الفني…</p>
      </div>
    }>
      <TechPrintContent />
    </Suspense>
  );
}
