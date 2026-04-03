import { createClient } from '@/lib/supabase/server';
import { ScheduleForm } from '@/components/events/schedule-form';
import { EnvWarning } from '@/components/ui/env-warning';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default async function NewEventPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const isConfigured = supabaseUrl.startsWith('http') && !supabaseUrl.includes('placeholder');

  let technicians: any[] = [];
  if (isConfigured) {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from('technicians')
        .select('*')
        .order('name', { ascending: true });
      technicians = data ?? [];
    } catch {
      // If DB not ready yet, still show the form
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 px-4 pt-5 pb-2">
        <div className="flex-1 text-right">
          <h1 className="text-lg font-extrabold">جدول جديد</h1>
          <p className="text-xs text-muted-foreground">إنشاء برنامج متكرر</p>
        </div>
        <Link href="/events" className="w-9 h-9 rounded-full border flex items-center justify-center bg-white flex-shrink-0">
          <ArrowRight size={18} />
        </Link>
      </div>

      {!isConfigured && <EnvWarning />}

      <ScheduleForm technicians={technicians} />
    </div>
  );
}
