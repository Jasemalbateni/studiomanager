'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PageHeader } from '@/components/layout/page-header';
import { MonthFilter } from '@/components/ui/month-filter';
import { resolveEventValues } from '@/lib/recurrence';
import { arDate } from '@/lib/ar';
import {
  CATEGORY_LABELS, CATEGORY_COLORS, BROADCAST_COLORS,
  BROADCAST_LABELS, ATTENDANCE_COLORS, ATTENDANCE_ACTIVE_COLORS, ATTENDANCE_SHORT
} from '@/lib/constants';
import { AttendanceStatus, Category, BroadcastMode } from '@/types';
import { cn } from '@/lib/utils';

interface AttendanceItem {
  eventId: string;
  date: string;
  name: string;
  category: Category;
  broadcast_mode: BroadcastMode;
  start_time: string;
  end_time: string;
  attendanceId: string | null;
  status: AttendanceStatus | null;
}

const ALL_STATUSES: AttendanceStatus[] = ['present', 'absent', 'late', 'left_early', 'on_leave', 'excused'];

const CARD_BORDER: Partial<Record<AttendanceStatus, string>> = {
  present:    'border-emerald-200 bg-emerald-50/50',
  absent:     'border-red-200',
  late:       'border-amber-200',
  left_early: 'border-orange-200',
  on_leave:   'border-sky-200',
  excused:    'border-violet-200',
};

