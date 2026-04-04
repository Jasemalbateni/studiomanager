'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { arMonthYear } from '@/lib/ar';
import { ATTENDANCE_LABELS, CATEGORY_LABELS } from '@/lib/constants';
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

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  present:    { bg: '#d1fae5', color: '#065f46' },
  late:       { bg: '#fef3c7', color: '#92400e' },
  absent:     { bg: '#fee2e2', color: '#991b1b' },
  left_early: { bg: '#ffedd5', color: '#9a3412' },
  on_leave:   { bg: '#e0f2fe', color: '#0369a1' },
  excused:    { bg: '#ede9fe', color: '#6d28d9' },
};

export function TeamPrintContent() {
  const searchParams = useSearchParams();
  const month = searchParams.get('month') ?? format(new Date(), 'yyyy-MM');
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [crewEvents, setCrewEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const monthDate = parseISO(month + '-01');

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const start = format(startOfMonth(monthDate), 'yyyy-MM-dd');
      const end   = format(endOfMonth(monthDate),   'yyyy-MM-dd');

      const [{ data: techData }, { data: crewData }] = await Promise.all([
        supabase.from('technicians').select('*').order('name'),
        supabase
          .from('technician_attendance')
          .select('technician_id, status, event:event_instances(*, schedule:program_schedules(*))')
          .gte('event.date', start)
          .lte('event.date', end),
      ]);

      setTechnicians(techData ?? []);
      setCrewEvents((crewData as any[])?.filter(d => d.event && !d.event.is_cancelled) ?? []);
      setLoading(false);
    }
    load();
  }, [month]);

  useEffect(() => {
    if (!loading) {
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [loading]);

  const today = format(new Date(), 'yyyy-MM-dd');

  const techsWithData = technicians.filter(t => crewEvents.some(e => e.technician_id === t.id));

  const countFor = (techId: string, status: string) =>
    crewEvents.filter(e => e.technician_id === techId && e.status === status).length;

  const totalFor = (techId: string) =>
    crewEvents.filter(e => e.technician_id === techId).length;

  const grandTotal     = crewEvents.length;
  const grandPresent   = crewEvents.filter(e => e.status === 'present').length;
  const grandAbsent    = crewEvents.filter(e => e.status === 'absent').length;
  const grandLate      = crewEvents.filter(e => e.status === 'late').length;
  const grandLeftEarly = crewEvents.filter(e => e.status === 'left_early').length;
  const grandOnLeave   = crewEvents.filter(e => e.status === 'on_leave').length;
  const grandExcused   = crewEvents.filter(e => e.status === 'excused').length;

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
            <div style={{ marginTop: 4, color: '#008D8B', fontWeight: 700 }}>تقرير الفريق</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#008D8B' }}>مدير الاستوديو</div>
            <div style={{ fontSize: 13, color: '#555', marginTop: 2 }}>
              إحصائيات الفريق — {arMonthYear(monthDate)}
            </div>
          </div>
        </div>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '3mm', marginBottom: '6mm' }}>
          {[
            { label: 'إجمالي الفنيين',             value: techsWithData.length, bg: 'linear-gradient(135deg,#008D8B,#569691)', color: '#fff', big: true },
            { label: 'إجمالي عدد الأحداث',         value: grandTotal,     bg: '#f3f4f6', color: '#374151' },
            { label: 'إجمالي الحضور',               value: grandPresent,   bg: '#d1fae5', color: '#065f46' },
            { label: 'إجمالي الغياب',               value: grandAbsent,    bg: '#fee2e2', color: '#991b1b' },
            { label: 'إجمالي التأخير',              value: grandLate,      bg: '#fef3c7', color: '#92400e' },
            { label: 'إجمالي المغادرة أثناء العمل', value: grandLeftEarly, bg: '#ffedd5', color: '#9a3412' },
            { label: 'إجمالي الإجازات',             value: grandOnLeave,   bg: '#e0f2fe', color: '#0369a1' },
            { label: 'إجمالي الاعتذارات',           value: grandExcused,   bg: '#ede9fe', color: '#6d28d9' },
          ].map((c, i) => (
            <div key={i} style={{ background: c.bg, borderRadius: 10, padding: '4mm', gridColumn: i === 0 ? 'span 3' : undefined }}>
              <div style={{ fontSize: c.big ? 26 : 22, fontWeight: 800, color: c.color, textAlign: 'right' }}>{c.value}</div>
              <div style={{ fontSize: 10, color: c.color, textAlign: 'right', marginTop: 1, opacity: 0.85 }}>{c.label}</div>
            </div>
          ))}
        </div>

        {/* Team table */}
        <div style={{ marginBottom: '5mm' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: '2mm', textAlign: 'right' }}>
            تفصيل أداء الفريق ({techsWithData.length} فني)
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: '#008D8B', color: '#fff' }}>
                {['الاسم', 'الدور', 'عدد الأحداث', 'الحضور', 'الغياب', 'التأخير', 'غادر', 'إجازة', 'معتذر'].map(h => (
                  <th key={h} style={{ padding: '3mm 3.5mm', textAlign: 'right', fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {techsWithData.map((tech, idx) => {
                const total    = totalFor(tech.id);
                const pres     = countFor(tech.id, 'present');
                const abs      = countFor(tech.id, 'absent');
                const late     = countFor(tech.id, 'late');
                const left     = countFor(tech.id, 'left_early');
                const onLeave  = countFor(tech.id, 'on_leave');
                const excused  = countFor(tech.id, 'excused');
                return (
                  <tr key={tech.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '2.5mm 3.5mm', fontWeight: 700 }}>{tech.name}</td>
                    <td style={{ padding: '2.5mm 3.5mm', color: '#008D8B', fontWeight: 600 }}>{tech.role}</td>
                    <td style={{ padding: '2.5mm 3.5mm', textAlign: 'center', fontWeight: 700 }}>{total}</td>
                    <td style={{ padding: '2.5mm 3.5mm', textAlign: 'center' }}>
                      <span style={{ background: '#d1fae5', color: '#065f46', padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700 }}>{pres}</span>
                    </td>
                    <td style={{ padding: '2.5mm 3.5mm', textAlign: 'center' }}>
                      <span style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700 }}>{abs}</span>
                    </td>
                    <td style={{ padding: '2.5mm 3.5mm', textAlign: 'center' }}>
                      <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700 }}>{late}</span>
                    </td>
                    <td style={{ padding: '2.5mm 3.5mm', textAlign: 'center' }}>
                      <span style={{ background: '#ffedd5', color: '#9a3412', padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700 }}>{left}</span>
                    </td>
                    <td style={{ padding: '2.5mm 3.5mm', textAlign: 'center' }}>
                      <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700 }}>{onLeave}</span>
                    </td>
                    <td style={{ padding: '2.5mm 3.5mm', textAlign: 'center' }}>
                      <span style={{ background: '#ede9fe', color: '#6d28d9', padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700 }}>{excused}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f3f4f6', borderTop: '2px solid #008D8B' }}>
                <td colSpan={2} style={{ padding: '3mm 3.5mm', fontWeight: 800, fontSize: 12, textAlign: 'right' }}>الإجمالي</td>
                <td style={{ padding: '3mm 3.5mm', textAlign: 'center', fontWeight: 800 }}>{grandTotal}</td>
                <td style={{ padding: '3mm 3.5mm', textAlign: 'center', fontWeight: 800, color: '#065f46' }}>{grandPresent}</td>
                <td style={{ padding: '3mm 3.5mm', textAlign: 'center', fontWeight: 800, color: '#991b1b' }}>{grandAbsent}</td>
                <td style={{ padding: '3mm 3.5mm', textAlign: 'center', fontWeight: 800, color: '#92400e' }}>{grandLate}</td>
                <td style={{ padding: '3mm 3.5mm', textAlign: 'center', fontWeight: 800, color: '#9a3412' }}>{grandLeftEarly}</td>
                <td style={{ padding: '3mm 3.5mm', textAlign: 'center', fontWeight: 800, color: '#0369a1' }}>{grandOnLeave}</td>
                <td style={{ padding: '3mm 3.5mm', textAlign: 'center', fontWeight: 800, color: '#6d28d9' }}>{grandExcused}</td>
              </tr>
            </tfoot>
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
