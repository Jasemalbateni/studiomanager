'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ArrowRight, Phone, Pencil, Calendar } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { MonthFilter } from '@/components/ui/month-filter';
import { StatCard } from '@/components/statistics/stat-card';
import { resolveEventValues } from '@/lib/recurrence';
import { arDate } from '@/lib/ar';
import { ATTENDANCE_COLORS, ATTENDANCE_LABELS, CATEGORY_LABELS, TECHNICIAN_STATUS_LABELS, TECHNICIAN_STATUS_COLORS, WEEKDAY_LABELS } from '@/lib/constants';
import { Technician, AttendanceStatus, Category } from '@/types';
import { cn } from '@/lib/utils';
import { TechnicianForm } from '@/components/technicians/technician-form';

interface TechnicianDetailPageProps {
  params: Promise<{ id: string }>;
}

interface RecentItem {
  eventId: string;
  date: string;
  name: string;
  category: Category;
  status: AttendanceStatus | null;
}

export default function TechnicianDetailPage({ params }: TechnicianDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const supabase = createClient();
  const [tech, setTech] = useState<Technician | null>(null);
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => { loadTechnician(); }, [id]);
  useEffect(() => { if (tech) loadMonthData(); }, [month, tech]);

  async function loadTechnician() {
    const { data } = await supabase.from('technicians').select('*').eq('id', id).single();
    if (!data) { router.push('/technicians'); return; }
    setTech(data);
    setLoading(false);
  }

  async function loadMonthData() {
    const start = format(startOfMonth(parseISO(month + '-01')), 'yyyy-MM-dd');
    const end = format(endOfMonth(parseISO(month + '-01')), 'yyyy-MM-dd');

    const { data } = await supabase
      .from('event_crew')
      .select('event_id, event:event_instances(*, schedule:program_schedules(*)), attendance:technician_attendance(status)')
      .eq('technician_id', id)
      .gte('event.date', start)
      .lte('event.date', end);

    if (data) {
      const items: RecentItem[] = (data as any[])
        .filter(d => d.event)
        .map(d => {
          const resolved = resolveEventValues(d.event, d.event.schedule);
          return {
            eventId: d.event.id, date: d.event.date,
            name: resolved.name, category: resolved.category as Category,
            status: d.attendance?.[0]?.status ?? null,
          };
        })
        .sort((a, b) => a.date.localeCompare(b.date));
      setRecentItems(items);
    }
  }

  if (loading || !tech) {
    return (
      <div className="px-4 py-6 space-y-4">
        <div className="h-8 bg-muted rounded-xl animate-pulse w-32" />
        <div className="h-32 bg-muted rounded-2xl animate-pulse" />
      </div>
    );
  }

  const totalAssigned = recentItems.length;
  const present   = recentItems.filter(i => i.status === 'present').length;
  const absent    = recentItems.filter(i => i.status === 'absent').length;
  const late      = recentItems.filter(i => i.status === 'late').length;
  const leftEarly = recentItems.filter(i => i.status === 'left_early').length;
  const unrecorded = recentItems.filter(i => i.status === null).length;

  return (
    <div className="pb-6">
      <div className="flex items-center gap-3 px-4 pt-5 pb-4">
        <button onClick={() => setShowEdit(true)} className="w-9 h-9 rounded-full bg-[#008D8B] flex items-center justify-center shadow-sm flex-shrink-0">
          <Pencil size={16} className="text-white" />
        </button>
        <div className="flex-1" />
        <Link href="/technicians" className="w-9 h-9 rounded-full border flex items-center justify-center bg-white flex-shrink-0">
          <ArrowRight size={18} />
        </Link>
      </div>

      {/* Profile card */}
      <div className="mx-4">
        <div className="bg-white rounded-2xl border p-5 shadow-sm flex items-start gap-4">
          <div className="flex-1 min-w-0 text-right">
            <div className="flex items-center justify-end gap-2 flex-wrap">
              <h1 className="text-xl font-extrabold text-foreground">{tech.name}</h1>
              <span className={cn('text-xs font-bold px-2.5 py-0.5 rounded-full', TECHNICIAN_STATUS_COLORS[tech.status])}>
                {TECHNICIAN_STATUS_LABELS[tech.status]}
              </span>
            </div>
            <p className="text-sm text-[#008D8B] font-bold mt-0.5">{tech.role}</p>
            {tech.phone && (
              <p className="text-sm text-muted-foreground mt-1 flex items-center justify-end gap-1.5">
                {tech.phone}
                <Phone size={13} />
              </p>
            )}
            {/* Default schedule */}
            {(tech.default_days ?? []).length > 0 && (
              <div className="flex gap-1 justify-end mt-2 flex-wrap">
                {(tech.default_days ?? []).map(d => (
                  <span key={d} className="text-xs bg-[#008D8B]/10 text-[#008D8B] font-bold px-2 py-0.5 rounded-md">
                    {WEEKDAY_LABELS[d]}
                  </span>
                ))}
                {(tech.work_start_time || tech.work_end_time) && (
                  <span className="text-xs text-muted-foreground px-1 py-0.5" dir="ltr">
                    {tech.work_start_time ?? ''}{tech.work_start_time && tech.work_end_time ? ' – ' : ''}{tech.work_end_time ?? ''}
                  </span>
                )}
              </div>
            )}
            {tech.notes && (
              <p className="text-xs text-muted-foreground mt-2 bg-muted rounded-xl px-3 py-2">{tech.notes}</p>
            )}
          </div>
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-bl from-[#9EB2A6] to-[#569691] flex items-center justify-center text-white font-extrabold text-2xl flex-shrink-0">
            {tech.name.charAt(0)}
          </div>
        </div>
      </div>

      {/* Monthly stats */}
      <div className="px-4 mt-5">
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3 text-right">الإحصائيات الشهرية</h2>
        <MonthFilter value={month} onChange={setMonth} className="mb-4" />

        <div className="grid grid-cols-2 gap-2 mb-4">
          <StatCard label="المُكلَّف بهم" value={totalAssigned} />
          <StatCard label="حاضر" value={present} accent />
          <StatCard label="غائب" value={absent} />
          <StatCard label="متأخر" value={late} />
          <StatCard label="غادر" value={leftEarly} />
          <StatCard label="غير مُسجَّل" value={unrecorded} />
        </div>

        {/* Category breakdown */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {(['bulletin', 'short_briefing', 'program'] as Category[]).map(cat => (
            <div key={cat} className="bg-white rounded-2xl border p-3 text-center shadow-sm">
              <p className="text-lg font-extrabold">{recentItems.filter(i => i.category === cat).length}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{CATEGORY_LABELS[cat]}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Events list */}
      <div className="px-4">
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3 text-right">
          أحداث هذا الشهر ({recentItems.length})
        </h2>
        {recentItems.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-2xl border">
            <Calendar size={32} className="text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">لا توجد أحداث مُعيَّنة هذا الشهر</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentItems.map(item => (
              <Link
                key={item.eventId}
                href={`/events/${item.eventId}`}
                className="flex items-center gap-3 bg-white rounded-2xl border p-3.5 shadow-sm active:scale-[0.99]"
              >
                {item.status && (
                  <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full border flex-shrink-0', ATTENDANCE_COLORS[item.status])}>
                    {ATTENDANCE_LABELS[item.status]}
                  </span>
                )}
                <div className="flex-1 min-w-0 text-right">
                  <p className="text-sm font-bold text-foreground truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {arDate(parseISO(item.date))} · {CATEGORY_LABELS[item.category]}
                  </p>
                </div>
                <div className={cn('w-2 h-2 rounded-full flex-shrink-0',
                  item.status === 'present'    ? 'bg-emerald-500' :
                  item.status === 'absent'     ? 'bg-red-500' :
                  item.status === 'late'       ? 'bg-amber-500' :
                  item.status === 'left_early' ? 'bg-orange-500' : 'bg-gray-300'
                )} />
              </Link>
            ))}
          </div>
        )}
      </div>

      {showEdit && (
        <TechnicianForm
          initial={tech}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); loadTechnician(); }}
        />
      )}
    </div>
  );
}
