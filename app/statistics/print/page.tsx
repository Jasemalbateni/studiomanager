import { Suspense } from 'react';
import { PrintContent } from './content';

export default function PrintPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground text-sm">جارٍ تحميل التقرير…</p>
      </div>
    }>
      <PrintContent />
    </Suspense>
  );
}
