'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { resolveEventValues } from '@/lib/recurrence';
import { arDate, arMonthYear } from '@/lib/ar';
import { CATEGORY_LABELS, BROADCAST_LABELS, ATTENDANCE_LABELS, CURRENCY } from '@/lib/constants';
import { PricingSetting, Category } from '@/types';

const PRINT_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Cairo', 'Segoe UI', sans-serif; direction: rtl; background: #f0f2f5; color: #1a1a1a; }

  .page-wrap {
    max-width: 210mm;
    margin: 0 auto;
    background: #fff;
    min-height: 297mm;
  }

  @media screen {
    .page-wrap { box-shadow: 0 4px 40px rgba(0,0,0,.12); margin: 24px auto; }
  }

  @media print {
    @page { size: A4 portrait; margin: 12mm 14mm; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { background: #fff !important; }
    nav, .no-print { display: none !important; }
    main { padding-bottom: 0 !important; }
    .flex.flex-col { display: block !important; }
    .page-wrap { margin: 0; box-shadow: none; }
    tr { page-break-inside: avoid; }
  }
`;

export function PrintContent() {
  const searchParams = useSearchParams();
  const month = searchParams.get('month') ?? format(new Date(), 'yyyy-MM');
  const [myEvents, setMyEvents] = useState<any[]>([]);
  const [pricing, setPricing] = useState<PricingSetting[]>([]);
  const [loading, setLoading] = useState(true);

  const monthDate = parseISO(month + '-01');

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const start = format(startOfMonth(monthDate), 'yyyy-MM-dd');
      const end = format(endOfMonth(monthDate), 'yyyy-MM-dd');

      const [{ data: attData }, { data: pricingData }] = await Promise.all([
        supabase
          .from('my_attendance')
          .select('status, event:event_instances(*, schedule:program_schedules(*))')
          .gte('event.date', start)
          .lte('event.date', end),
        supabase.from('pricing_settings').select('*'),
      ]);

      const clean = (attData as any[])?.filter(d => d.event && !d.event.is_cancelled) ?? [];
      clean.sort((a, b) => a.event.date.localeCompare(b.event.date));

      setMyEvents(clean);
      setPricing(pricingData ?? []);
      setLoading(false);
    }
    load();
  }, [month]);

  // Auto-trigger print once data is ready
  useEffect(() => {
    if (!loading) {
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [loading]);

  function getRate(category: string, bm: string): number {
    return pricing.find(p => p.category === category && p.broadcast_mode === bm)?.rate
        ?? pricing.find(p => p.category === category && p.broadcast_mode === null)?.rate
        ?? 0;
  }

  function getBonusForRow(e: any): number {
    const r = resolveEventValues(e.event, e.event.schedule);
    return r.bonus_amount ?? getRate(r.category, r.broadcast_mode);
  }

  const attended = myEvents.filter(e => e.status === 'present' || e.status === 'late');
  const totalBonus = attended.reduce((sum, e) => sum + getBonusForRow(e), 0);

  const countStatus = (s: string) => myEvents.filter(e => e.status === s).length;
  const countCat = (cat: Category) =>
    attended.filter(e => resolveEventValues(e.event, e.event.schedule).category === cat).length;

  const nameCountMap: Record<string, number> = {};
  attended.forEach(e => {
    const name = resolveEventValues(e.event, e.event.schedule).name;
    nameCountMap[name] = (nameCountMap[name] ?? 0) + 1;
  });
  const nameSummary = (Object.entries(nameCountMap) as [string, number][])
    .sort((a, b) => b[1] - a[1]);

  const today = format(new Date(), 'yyyy-MM-dd');

  const ATTENDANCE_BADGE: Record<string, { bg: string; color: string }> = {
    present:    { bg: '#d1fae5', color: '#065f46' },
    late:       { bg: '#fef3c7', color: '#92400e' },
    absent:     { bg: '#fee2e2', color: '#991b1b' },
    left_early: { bg: '#ffedd5', color: '#9a3412' },
    on_leave:   { bg: '#e0f2fe', color: '#0369a1' },
    excused:    { bg: '#ede9fe', color: '#6d28d9' },
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground text-sm">جارٍ تحميل التقرير…</p>
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PRINT_STYLES }} />

      <div className="page-wrap" style={{ padding: '10mm 12mm' }}>

        {/* ── Screen action bar ── */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6mm', padding: '8px 0' }}>
          <button
            onClick={() => window.close()}
            style={{ fontSize: 13, color: '#666', background: 'none', border: '1px solid #ddd', borderRadius: 8, padding: '6px 14px', cursor: 'pointer' }}
          >
            ← إغلاق
          </button>
          <button
            onClick={() => window.print()}
            style={{ fontSize: 14, fontWeight: 700, color: '#fff', background: '#008D8B', border: 'none', borderRadius: 10, padding: '9px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            🖨 طباعة / حفظ PDF
          </button>
        </div>

        {/* ── Report header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #008D8B', paddingBottom: '5mm', marginBottom: '6mm' }}>
          <div style={{ textAlign: 'left', fontSize: 11, color: '#666' }}>
            <div>{today}</div>
            <div style={{ marginTop: 4, color: '#008D8B', fontWeight: 700 }}>إحصائياتي الشخصية</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#008D8B' }}>مدير الاستوديو</div>
            <div style={{ fontSize: 13, color: '#555', marginTop: 2 }}>
              تقرير شهر {arMonthYear(monthDate)}
            </div>
          </div>
        </div>

        {/* ── Summary cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '3mm', marginBottom: '6mm' }}>
          {/* Bonus */}
          <div style={{ background: 'linear-gradient(135deg, #008D8B, #569691)', borderRadius: 10, padding: '4mm', color: '#fff', gridColumn: 'span 3' }}>
            <div style={{ fontSize: 11, opacity: 0.85, textAlign: 'right' }}>إجمالي المكافأة المتوقعة</div>
            <div style={{ fontSize: 28, fontWeight: 800, textAlign: 'right', marginTop: 2 }}>
              {totalBonus.toFixed(2)} <span style={{ fontSize: 15, fontWeight: 400, opacity: 0.85 }}>{CURRENCY}</span>
            </div>
            <div style={{ fontSize: 11, opacity: 0.75, textAlign: 'right', marginTop: 2 }}>
              بناءً على {attended.length} حدث حضرته
            </div>
          </div>

          {/* Attendance cards */}
          {[
            { label: 'حاضر',             value: countStatus('present'),    bg: '#d1fae5', color: '#065f46' },
            { label: 'متأخر',            value: countStatus('late'),       bg: '#fef3c7', color: '#92400e' },
            { label: 'غائب',             value: countStatus('absent'),     bg: '#fee2e2', color: '#991b1b' },
            { label: 'غادر أثناء العمل', value: countStatus('left_early'), bg: '#ffedd5', color: '#9a3412' },
            { label: 'إجازة',            value: countStatus('on_leave'),   bg: '#e0f2fe', color: '#0369a1' },
            { label: 'معتذر',            value: countStatus('excused'),    bg: '#ede9fe', color: '#6d28d9' },
          ].map(c => (
            <div key={c.label} style={{ background: c.bg, borderRadius: 10, padding: '3.5mm 4mm' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: c.color, textAlign: 'right' }}>{c.value}</div>
              <div style={{ fontSize: 10, color: c.color, textAlign: 'right', marginTop: 1, opacity: 0.8 }}>{c.label}</div>
            </div>
          ))}
        </div>

        {/* ── Category breakdown ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '3mm', marginBottom: '7mm' }}>
          {([
            { cat: 'bulletin' as Category,       bg: '#eff6ff', color: '#1d4ed8' },
            { cat: 'short_briefing' as Category, bg: '#faf5ff', color: '#7e22ce' },
            { cat: 'program' as Category,        bg: '#f0fdf4', color: '#15803d' },
          ]).map(({ cat, bg, color }) => (
            <div key={cat} style={{ background: bg, borderRadius: 10, padding: '3.5mm 4mm' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color, textAlign: 'right' }}>{countCat(cat)}</div>
              <div style={{ fontSize: 10, color, textAlign: 'right', marginTop: 1, opacity: 0.8 }}>{CATEGORY_LABELS[cat]}</div>
            </div>
          ))}
        </div>

        {/* ── Event-name summary ── */}
        {nameSummary.length > 0 && (
          <div style={{ marginBottom: '6mm' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: '2mm', textAlign: 'right' }}>
              ملخص حسب اسم الحدث
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: '#008D8B', color: '#fff' }}>
                  <th style={{ padding: '2.5mm 3.5mm', textAlign: 'right', fontWeight: 700 }}>اسم الحدث</th>
                  <th style={{ padding: '2.5mm 3.5mm', textAlign: 'center', fontWeight: 700, width: '20mm' }}>العدد</th>
                </tr>
              </thead>
              <tbody>
                {nameSummary.map(([name, count], idx) => (
                  <tr key={name} style={{ background: idx % 2 === 0 ? '#fff' : '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '2mm 3.5mm', fontWeight: 600 }}>{name}</td>
                    <td style={{ padding: '2mm 3.5mm', textAlign: 'center', fontWeight: 800, color: '#008D8B' }}>{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Events table ── */}
        <div style={{ marginBottom: '5mm' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: '2mm', textAlign: 'right' }}>
            تفصيل الأحداث ({myEvents.length} حدث)
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: '#008D8B', color: '#fff' }}>
                {['التاريخ', 'اسم البرنامج', 'النوع', 'البث', 'الحضور', 'المبلغ'].map(h => (
                  <th key={h} style={{ padding: '3mm 3.5mm', textAlign: 'right', fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {myEvents.map((e, idx) => {
                const r = resolveEventValues(e.event, e.event.schedule);
                const isAttended = e.status === 'present' || e.status === 'late';
                const bonus = isAttended ? getBonusForRow(e) : null;
                const badge = ATTENDANCE_BADGE[e.status] ?? { bg: '#f3f4f6', color: '#374151' };
                return (
                  <tr key={e.event.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '2.5mm 3.5mm', whiteSpace: 'nowrap', color: '#374151' }}>
                      {arDate(parseISO(e.event.date))}
                    </td>
                    <td style={{ padding: '2.5mm 3.5mm', fontWeight: 600 }}>{r.name}</td>
                    <td style={{ padding: '2.5mm 3.5mm', whiteSpace: 'nowrap' }}>{CATEGORY_LABELS[r.category]}</td>
                    <td style={{ padding: '2.5mm 3.5mm', whiteSpace: 'nowrap' }}>{BROADCAST_LABELS[r.broadcast_mode]}</td>
                    <td style={{ padding: '2.5mm 3.5mm', whiteSpace: 'nowrap' }}>
                      <span style={{ background: badge.bg, color: badge.color, padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700 }}>
                        {ATTENDANCE_LABELS[e.status as keyof typeof ATTENDANCE_LABELS] ?? e.status}
                      </span>
                    </td>
                    <td style={{ padding: '2.5mm 3.5mm', textAlign: 'left', fontWeight: 700, color: isAttended ? '#008D8B' : '#9ca3af', whiteSpace: 'nowrap' }}>
                      {bonus !== null ? `${bonus.toFixed(2)} ${CURRENCY}` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f3f4f6', borderTop: '2px solid #008D8B' }}>
                <td colSpan={5} style={{ padding: '3mm 3.5mm', fontWeight: 800, fontSize: 12, textAlign: 'right' }}>
                  إجمالي المكافأة المتوقعة
                </td>
                <td style={{ padding: '3mm 3.5mm', textAlign: 'left', fontWeight: 800, fontSize: 13, color: '#008D8B', whiteSpace: 'nowrap' }}>
                  {totalBonus.toFixed(2)} {CURRENCY}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* ── Footer ── */}
        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '3mm', display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#9ca3af' }}>
          <span>مدير الاستوديو</span>
          <span>تاريخ الإنشاء: {today}</span>
        </div>

      </div>
    </>
  );
}
