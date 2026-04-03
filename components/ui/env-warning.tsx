import { AlertTriangle } from 'lucide-react';

export function EnvWarning() {
  return (
    <div className="mx-4 mb-2 bg-amber-50 border border-amber-300 rounded-2xl px-4 py-3 flex items-start gap-3">
      <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
      <div className="text-right flex-1">
        <p className="text-sm font-bold text-amber-800">Supabase غير مضبوط</p>
        <p className="text-xs text-amber-700 mt-0.5">
          افتح ملف <code className="font-mono bg-amber-100 px-1 rounded">.env.local</code> وضع بيانات مشروع Supabase الخاص بك:
        </p>
        <pre className="text-[11px] bg-amber-100 rounded p-2 mt-1.5 text-left dir-ltr overflow-x-auto text-amber-900">
{`NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...`}
        </pre>
        <p className="text-xs text-amber-700 mt-1.5">
          ثم أوقف السيرفر وأعد تشغيله بـ <code className="font-mono bg-amber-100 px-1 rounded">npm run dev</code>
        </p>
      </div>
    </div>
  );
}
