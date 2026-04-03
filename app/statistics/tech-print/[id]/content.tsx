'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { resolveEventValues } from '@/lib/recurrence';
import { arDate, arMonthYear } from '@/lib/ar';
import { CATEGORY_LABELS, BROADCAST_LABELS, ATTENDANCE_LABELS } from '@/lib/constants';
import { Technician, AttendanceStatus } from '@/types';

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
    .page-wrap { margin: 0; box-shadow: none; }
    tr { page-break-inside: avoid; }
  }
`;

const ATTENDANCE_BADGE: Record<string, { bg: string; color: string }> = {
  present:    { bg: '#d1fae5', color: '#065f46' },
  late:       { bg: '#fef3c7', color: '#92400e' },
  absent:     { bg: '#fee2e2', color: '#991b1b' },
  left_early: { bg: '#ffedd5', color: '#9a3412' },
};

export function TechPrintContent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const month = searchParams.get('month') ?? format(new Date(), 'yyyy-MM');

  const [tech, setTech] = useState<Technician | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const monthDate = parseISO(month + '-01');

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const start = format(startOfMonth(monthDate), 'yyyy-MM-dd');
      const end   = format(endOfMonth(monthDate),   'yyyy-MM-dd');

      const [{ data: techData }, { data: crewData }] = await Promise.all([
        supabase.from('technicians').select('*').eq('id', params.id).single(),
        supabase
          .from('technician_attendance')
          .select('status, event:event_instances(*, schedule:program_schedules(*))')
          .eq('technician_id', params.id)
          .gte('event.date', start)
          .lte('event.date', end),
      ]);

      setTech(techData);
      const clean = (crewData as any[])?.filter(d => d.event && !d.event.is_cancelled) ?? [];
      clean.sort((a: any, b: any) => a.event.date.localeCompare(b.event.date));
      setEvents(clean);
      setLoading(false);
    }
    load();
  }, [params.id, month]);

  useEffect(() => {
    if (!loading) {
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [loading]);

  const today = format(new Date(), 'yyyy-MM-dd');

  const countStatus = (s: string) => events.filter(e => e.status === s).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground text-sm">جارٍ تحميل التقرير…</p>
      </div>
    );
  }

  if (!tech) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground text-sm">لم يُعثر على الفني</p>
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PRINT_STYLES }} />

      <div className="page-wrap" style={{ padding: '10mm 12mm' }}>

        {/* Screen action bar */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6mm', padding: '8px 0' }}>
          <button
            onClick={() => window.close()}
            style={{ fontSize: 13, color: '#666', background: 'none', border: '1px solid #ddd', borderRadius: 8, padding: '6px 14px', cursor: 'pointer' }}
          >
            ← إغلاق
          </button>
          <button
            onClick={() => window.print()}
            style={{ fontSize: 14, fontWeight: 700, color: '#fff', background: '#008D8B', border: 'none', borderRadius: 10, padding: '9px 20px', cursor: 'pointer' }}
          >
            🖨 طباعة / حفظ PDF
          </button>
        </div>

        {/* Report header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #008D8B', paddingBottom: '5mm', marginBottom: '6mm' }}>
          <div style={{ textAlign: 'left', fontSize: 11, color: '#666' }}>
            <div>{today}</div>
            <div style={{ marginTop: 4, color: '#008D8B', fontWeight: 700 }}>تقرير فني</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#008D8B' }}>مدير الاستوديو</div>
            <div style={{ fontSize: 13, color: '#555', marginTop: 2 }}>
              {arMonthYear(monthDate)}
            </div>
          </div>
        </div>

        {/* Technician hero */}
        <div style={{ background: 'linear-gradient(135deg, #008D8B, #569691)', borderRadius: 12, padding: '5mm 6mm', color: '#fff', marginBottom: '5mm', display: 'flex', alignItems: 'center', gap: '4mm', justifyContent: 'flex-end' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{tech.name}</div>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>{tech.role}</div>
            <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>
              الفترة: {arMonthYear(monthDate)}
            </div>
          </div>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, flexShrink: 0 }}>
            {tech.name.charAt(0)}
          </div>
        </div>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '3mm', marginBottom: '6mm' }}>
          {[
            { label: 'عدد الأحداث',           value: events.length,              bg: '#f3f4f6', color: '#374151' },
            { label: 'الحضور',                value: countStatus('present'),     bg: '#d1fae5', color: '#065f46' },
            { label: 'الغياب',                value: countStatus('absent'),      bg: '#fee2e2', color: '#991b1b' },
            { label: 'التأخير',               value: countStatus('late'),        bg: '#fef3c7', color: '#92400e' },
            { label: 'غادر أثناء العمل',       value: countStatus('left_early'), bg: '#ffedd5', color: '#9a3412' },
            { label: 'غير مسجّل',             value: events.filter(e => !e.status).length, bg: '#f9fafb', color: '#6b7280' },
          ].map((c, i) => (
            <div key={i} style={{ background: c.bg, borderRadius: 10, padding: '3.5mm 4mm' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: c.color, textAlign: 'right' }}>{c.value}</div>
              <div style={{ fontSize: 10, color: c.color, textAlign: 'right', marginTop: 1, opacity: 0.85 }}>{c.label}</div>
            </div>
          ))}
        </div>

        {/* Events table */}
        <div style={{ marginBottom: '5mm' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: '2mm', textAlign: 'right' }}>
            تفصيل الأحداث ({events.length} حدث)
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: '#008D8B', color: '#fff' }}>
                {['التاريخ', 'اسم البرنامج', 'النوع', 'البث', 'حالة الفني'].map(h => (
                  <th key={h} style={{ padding: '3mm 3.5mm', textAlign: 'right', fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.map((e, idx) => {
                const r = resolveEventValues(e.event, e.event.schedule);
                const badge = e.status ? (ATTENDANCE_BADGE[e.status] ?? { bg: '#f3f4f6', color: '#374151' }) : { bg: '#f3f4f6', color: '#9ca3af' };
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
                        {e.status ? (ATTENDANCE_LABELS[e.status as AttendanceStatus] ?? e.status) : '—'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '3mm', display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#9ca3af' }}>
          <span>مدير الاستوديو</span>
          <span>تاريخ الإنشاء: {today}</span>
        </div>

      </div>
    </>
  );
}