export default function AttendancePage() {
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [items, setItems] = useState<AttendanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => { loadItems(); }, [month]);

  async function loadItems() {
    setLoading(true);
    const start = format(startOfMonth(parseISO(month + '-01')), 'yyyy-MM-dd');
    const end   = format(endOfMonth(parseISO(month + '-01')),   'yyyy-MM-dd');

    // Step 1: fetch events for the month
    const { data: eventsData } = await supabase
      .from('event_instances')
      .select('*, schedule:program_schedules(*)')
      .gte('date', start)
      .lte('date', end)
      .eq('is_cancelled', false)
      .order('date', { ascending: true });

    if (!eventsData || eventsData.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    // Step 2: fetch my_attendance only for the event IDs we just loaded.
    // We deliberately avoid using PostgREST embedded selects for my_attendance
    // because the UNIQUE(event_id) constraint causes PostgREST v12+ to return
    // the record as a plain object rather than an array, which breaks [0] indexing
    // on reload and makes the saved status appear missing.
    const eventIds = eventsData.map((e: any) => e.id);
    const { data: attData } = await supabase
      .from('my_attendance')
      .select('id, event_id, status')
      .in('event_id', eventIds);

    // Build a map for O(1) lookups
    const attMap = new Map<string, { id: string; status: AttendanceStatus }>(
      (attData ?? []).map((a: any) => [a.event_id, { id: a.id, status: a.status as AttendanceStatus }])
    );

    setItems(eventsData.map((item: any) => {
      const r   = resolveEventValues(item, item.schedule);
      const att = attMap.get(item.id) ?? null;
      return {
        eventId:       item.id,
        date:          item.date,
        name:          r.name,
        category:      r.category as Category,
        broadcast_mode: r.broadcast_mode as BroadcastMode,
        start_time:    r.start_time,
        end_time:      r.end_time,
        attendanceId:  att?.id   ?? null,
        status:        att?.status ?? null,
      };
    }));

    setLoading(false);
  }

  async function handleStatus(item: AttendanceItem, status: AttendanceStatus) {
    setUpdating(item.eventId);

    if (item.attendanceId) {
      if (item.status === status) {
        // Tap active status again → deselect
        await supabase.from('my_attendance').delete().eq('id', item.attendanceId);
        setItems(prev => prev.map(i =>
          i.eventId === item.eventId ? { ...i, attendanceId: null, status: null } : i
        ));
      } else {
        // Switch to a different status
        const { data } = await supabase
          .from('my_attendance')
          .update({ status })
          .eq('id', item.attendanceId)
          .select('id, status')
          .single();
        if (data) {
          setItems(prev => prev.map(i =>
            i.eventId === item.eventId ? { ...i, status: data.status as AttendanceStatus } : i
          ));
        }
      }
    } else {
      // No existing record — create one
      const { data } = await supabase
        .from('my_attendance')
        .insert({ event_id: item.eventId, status })
        .select('id, status')
        .single();
      if (data) {
        setItems(prev => prev.map(i =>
          i.eventId === item.eventId ? { ...i, attendanceId: data.id, status: data.status as AttendanceStatus } : i
        ));
      }
    }

    setUpdating(null);
  }

  const grouped = items.reduce((acc, item) => {
    if (!acc[item.date]) acc[item.date] = [];
    acc[item.date].push(item);
    return acc;
  }, {} as Record<string, AttendanceItem[]>);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const recordedCount = items.filter(i => i.status !== null).length;

  return (
    <div>
      <PageHeader
        title="حضوري"
        subtitle={`${recordedCount} / ${items.length} مُسجَّل`}
      />

      <div className="px-4 sticky top-0 bg-background z-10 pb-3 pt-1">
        <MonthFilter value={month} onChange={setMonth} />
      </div>

      <div className="px-4 pb-4">
        {loading ? (
          <div className="space-y-4 mt-2">
            {[1, 2, 3].map(i => <div key={i} className="h-44 bg-muted rounded-2xl animate-pulse" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="mt-8 text-center py-12">
            <CalendarDays size={40} className="text-muted-foreground mx-auto mb-3" />
            <p className="text-base font-bold">لا توجد أحداث هذا الشهر</p>
            <p className="text-sm text-muted-foreground mt-1">ستظهر الأحداث هنا عند إنشاء الجداول.</p>
          </div>
        ) : (
          <div className="space-y-6 mt-2">
            {Object.entries(grouped).map(([date, dayItems]) => {
              const isToday = date === todayStr;
              return (
                <div key={date}>
                  <p className={cn(
                    'text-xs font-bold uppercase tracking-wide mb-2 px-1 text-right',
                    isToday ? 'text-[#008D8B]' : 'text-muted-foreground'
                  )}>
                    {isToday ? `● اليوم — ${arDate(parseISO(date))}` : arDate(parseISO(date))}
                  </p>

                  <div className="space-y-2">
                    {dayItems.map(item => (
                      <div
                        key={item.eventId}
                        className={cn(
                          'bg-white rounded-2xl border p-4 shadow-sm',
                          item.status ? CARD_BORDER[item.status] : ''
                        )}
                      >
                        {/* Event info */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex-shrink-0">
                            {item.status ? (
                              <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full border', ATTENDANCE_COLORS[item.status])}>
                                {ATTENDANCE_SHORT[item.status]}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground border border-dashed rounded-full px-2.5 py-1">
                                غير مُسجَّل
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0 text-right">
                            <div className="flex items-center gap-1.5 mb-1 flex-wrap justify-end">
                              <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', BROADCAST_COLORS[item.broadcast_mode])}>
                                {BROADCAST_LABELS[item.broadcast_mode]}
                              </span>
                              <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', CATEGORY_COLORS[item.category])}>
                                {CATEGORY_LABELS[item.category]}
                              </span>
                            </div>
                            <p className="font-bold text-sm text-foreground">{item.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5" dir="ltr">
                              {item.start_time} – {item.end_time}
                            </p>
                          </div>
                        </div>

                        {/* Status buttons — 3×2 grid, active button shows solid colour */}
                        <div className="grid grid-cols-3 gap-1.5">
                          {ALL_STATUSES.map(s => (
                            <button
                              key={s}
                              onClick={() => handleStatus(item, s)}
                              disabled={updating === item.eventId}
                              className={cn(
                                'py-2 rounded-xl border text-xs font-bold transition-colors touch-target',
                                item.status === s
                                  ? ATTENDANCE_ACTIVE_COLORS[s]
                                  : 'bg-white text-muted-foreground border-border'
                              )}
                            >
                              {ATTENDANCE_SHORT[s]}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
