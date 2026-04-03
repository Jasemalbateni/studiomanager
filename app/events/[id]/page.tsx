'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { parseISO, format } from 'date-fns';
import {
  ArrowRight, Clock, Users, AlertCircle, CheckCircle2,
  Edit2, Copy, ChevronDown, ChevronUp, CalendarDays, X, Trash2
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { resolveEventValues } from '@/lib/recurrence';
import { arDate, arDateLong } from '@/lib/ar';
import {
  CATEGORY_LABELS, BROADCAST_LABELS, CATEGORY_COLORS,
  BROADCAST_COLORS, ATTENDANCE_COLORS, ATTENDANCE_LABELS
} from '@/lib/constants';
import { TechAttendanceRow } from '@/components/attendance/tech-attendance-row';
import { EditEventSheet } from '@/components/events/edit-event-sheet';
import { cancelFutureInstances, deleteSingleEvent, deleteFutureEvents } from '@/lib/actions/schedules';
import {
  EventInstance, ProgramSchedule, EventCrew, Technician,
  MyAttendance, TechnicianAttendance, AttendanceStatus
} from '@/types';
import { cn } from '@/lib/utils';

interface EventDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function EventDetailPage({ params }: EventDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [event, setEvent] = useState<EventInstance | null>(null);
  const [schedule, setSchedule] = useState<ProgramSchedule | null>(null);
  const [crew, setCrew] = useState<(EventCrew & { technician: Technician })[]>([]);
  const [myAttendance, setMyAttendance] = useState<MyAttendance | null>(null);
  const [techAttendance, setTechAttendance] = useState<TechnicianAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [showCrewSection, setShowCrewSection] = useState(true);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [showCancelSheet, setShowCancelSheet] = useState(false);
  const [showDeleteSheet, setShowDeleteSheet] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => { loadData(); }, [id]);

  async function loadData() {
    setLoading(true);

    const { data: eventData } = await supabase.from('event_instances').select('*').eq('id', id).single();
    if (!eventData) { router.push('/events'); return; }
    setEvent(eventData);

    const { data: scheduleData } = await supabase.from('program_schedules').select('*').eq('id', eventData.schedule_id).single();
    setSchedule(scheduleData);

    const { data: crewData } = await supabase.from('event_crew').select('*, technician:technicians(*)').eq('event_id', id);
    setCrew((crewData as any) ?? []);

    const { data: myAtt } = await supabase.from('my_attendance').select('*').eq('event_id', id).maybeSingle();
    setMyAttendance(myAtt);

    const { data: techAtt } = await supabase.from('technician_attendance').select('*').eq('event_id', id);
    setTechAttendance(techAtt ?? []);

    setLoading(false);
  }

  async function handleMyAttendance(status: AttendanceStatus) {
    setAttendanceLoading(true);
    if (myAttendance) {
      if (myAttendance.status === status) {
        await supabase.from('my_attendance').delete().eq('id', myAttendance.id);
        setMyAttendance(null);
      } else {
        const { data } = await supabase.from('my_attendance').update({ status }).eq('id', myAttendance.id).select().single();
        setMyAttendance(data);
      }
    } else {
      const { data } = await supabase.from('my_attendance').insert({ event_id: id, status }).select().single();
      setMyAttendance(data);
    }
    setAttendanceLoading(false);
  }

  async function handleTechAttendance(techId: string, status: AttendanceStatus) {
    const existing = techAttendance.find(a => a.technician_id === techId);
    if (existing) {
      const { data } = await supabase.from('technician_attendance').update({ status }).eq('id', existing.id).select().single();
      setTechAttendance(prev => prev.map(a => a.technician_id === techId ? data! : a));
    } else {
      const { data } = await supabase.from('technician_attendance').insert({ event_id: id, technician_id: techId, status }).select().single();
      if (data) setTechAttendance(prev => [...prev, data]);
    }
  }

  async function handleCancelThisOnly() {
    if (!event) return;
    setCancelLoading(true);
    setShowCancelSheet(false);
    await supabase.from('event_instances').update({ is_cancelled: true }).eq('id', id);
    setEvent(prev => prev ? { ...prev, is_cancelled: true } : null);
    setCancelLoading(false);
  }

  async function handleCancelFuture() {
    if (!event) return;
    setCancelLoading(true);
    setShowCancelSheet(false);
    await cancelFutureInstances(event.schedule_id, event.date);
    setEvent(prev => prev ? { ...prev, is_cancelled: true } : null);
    setCancelLoading(false);
  }

  async function handleRestore() {
    if (!event) return;
    await supabase.from('event_instances').update({ is_cancelled: false }).eq('id', id);
    setEvent(prev => prev ? { ...prev, is_cancelled: false } : null);
  }

  async function handleDeleteSingle() {
    setShowDeleteSheet(false);
    await deleteSingleEvent(id);
    router.push('/events');
  }

  async function handleDeleteFuture() {
    if (!event) return;
    setShowDeleteSheet(false);
    await deleteFutureEvents(event.schedule_id, event.date);
    router.push('/events');
  }

  async function handleDuplicate() {
    if (!event || !schedule) return;
    const tomorrow = format(new Date(new Date().setDate(new Date().getDate() + 1)), 'yyyy-MM-dd');
    const resolvedValues = resolveEventValues(event, schedule);
    const { data: newEvent } = await supabase
      .from('event_instances')
      .insert({
        schedule_id: event.schedule_id,
        date: tomorrow,
        name_override: resolvedValues.name + ' (نسخة)',
        start_time_override: resolvedValues.start_time,
        end_time_override: resolvedValues.end_time,
        is_overridden: true,
      })
      .select()
      .single();

    if (newEvent) {
      if (crew.length > 0) {
        await supabase.from('event_crew').insert(crew.map(c => ({ event_id: newEvent.id, technician_id: c.technician_id })));
      }
      router.push(`/events/${newEvent.id}`);
    }
  }

  if (loading || !event || !schedule) {
    return (
      <div className="px-4 py-6 space-y-4">
        <div className="h-8 bg-muted rounded-xl animate-pulse w-40" />
        <div className="h-40 bg-muted rounded-2xl animate-pulse" />
        <div className="h-24 bg-muted rounded-2xl animate-pulse" />
        <div className="h-48 bg-muted rounded-2xl animate-pulse" />
      </div>
    );
  }

  const resolvedValues = resolveEventValues(event, schedule);
  const dateObj = parseISO(event.date);
  const isToday = event.date === format(new Date(), 'yyyy-MM-dd');

  const ATTENDANCE_OPTIONS: AttendanceStatus[] = ['present', 'absent', 'late', 'left_early'];

  return (
    <div className="pb-6">
      {/* Back nav */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-4">
        <button
          onClick={handleDuplicate}
          className="w-9 h-9 rounded-full border flex items-center justify-center bg-white flex-shrink-0"
          title="نسخ الحدث"
        >
          <Copy size={16} />
        </button>
        <button
          onClick={() => setShowEditSheet(true)}
          className="w-9 h-9 rounded-full bg-[#008D8B] flex items-center justify-center flex-shrink-0 shadow-sm"
          title="تعديل الحدث"
        >
          <Edit2 size={16} className="text-white" />
        </button>
        <div className="flex-1 text-right min-w-0">
          <p className="text-xs text-muted-foreground">تفاصيل الحدث</p>
          <p className="text-sm font-bold truncate">{resolvedValues.name}</p>
        </div>
        <Link href="/events" className="w-9 h-9 rounded-full border flex items-center justify-center bg-white flex-shrink-0">
          <ArrowRight size={18} />
        </Link>
      </div>

      {/* Event info card */}
      <div className="mx-4">
        <div className={cn(
          'bg-white rounded-2xl border p-4 shadow-sm',
          event.is_cancelled && 'opacity-70',
          isToday && 'border-[#008D8B]'
        )}>
          <div className="flex flex-wrap gap-2 mb-3 justify-end">
            {event.is_cancelled && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-600">ملغى</span>
            )}
            {event.is_overridden && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
                <AlertCircle size={11} />
                معدَّل
              </span>
            )}
            <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full', BROADCAST_COLORS[resolvedValues.broadcast_mode])}>
              {BROADCAST_LABELS[resolvedValues.broadcast_mode]}
            </span>
            <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full', CATEGORY_COLORS[resolvedValues.category])}>
              {CATEGORY_LABELS[resolvedValues.category]}
            </span>
          </div>

          <h2 className="text-xl font-extrabold text-foreground mb-3 text-right">{resolvedValues.name}</h2>

          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center justify-end gap-2">
              <span className={cn('font-bold', isToday && 'text-[#008D8B]')}>
                {isToday ? 'اليوم' : arDateLong(dateObj)}
              </span>
              <CalendarDays size={15} className="text-[#008D8B]" />
            </div>
            <div className="flex items-center justify-end gap-2">
              <span dir="ltr">{resolvedValues.start_time} – {resolvedValues.end_time}</span>
              <Clock size={15} className="text-[#008D8B]" />
            </div>
            <div className="flex items-center justify-end gap-2">
              <span>{crew.length} فني مُعيَّن</span>
              <Users size={15} className="text-[#008D8B]" />
            </div>
          </div>
        </div>
      </div>

      {/* MY ATTENDANCE */}
      <div className="mx-4 mt-4">
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-2 text-right">حضوري</h3>
        <div className="bg-white rounded-2xl border p-4 shadow-sm">
          {myAttendance ? (
            <div className="flex items-center justify-between">
              <button
                onClick={() => handleMyAttendance(myAttendance.status)}
                disabled={attendanceLoading}
                className="text-xs text-muted-foreground underline"
              >
                إزالة
              </button>
              <div className="flex items-center gap-3">
                <div>
                  <p className="font-bold text-sm text-right">{ATTENDANCE_LABELS[myAttendance.status]}</p>
                  <p className="text-xs text-muted-foreground text-right">مُسجَّل</p>
                </div>
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', ATTENDANCE_COLORS[myAttendance.status])}>
                  <CheckCircle2 size={20} />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm text-muted-foreground mb-3 text-right">سجّل حضورك لهذا الحدث:</p>
              <div className="grid grid-cols-2 gap-2">
                {ATTENDANCE_OPTIONS.map(status => (
                  <button
                    key={status}
                    onClick={() => handleMyAttendance(status)}
                    disabled={attendanceLoading}
                    className={cn(
                      'py-2.5 px-3 rounded-xl border text-sm font-bold transition-colors touch-target',
                      ATTENDANCE_COLORS[status]
                    )}
                  >
                    {ATTENDANCE_LABELS[status]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CREW ATTENDANCE */}
      {crew.length > 0 && (
        <div className="mx-4 mt-4">
          <button
            onClick={() => setShowCrewSection(v => !v)}
            className="w-full flex items-center justify-between mb-2"
          >
            {showCrewSection
              ? <ChevronUp size={16} className="text-muted-foreground" />
              : <ChevronDown size={16} className="text-muted-foreground" />
            }
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">
              حضور الفنيين ({crew.length})
            </h3>
          </button>

          {showCrewSection && (
            <div className="bg-white rounded-2xl border p-4 shadow-sm">
              {crew.map(c => (
                <TechAttendanceRow
                  key={c.technician_id}
                  technician={c.technician}
                  status={techAttendance.find(a => a.technician_id === c.technician_id)?.status ?? null}
                  onChange={status => handleTechAttendance(c.technician_id, status)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cancel / Restore */}
      <div className="mx-4 mt-4">
        <button
          onClick={event.is_cancelled ? handleRestore : () => setShowCancelSheet(true)}
          disabled={cancelLoading}
          className={cn(
            'w-full py-3 rounded-2xl border text-sm font-bold transition-colors touch-target',
            event.is_cancelled
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-red-50 border-red-200 text-red-700'
          )}
        >
          {event.is_cancelled ? 'استعادة الحدث' : 'إلغاء الحدث'}
        </button>
      </div>

      {/* Delete button */}
      <div className="mx-4 mt-2">
        <button
          onClick={() => setShowDeleteSheet(true)}
          className="w-full py-2.5 rounded-2xl text-sm font-semibold text-red-500 flex items-center justify-center gap-1.5 active:bg-red-50 transition-colors"
        >
          <Trash2 size={15} />
          حذف الحدث نهائياً
        </button>
      </div>

      {/* Cancel scope sheet */}
      {showCancelSheet && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCancelSheet(false)} />
          <div className="relative bg-white rounded-t-3xl px-4 pt-5 pb-10 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <button
                onClick={() => setShowCancelSheet(false)}
                className="w-8 h-8 rounded-full border flex items-center justify-center"
              >
                <X size={16} />
              </button>
              <h2 className="text-base font-bold">إلغاء الحدث</h2>
            </div>
            <button
              onClick={handleCancelThisOnly}
              className="w-full text-right rounded-2xl border border-border bg-white p-4 active:bg-muted transition-colors"
            >
              <p className="font-bold text-sm">إلغاء هذا اليوم فقط</p>
              <p className="text-xs text-muted-foreground mt-0.5">لا يؤثر على الأيام الأخرى في الجدول</p>
            </button>
            <button
              onClick={handleCancelFuture}
              className="w-full text-right rounded-2xl border border-red-200 bg-red-50 p-4 active:bg-red-100 transition-colors"
            >
              <p className="font-bold text-sm text-red-700">إلغاء جميع الأيام القادمة</p>
              <p className="text-xs text-muted-foreground mt-0.5">إلغاء هذا الحدث وجميع تكراراته المستقبلية</p>
            </button>
          </div>
        </div>
      )}

      {/* Delete scope sheet */}
      {showDeleteSheet && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowDeleteSheet(false)} />
          <div className="relative bg-white rounded-t-3xl px-4 pt-5 pb-10 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <button
                onClick={() => setShowDeleteSheet(false)}
                className="w-8 h-8 rounded-full border flex items-center justify-center"
              >
                <X size={16} />
              </button>
              <div className="text-right">
                <h2 className="text-base font-bold text-red-700">حذف الحدث</h2>
                <p className="text-xs text-muted-foreground">هل أنت متأكد؟ لا يمكن التراجع</p>
              </div>
            </div>
            <button
              onClick={handleDeleteSingle}
              className="w-full text-right rounded-2xl border border-red-200 bg-red-50 p-4 active:bg-red-100 transition-colors"
            >
              <p className="font-bold text-sm text-red-700">حذف هذا الحدث فقط</p>
              <p className="text-xs text-muted-foreground mt-0.5">يُحذف هذا اليوم فقط ويبقى الجدول سارياً</p>
            </button>
            <button
              onClick={handleDeleteFuture}
              className="w-full text-right rounded-2xl border border-red-300 bg-red-100 p-4 active:bg-red-200 transition-colors"
            >
              <p className="font-bold text-sm text-red-700">حذف هذا الحدث وجميع الأحداث القادمة</p>
              <p className="text-xs text-muted-foreground mt-0.5">تُحذف جميع التكرارات المستقبلية بشكل نهائي</p>
            </button>
          </div>
        </div>
      )}

      {showEditSheet && (
        <EditEventSheet
          event={event}
          schedule={schedule}
          crew={crew.map(c => c.technician)}
          onClose={() => setShowEditSheet(false)}
          onSaved={() => { setShowEditSheet(false); loadData(); }}
        />
      )}
    </div>
  );
}
