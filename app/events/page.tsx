'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { Plus, CalendarDays } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { EventCard } from '@/components/events/event-card';
import { PageHeader } from '@/components/layout/page-header';
import { MonthFilter } from '@/components/ui/month-filter';
import { resolveEventValues } from '@/lib/recurrence';
import { arDate } from '@/lib/ar';
import { EventDisplay, Category, BroadcastMode } from '@/types';
import { cn } from '@/lib/utils';

export default function EventsPage() {
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [events, setEvents] = useState<EventDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<Category | 'all'>('all');
  const supabase = createClient();

  useEffect(() => { loadEvents(); }, [month]);

  async function loadEvents() {
    setLoading(true);
    const start = format(startOfMonth(parseISO(month + '-01')), 'yyyy-MM-dd');
    const end = format(endOfMonth(parseISO(month + '-01')), 'yyyy-MM-dd');

    const { data } = await supabase
      .from('event_instances')
      .select('*, schedule:program_schedules(*), crew:event_crew(count), my_attendance(status)')
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: true });

    if (data) {
      setEvents(data.map((item: any) => {
        const s = item.schedule;
        const r = s ? resolveEventValues(item, s) : {
          name: item.name_override ?? '', category: item.category_override ?? 'bulletin',
          broadcast_mode: item.broadcast_mode_override ?? 'live',
          start_time: item.start_time_override ?? '', end_time: item.end_time_override ?? '',
          bonus_amount: item.bonus_amount_override ?? null,
        };
        return {
          id: item.id, schedule_id: item.schedule_id, date: item.date,
          name: r.name, category: r.category as Category, broadcast_mode: r.broadcast_mode as BroadcastMode,
          start_time: r.start_time, end_time: r.end_time,
          is_overridden: item.is_overridden, is_cancelled: item.is_cancelled,
          crew_count: item.crew?.[0]?.count ?? 0,
          my_attendance_status: item.my_attendance?.[0]?.status ?? null,
          bonus_amount: r.bonus_amount,
        };
      }));
    }
    setLoading(false);
  }

  const filtered = categoryFilter === 'all' ? events : events.filter(e => e.category === categoryFilter);

  const grouped = filtered.reduce((acc, event) => {
    if (!acc[event.date]) acc[event.date] = [];
    acc[event.date].push(event);
    return acc;
  }, {} as Record<string, EventDisplay[]>);

  // Sort events within each day by start_time ascending
  Object.values(grouped).forEach(g => g.sort((a, b) => a.start_time.localeCompare(b.start_time)));

  const FILTERS: { value: Category | 'all'; label: string }[] = [
    { value: 'all',           label: 'الكل' },
    { value: 'bulletin',      label: 'النشرات' },
    { value: 'short_briefing',label: 'التقارير' },
    { value: 'program',       label: 'البرامج' },
  ];

  return (
    <div>
      <PageHeader
        title="الأحداث"
        subtitle={`${events.length} حدث هذا الشهر`}
        action={
          <Link
            href="/events/new"
            className="w-10 h-10 rounded-full bg-[#008D8B] flex items-center justify-center shadow-md active:scale-95 transition-transform"
          >
            <Plus size={22} className="text-white" />
          </Link>
        }
      />

      <div className="px-4 space-y-3 sticky top-0 bg-background z-10 pb-3 pt-1">
        <MonthFilter value={month} onChange={setMonth} />
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setCategoryFilter(f.value)}
              className={cn(
                'flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-bold transition-colors touch-target',
                categoryFilter === f.value ? 'bg-[#008D8B] text-white' : 'bg-white border text-muted-foreground'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pb-4">
        {loading ? (
          <div className="space-y-3 mt-2">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-muted rounded-2xl animate-pulse" />)}
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="mt-8 text-center py-12">
            <CalendarDays size={40} className="text-muted-foreground mx-auto mb-3" />
            <p className="text-base font-bold text-foreground mb-1">لا توجد أحداث هذا الشهر</p>
            <p className="text-sm text-muted-foreground mb-4">أنشئ جدولاً لبدء توليد الأحداث.</p>
            <Link
              href="/events/new"
              className="inline-flex items-center gap-2 bg-[#008D8B] text-white px-5 py-2.5 rounded-xl text-sm font-bold"
            >
              <Plus size={16} />
              جدول جديد
            </Link>
          </div>
        ) : (
          <div className="space-y-5 mt-2">
            {Object.entries(grouped).map(([date, dayEvents]) => (
              <div key={date}>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 px-1 text-right">
                  {arDate(parseISO(date))}
                </p>
                <div className="space-y-2">
                  {dayEvents.map(event => (
                    <EventCard key={event.id} event={event} showAttendance />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
