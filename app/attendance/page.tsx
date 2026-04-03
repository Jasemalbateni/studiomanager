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
  BROADCAST_LABELS, ATTENDANCE_COLORS, ATTENDANCE_LABELS, ATTENDANCE_SHORT
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

const MY_STATUSES: AttendanceStatus[] = ['present', 'absent', 'late', 'left_early'];

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
    const end = format(endOfMonth(parseISO(month + '-01')), 'yyyy-MM-dd');

    const { data } = await supabase
      .from('event_instances')
      .select('*, schedule:program_schedules(*), my_attendance(id, status)')
      .gte('date', start)
      .lte('date', end)
      .eq('is_cancelled', false)
      .order('date', { ascending: true });

    if (data) {
      setItems(data.map((item: any) => {
        const r = resolveEventValues(item, item.schedule);
        return {
          eventId: item.id, date: item.date,
          name: r.name, category: r.category as Category, broadcast_mode: r.broadcast_mode as BroadcastMode,
          start_time: r.start_time, end_time: r.end_time,
          attendanceId: item.my_attendance?.[0]?.id ?? null,
          status: item.my_attendance?.[0]?.status ?? null,
        };
      }));
    }
    setLoading(false);
  }

  async function handleStatus(item: AttendanceItem, status: AttendanceStatus) {
    setUpdating(item.eventId);
    if (item.attendanceId) {
      if (item.status === status) {
        await supabase.from('my_attendance').delete().eq('id', item.attendanceId);
        setItems(prev => prev.map(i => i.eventId === item.eventId ? { ...i, attendanceId: null, status: null } : i));
      } else {
        const { data } = await supabase.from('my_attendance').update({ status }).eq('id', item.attendanceId).select().single();
        setItems(prev => prev.map(i => i.eventId === item.eventId ? { ...i, status: data?.status ?? null } : i));
      }
    } else {
      const { data } = await supabase.from('my_attendance').insert({ event_id: item.eventId, status }).select().single();
      setItems(prev => prev.map(i => i.eventId === item.eventId ? { ...i, attendanceId: data?.id ?? null, status: data?.status ?? null } : i));
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
            {[1, 2, 3].map(i => <div key={i} className="h-40 bg-muted rounded-2xl animate-pulse" />)}
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
                          item.status === 'present'    && 'border-emerald-200 bg-emerald-50/50',
                          item.status === 'absent'     && 'border-red-200',
                          item.status === 'late'       && 'border-amber-200',
                          item.status === 'left_early' && 'border-orange-200',
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
                              <span className="text-xs text-muted-foreground">غير مُسجَّل</span>
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
                            <p className="text-xs text-muted-foreground mt-0.5" dir="ltr">{item.start_time} – {item.end_time}</p>
                          </div>
                        </div>

                        {/* Status chips */}
                        <div className="grid grid-cols-4 gap-1.5">
                          {MY_STATUSES.map(s => (
                            <button
                              key={s}
                              onClick={() => handleStatus(item, s)}
                              disabled={updating === item.eventId}
                              className={cn(
                                'py-2 rounded-xl border text-xs font-bold transition-colors touch-target',
                                item.status === s
                                  ? ATTENDANCE_COLORS[s]
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
