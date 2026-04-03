import { Suspense } from 'react';
import { TeamPrintContent } from './content';

export default function TeamPrintPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground text-sm">جارٍ تحميل تقرير الفريق…</p>
      </div>
    }>
      <TeamPrintContent />
    </Suspense>
  );
}
