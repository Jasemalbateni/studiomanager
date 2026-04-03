'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format, startOfMonth, endOfMonth, addDays } from 'date-fns';
import { Plus, TrendingUp, ChevronLeft, CalendarDays } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { EventCard } from '@/components/events/event-card';
import { resolveEventValues } from '@/lib/recurrence';
import { arDate, arMonthYear } from '@/lib/ar';
import { EventDisplay, PricingSetting } from '@/types';
import { CURRENCY } from '@/lib/constants';

export default function HomePage() {
  const [events, setEvents] = useState<EventDisplay[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<EventDisplay[]>([]);
  const [pricing, setPricing] = useState<PricingSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const today = new Date();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const monthStart = format(startOfMonth(today), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(today), 'yyyy-MM-dd');
    const upcomingEnd = format(addDays(today, 7), 'yyyy-MM-dd');
    const todayStr = format(today, 'yyyy-MM-dd');

    const { data: monthData } = await supabase
      .from('event_instances')
      .select('*, schedule:program_schedules(*), crew:event_crew(count), my_attendance(status)')
      .gte('date', monthStart)
      .lte('date', monthEnd)
      .eq('is_cancelled', false)
      .order('date', { ascending: true });

    const { data: upcomingData } = await supabase
      .from('event_instances')
      .select('*, schedule:program_schedules(*), crew:event_crew(count), my_attendance(status)')
      .gte('date', todayStr)
      .lte('date', upcomingEnd)
      .eq('is_cancelled', false)
      .order('date', { ascending: true })
      .limit(5);

    const { data: pricingData } = await supabase.from('pricing_settings').select('*');

    if (monthData)   setEvents(buildDisplay(monthData));
    if (upcomingData) setUpcomingEvents(buildDisplay(upcomingData));
    if (pricingData)  setPricing(pricingData);
    setLoading(false);
  }

  function buildDisplay(raw: any[]): EventDisplay[] {
    return raw.map(item => {
      const schedule = item.schedule;
      const resolved = schedule ? resolveEventValues(item, schedule) : {
        name: item.name_override ?? '',
        category: item.category_override ?? 'bulletin',
        broadcast_mode: item.broadcast_mode_override ?? 'live',
        start_time: item.start_time_override ?? '',
        end_time: item.end_time_override ?? '',
        bonus_amount: item.bonus_amount_override ?? null,
      };
      return {
        id: item.id, schedule_id: item.schedule_id, date: item.date,
        name: resolved.name, category: resolved.category, broadcast_mode: resolved.broadcast_mode,
        start_time: resolved.start_time, end_time: resolved.end_time,
        is_overridden: item.is_overridden, is_cancelled: item.is_cancelled,
        crew_count: item.crew?.[0]?.count ?? 0,
        my_attendance_status: item.my_attendance?.[0]?.status ?? null,
        bonus_amount: resolved.bonus_amount,
      };
    });
  }

  function getPricingRate(category: string, broadcast_mode: string) {
    const specific = pricing.find(p => p.category === category && p.broadcast_mode === broadcast_mode);
    if (specific) return specific.rate;
    return pricing.find(p => p.category === category && p.broadcast_mode === null)?.rate ?? 0;
  }

  const myAttended = events.filter(e => e.my_attendance_status === 'present' || e.my_attendance_status === 'late');
  const expectedAmount = myAttended.reduce((sum, e) => {
    const rate = e.bonus_amount ?? getPricingRate(e.category, e.broadcast_mode);
    return sum + rate;
  }, 0);

  if (loading) {
    return (
      <div className="px-4 py-6 space-y-4">
        <div className="h-40 bg-muted rounded-2xl animate-pulse" />
        <div className="h-24 bg-muted rounded-2xl animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted rounded-2xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-4">
      {/* Hero header */}
      <div className="px-4 pt-6 pb-5 bg-gradient-to-bl from-[#008D8B] to-[#569691] text-white rounded-b-3xl">
        <p className="text-sm opacity-80 font-semibold">مدير الاستوديو</p>
        <h1 className="text-2xl font-extrabold mt-0.5">{arDate(today)}</h1>
        <p className="text-sm opacity-75 mt-0.5">{today.getFullYear()}</p>

        {/* Bonus card */}
        <div className="mt-4 bg-white/15 rounded-2xl p-4 backdrop-blur-sm">
          <p className="text-xs font-semibold opacity-80 uppercase tracking-wide">المكافأة المتوقعة هذا الشهر</p>
          <p className="text-3xl font-extrabold mt-1">
            {expectedAmount.toFixed(0)} <span className="text-lg font-normal opacity-80">{CURRENCY}</span>
          </p>
          <p className="text-xs opacity-70 mt-1">بناءً على {myAttended.length} حدث حضرته</p>
        </div>
      </div>

      {/* Monthly overview */}
      <div className="px-4 mt-5">
        <div className="flex items-center justify-between mb-3">
          <Link href="/statistics" className="text-xs text-[#008D8B] font-semibold flex items-center gap-0.5">
            <ChevronLeft size={14} />
            التفاصيل
          </Link>
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">
            ملخص {arMonthYear(today)}
          </h2>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'الإجمالي',  value: events.length },
            { label: 'نشرات',    value: events.filter(e => e.category === 'bulletin').length },
            { label: 'تقارير',   value: events.filter(e => e.category === 'short_briefing').length },
            { label: 'برامج',    value: events.filter(e => e.category === 'program').length },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl border p-3 text-center shadow-sm">
              <p className="text-xl font-extrabold text-foreground">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="px-4 mt-5">
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3 text-right">إجراءات سريعة</h2>
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/events/new"
            className="flex items-center gap-3 bg-white border rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-transform"
          >
            <div>
              <p className="text-sm font-bold">جدول جديد</p>
              <p className="text-xs text-muted-foreground">إضافة برنامج</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#008D8B]/10 flex items-center justify-center me-auto">
              <Plus size={20} className="text-[#008D8B]" />
            </div>
          </Link>
          <Link
            href="/attendance"
            className="flex items-center gap-3 bg-white border rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-transform"
          >
            <div>
              <p className="text-sm font-bold">حضوري</p>
              <p className="text-xs text-muted-foreground">تسجيل اليوم</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#E1AF85]/20 flex items-center justify-center me-auto">
              <TrendingUp size={20} className="text-[#E1AF85]" />
            </div>
          </Link>
        </div>
      </div>

      {/* Upcoming events */}
      <div className="px-4 mt-5">
        <div className="flex items-center justify-between mb-3">
          <Link href="/events" className="text-xs text-[#008D8B] font-semibold flex items-center gap-0.5">
            <ChevronLeft size={14} />
            الكل
          </Link>
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">الأحداث القادمة</h2>
        </div>

        {upcomingEvents.length === 0 ? (
          <div className="bg-white border rounded-2xl p-6 text-center">
            <CalendarDays size={32} className="text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">لا توجد أحداث في الأيام السبعة القادمة</p>
            <Link href="/events/new" className="text-sm text-[#008D8B] font-semibold mt-1 inline-block">
              إنشاء جدول ←
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingEvents.map(event => (
              <EventCard key={event.id} event={event} showAttendance />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
