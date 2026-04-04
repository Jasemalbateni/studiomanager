'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { TrendingUp, Users, BarChart2, FileDown, Printer } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PageHeader } from '@/components/layout/page-header';
import { MonthFilter } from '@/components/ui/month-filter';
import { StatCard } from '@/components/statistics/stat-card';
import { resolveEventValues } from '@/lib/recurrence';
import { arDate, arMonthYear } from '@/lib/ar';
import { CATEGORY_LABELS, ATTENDANCE_LABELS, ATTENDANCE_COLORS, CURRENCY } from '@/lib/constants';
import { Technician, PricingSetting, Category, BroadcastMode, AttendanceStatus } from '@/types';
import { cn } from '@/lib/utils';

type TabType = 'mine' | 'crew';

export default function StatisticsPage() {
  const supabase = createClient();
  const [tab, setTab] = useState<TabType>('mine');
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [loading, setLoading] = useState(true);

  const [myEvents, setMyEvents] = useState<any[]>([]);
  const [pricing, setPricing] = useState<PricingSetting[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [crewEvents, setCrewEvents] = useState<any[]>([]);
  const [selectedTech, setSelectedTech] = useState<string | 'all'>('all');
  const [selectedRole, setSelectedRole] = useState<string | 'all'>('all');

  useEffect(() => { loadData(); }, [month]);

  async function loadData() {
    setLoading(true);
    const start = format(startOfMonth(parseISO(month + '-01')), 'yyyy-MM-dd');
    const end   = format(endOfMonth(parseISO(month + '-01')),   'yyyy-MM-dd');

    const [{ data: myData }, { data: pricingData }, { data: techData }, { data: crewData }] = await Promise.all([
      supabase.from('my_attendance')
        .select('status, event:event_instances(*, schedule:program_schedules(*))')
        .gte('event.date', start).lte('event.date', end),
      supabase.from('pricing_settings').select('*'),
      supabase.from('technicians').select('*').order('name'),
      supabase.from('technician_attendance')
        .select('technician_id, status, event:event_instances(*, schedule:program_schedules(*))')
        .gte('event.date', start).lte('event.date', end),
    ]);

    setMyEvents((myData as any[])?.filter(d => d.event && !d.event.is_cancelled) ?? []);
    setPricing(pricingData ?? []);
    setTechnicians(techData ?? []);
    setCrewEvents((crewData as any[])?.filter(d => d.event && !d.event.is_cancelled) ?? []);
    setLoading(false);
  }

  function getRate(category: string, broadcast_mode: string) {
    return pricing.find(p => p.category === category && p.broadcast_mode === broadcast_mode)?.rate
        ?? pricing.find(p => p.category === category && p.broadcast_mode === null)?.rate
        ?? 0;
  }

  const ROLE_ORDER = ['مصور', 'فني الصوت', 'مونتاج', 'اوتوكيو', 'شاشة', 'كابشن', 'مخرج', 'سويتشر', 'هندسة', 'مذيع'];
  const uniqueRoles = ROLE_ORDER.filter(r => technicians.some(t => t.role === r));
  const filteredTechnicians = selectedRole === 'all' ? technicians : technicians.filter(t => t.role === selectedRole);

  const myAttended = myEvents.filter(e => e.status === 'present' || e.status === 'late');
  const expectedAmount = myAttended.reduce((sum, e) => {
    const r = resolveEventValues(e.event, e.event.schedule);
    return sum + (r.bonus_amount ?? getRate(r.category, r.broadcast_mode));
  }, 0);

  const countMyCat = (cat: Category) =>
    myAttended.filter(e => resolveEventValues(e.event, e.event.schedule).category === cat).length;
  const countMyMode = (mode: BroadcastMode) =>
    myAttended.filter(e => resolveEventValues(e.event, e.event.schedule).broadcast_mode === mode).length;

  const breakdown = (['bulletin', 'short_briefing', 'program'] as Category[]).map(cat => {
    const catEvts = myAttended.filter(e => resolveEventValues(e.event, e.event.schedule).category === cat);
    const amount = catEvts.reduce((s, e) => {
      const r = resolveEventValues(e.event, e.event.schedule);
      return s + (r.bonus_amount ?? getRate(r.category, r.broadcast_mode));
    }, 0);
    return { cat, count: catEvts.length, amount };
  });

  // Group attended events by name, sorted by count descending
  // Group attended events by name, sorted by count descending
  const nameCountMap: Record<string, number> = {};
  myAttended.forEach(e => {
    const name = resolveEventValues(e.event, e.event.schedule).name;
    nameCountMap[name] = (nameCountMap[name] ?? 0) + 1;
  });
  const nameSummary = (Object.entries(nameCountMap) as [string, number][])
    .sort((a, b) => b[1] - a[1]);

  const crewCatCount = (techId: string, cat: Category) =>
    crewEvents.filter(e => e.technician_id === techId && resolveEventValues(e.event, e.event.schedule).category === cat).length;

  return (
    <div>
      <PageHeader title="الإحصائيات" subtitle={arMonthYear(parseISO(month + '-01'))} />

      <div className="px-4 sticky top-0 bg-background z-10 pb-3 pt-1 space-y-3">
        <MonthFilter value={month} onChange={setMonth} />
        <div className="flex rounded-xl border bg-muted p-1 gap-1">
          {[
            { value: 'mine' as TabType,  label: 'إحصائياتي',        icon: TrendingUp },
            { value: 'crew' as TabType,  label: 'إحصائيات الفريق',  icon: Users },
          ].map(t => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-bold transition-colors',
                tab === t.value ? 'bg-white text-[#008D8B] shadow-sm' : 'text-muted-foreground'
              )}
            >
              <t.icon size={15} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pb-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-muted rounded-2xl animate-pulse" />)}
          </div>
        ) : tab === 'mine' ? (
          <div className="space-y-4">
            {/* PDF export */}
            <div className="flex justify-start">
              <a
                href={`/statistics/print?month=${month}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-[#008D8B] bg-[#008D8B]/10 px-3 py-2 rounded-xl"
              >
                <FileDown size={15} />
                تصدير PDF
              </a>
            </div>

            {/* Bonus hero */}
            <div className="bg-gradient-to-bl from-[#008D8B] to-[#569691] rounded-2xl p-5 text-white">
              <p className="text-xs font-bold opacity-80 uppercase tracking-wide text-right">المكافأة المتوقعة</p>
              <p className="text-4xl font-extrabold mt-1 text-right">
                {expectedAmount.toFixed(0)}
                <span className="text-xl font-normal opacity-80 me-1">{CURRENCY}</span>
              </p>
              <p className="text-xs opacity-70 mt-1 text-right">
                {myAttended.length} حدث حضرته · {arMonthYear(parseISO(month + '-01'))}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <StatCard label="حاضر"             value={myEvents.filter(e => e.status === 'present').length} accent />
              <StatCard label="متأخر"            value={myEvents.filter(e => e.status === 'late').length} />
              <StatCard label="غائب"             value={myEvents.filter(e => e.status === 'absent').length} />
              <StatCard label="غادر أثناء العمل" value={myEvents.filter(e => e.status === 'left_early').length} />
              <StatCard label="إجازة"            value={myEvents.filter(e => e.status === 'on_leave').length} />
              <StatCard label="معتذر"            value={myEvents.filter(e => e.status === 'excused').length} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <StatCard label="مباشر"  value={countMyMode('live')} />
              <StatCard label="تسجيل" value={countMyMode('recording')} />
            </div>

            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide text-right">التفصيل حسب النوع</h3>
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
              {breakdown.map((b, idx) => (
                <div key={b.cat} className={cn('flex items-center justify-between px-4 py-3.5', idx < 2 && 'border-b')}>
                  <div className="text-left">
                    <p className="text-sm font-extrabold text-[#008D8B]">{b.amount.toFixed(0)} {CURRENCY}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.count > 0 ? `${(b.amount / b.count).toFixed(0)} للحدث` : '—'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{CATEGORY_LABELS[b.cat]}</p>
                    <p className="text-xs text-muted-foreground">{b.count} حدث</p>
                  </div>
                </div>
              ))}
            </div>

            {nameSummary.length > 0 && (
              <>
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide text-right">ملخص حسب اسم الحدث</h3>
                <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/40">
                    <p className="text-xs font-bold text-muted-foreground">العدد</p>
                    <p className="text-xs font-bold text-muted-foreground">اسم الحدث</p>
                  </div>
                  {nameSummary.map(([name, count], idx) => (
                    <div key={name} className={cn('flex items-center justify-between px-4 py-3', idx < nameSummary.length - 1 && 'border-b')}>
                      <span className="text-sm font-extrabold text-[#008D8B]">{count}</span>
                      <span className="text-sm font-bold text-right flex-1 ms-3">{name}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* PDF export buttons for crew tab */}
            <div className="flex gap-2 justify-start">
              {selectedTech === 'all' ? (
                <a
                  href={`/statistics/team-print?month=${month}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-[#008D8B] bg-[#008D8B]/10 px-3 py-2 rounded-xl"
                >
                  <Printer size={15} />
                  تصدير PDF للفريق
                </a>
              ) : (
                <a
                  href={`/statistics/tech-print/${selectedTech}?month=${month}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-[#008D8B] bg-[#008D8B]/10 px-3 py-2 rounded-xl"
                >
                  <FileDown size={15} />
                  تصدير PDF للفني المحدد
                </a>
              )}
            </div>

            {/* Role filter chips */}
            {uniqueRoles.length > 0 && (
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
                <button
                  onClick={() => { setSelectedRole('all'); setSelectedTech('all'); }}
                  className={cn(
                    'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-colors touch-target border',
                    selectedRole === 'all' ? 'bg-foreground text-background border-foreground' : 'bg-white text-muted-foreground border-border'
                  )}
                >
                  كل الأدوار
                </button>
                {uniqueRoles.map(role => (
                  <button
                    key={role}
                    onClick={() => { setSelectedRole(role); setSelectedTech('all'); }}
                    className={cn(
                      'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-colors touch-target border',
                      selectedRole === role ? 'bg-foreground text-background border-foreground' : 'bg-white text-muted-foreground border-border'
                    )}
                  >
                    {role}
                  </button>
                ))}
              </div>
            )}

            {/* Tech filter chips */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              <button
                onClick={() => setSelectedTech('all')}
                className={cn(
                  'flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-bold transition-colors touch-target border',
                  selectedTech === 'all' ? 'bg-[#008D8B] text-white border-[#008D8B]' : 'bg-white text-muted-foreground border-border'
                )}
              >
                كل الفريق
              </button>
              {filteredTechnicians.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTech(t.id)}
                  className={cn(
                    'flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-bold transition-colors touch-target border',
                    selectedTech === t.id ? 'bg-[#008D8B] text-white border-[#008D8B]' : 'bg-white text-muted-foreground border-border'
                  )}
                >
                  {t.name.split(' ')[0]}
                </button>
              ))}
            </div>

            {selectedTech === 'all' ? (
              <div className="space-y-2">
                {filteredTechnicians.map(tech => {
                  const techEvts = crewEvents.filter(e => e.technician_id === tech.id);
                  if (techEvts.length === 0) return null;
                  const presCount = techEvts.filter(e => e.status === 'present').length;
                  return (
                    <div key={tech.id} className="bg-white rounded-2xl border p-4 shadow-sm">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-xs font-extrabold text-[#008D8B]">{presCount}/{techEvts.length}</span>
                        <div className="flex-1 min-w-0 text-right">
                          <p className="font-bold text-sm">{tech.name}</p>
                          <p className="text-xs text-muted-foreground">{tech.role}</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-[#9EB2A6] flex items-center justify-center text-white font-bold flex-shrink-0">
                          {tech.name.charAt(0)}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(['present', 'absent', 'late', 'left_early', 'on_leave', 'excused'] as AttendanceStatus[]).map(s => (
                          <div key={s} className={cn('text-center py-1.5 rounded-lg text-xs font-bold', ATTENDANCE_COLORS[s])}>
                            <p className="text-base font-extrabold">{techEvts.filter(e => e.status === s).length}</p>
                            <p className="text-[10px]">{ATTENDANCE_LABELS[s].split(' ')[0]}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {filteredTechnicians.every(t => crewEvents.filter(e => e.technician_id === t.id).length === 0) && (
                  <div className="text-center py-12">
                    <BarChart2 size={36} className="text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">لا يوجد تسجيل لحضور الفريق هذا الشهر</p>
                  </div>
                )}
              </div>
            ) : (
              (() => {
                const tech = technicians.find(t => t.id === selectedTech);
                if (!tech) return null;
                const techEvts = crewEvents.filter(e => e.technician_id === selectedTech);
                return (
                  <div className="space-y-4">
                    <div className="bg-white rounded-2xl border p-4 shadow-sm flex items-center gap-3">
                      <div className="flex-1 text-right">
                        <p className="font-extrabold text-base">{tech.name}</p>
                        <p className="text-sm text-[#008D8B] font-bold">{tech.role}</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-bl from-[#9EB2A6] to-[#569691] flex items-center justify-center text-white font-extrabold text-lg flex-shrink-0">
                        {tech.name.charAt(0)}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <StatCard label="المُكلَّف بهم"       value={techEvts.length} />
                      <StatCard label="حاضر"              value={techEvts.filter(e => e.status === 'present').length} accent />
                      <StatCard label="غائب"              value={techEvts.filter(e => e.status === 'absent').length} />
                      <StatCard label="متأخر"             value={techEvts.filter(e => e.status === 'late').length} />
                      <StatCard label="غادر أثناء العمل"  value={techEvts.filter(e => e.status === 'left_early').length} />
                      <StatCard label="إجازة / معتذر"     value={techEvts.filter(e => e.status === 'on_leave' || e.status === 'excused').length} />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {(['bulletin', 'short_briefing', 'program'] as Category[]).map(cat => (
                        <div key={cat} className="bg-white rounded-2xl border p-3 text-center shadow-sm">
                          <p className="text-lg font-extrabold">{crewCatCount(selectedTech, cat)}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{CATEGORY_LABELS[cat]}</p>
                        </div>
                      ))}
                    </div>

                    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                      {techEvts.length === 0 ? (
                        <p className="text-center text-sm text-muted-foreground py-8">لا توجد أحداث هذا الشهر</p>
                      ) : techEvts.map((e, idx) => {
                        const resolved = resolveEventValues(e.event, e.event.schedule);
                        return (
                          <div key={e.event.id} className={cn('flex items-center justify-between px-4 py-3', idx < techEvts.length - 1 && 'border-b')}>
                            {e.status ? (
                              <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full border', ATTENDANCE_COLORS[e.status as AttendanceStatus])}>
                                {ATTENDANCE_LABELS[e.status as AttendanceStatus]}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                            <div className="text-right">
                              <p className="text-sm font-bold">{resolved.name}</p>
                              <p className="text-xs text-muted-foreground">{arDate(parseISO(e.event.date))}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        )}
      </div>
    </div>
  );
}
