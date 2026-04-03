// NOTE: No 'use server' — these functions run in the browser and call Supabase directly.
// All callers are client components; routing through a server action adds unnecessary
// complexity and creates a "TypeError: fetch failed" when env vars are placeholders.

import { addMonths, parseISO, subDays, format } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { generateEventDates, toDateString } from '@/lib/recurrence';
import { ScheduleFormData } from '@/types';
import { GENERATE_MONTHS_AHEAD } from '@/lib/constants';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

  if (!url || !url.startsWith('http')) {
    throw new Error(
      'Supabase URL غير مضبوط. افتح ملف .env.local وأضف NEXT_PUBLIC_SUPABASE_URL الصحيح.'
    );
  }
  if (!key) {
    throw new Error(
      'Supabase Anon Key غير مضبوط. افتح ملف .env.local وأضف NEXT_PUBLIC_SUPABASE_ANON_KEY الصحيح.'
    );
  }

  return createClient();
}

/**
 * Create a new program schedule + generate event instances for the next N months.
 * Also seeds event_crew from schedule_crew.
 */
export async function createSchedule(data: ScheduleFormData) {
  const supabase = getSupabase();

  console.log('[createSchedule] payload:', {
    name: data.name,
    category: data.category,
    broadcast_mode: data.broadcast_mode,
    recurrence_type: data.recurrence_type,
    weekdays: data.weekdays,
    valid_from: data.valid_from,
    valid_until: data.valid_until || null,
    crew_count: data.crew_ids.length,
  });

  // 1. Insert schedule
  const { data: schedule, error: schedErr } = await supabase
    .from('program_schedules')
    .insert({
      name: data.name,
      category: data.category,
      broadcast_mode: data.broadcast_mode,
      recurrence_type: data.recurrence_type,
      weekdays: data.weekdays,
      start_time: data.start_time,
      end_time: data.end_time,
      valid_from: data.valid_from,
      valid_until: data.valid_until || null,
      bonus_amount: data.bonus_amount ?? null,
    })
    .select()
    .single();

  if (schedErr) {
    console.error('[createSchedule] insert error:', schedErr);
    throw new Error(`فشل إنشاء الجدول: ${schedErr.message}`);
  }
  if (!schedule) throw new Error('لم يتم إنشاء الجدول — لم تُعَد بيانات');

  console.log('[createSchedule] schedule created:', schedule.id);

  // 2. Insert schedule_crew
  if (data.crew_ids.length > 0) {
    const { error: crewErr } = await supabase
      .from('schedule_crew')
      .insert(data.crew_ids.map(tid => ({ schedule_id: schedule.id, technician_id: tid })));
    if (crewErr) console.warn('[createSchedule] schedule_crew insert warning:', crewErr.message);
  }

  // 3. Generate event instances
  const from = parseISO(data.valid_from);
  const to = data.valid_until
    ? parseISO(data.valid_until)
    : addMonths(from, GENERATE_MONTHS_AHEAD);

  const dates = generateEventDates(schedule, from, to);
  console.log('[createSchedule] dates to generate:', dates.length);

  if (dates.length > 0) {
    const instances = dates.map(d => ({
      schedule_id: schedule.id,
      date: toDateString(d),
    }));

    const { data: insertedEvents, error: evtErr } = await supabase
      .from('event_instances')
      .insert(instances)
      .select('id');

    if (evtErr) {
      console.error('[createSchedule] event_instances insert error:', evtErr);
      throw new Error(`فشل إنشاء الأحداث: ${evtErr.message}`);
    }

    // 4. Seed event_crew from schedule_crew for each instance
    if (data.crew_ids.length > 0 && insertedEvents) {
      const crewRows = insertedEvents.flatMap(evt =>
        data.crew_ids.map(tid => ({ event_id: evt.id, technician_id: tid }))
      );
      const { error: ecErr } = await supabase.from('event_crew').insert(crewRows);
      if (ecErr) console.warn('[createSchedule] event_crew insert warning:', ecErr.message);
    }

    console.log('[createSchedule] events inserted:', insertedEvents?.length ?? 0);
  }

  return schedule;
}

/**
 * Apply a one-day override to a single event instance.
 */
export async function applyOneTimeOverride(
  eventId: string,
  overrides: {
    name_override?: string;
    start_time_override?: string;
    end_time_override?: string;
    category_override?: string;
    broadcast_mode_override?: string;
    bonus_amount_override?: number | null;
    is_cancelled?: boolean;
  }
) {
  const supabase = getSupabase();

  const { error } = await supabase
    .from('event_instances')
    .update({ ...overrides, is_overridden: true })
    .eq('id', eventId);

  if (error) throw new Error(`فشل تحديث الحدث: ${error.message}`);
}

/**
 * Apply a permanent future change:
 * 1. Close old schedule at (changeDate - 1)
 * 2. Create new schedule from changeDate
 * 3. Delete future instances from old schedule (>= changeDate)
 * 4. Generate new instances for new schedule
 * 5. Seed event_crew for new instances
 */
export async function applyPermanentChange(
  oldScheduleId: string,
  changeDate: string,
  data: Omit<ScheduleFormData, 'valid_from' | 'valid_until'> & { valid_until?: string }
) {
  const supabase = getSupabase();

  // 1. Close old schedule
  const closedUntil = format(subDays(parseISO(changeDate), 1), 'yyyy-MM-dd');
  await supabase
    .from('program_schedules')
    .update({ valid_until: closedUntil })
    .eq('id', oldScheduleId);

  // 2. Delete future instances from old schedule
  await supabase
    .from('event_instances')
    .delete()
    .eq('schedule_id', oldScheduleId)
    .gte('date', changeDate);

  // 3. Create new schedule
  const { data: newSchedule, error: schedErr } = await supabase
    .from('program_schedules')
    .insert({
      name: data.name,
      category: data.category,
      broadcast_mode: data.broadcast_mode,
      recurrence_type: data.recurrence_type,
      weekdays: data.weekdays,
      start_time: data.start_time,
      end_time: data.end_time,
      valid_from: changeDate,
      valid_until: data.valid_until || null,
      parent_schedule_id: oldScheduleId,
      bonus_amount: data.bonus_amount ?? null,
    })
    .select()
    .single();

  if (schedErr || !newSchedule) throw new Error(`فشل إنشاء الجدول الجديد: ${schedErr?.message}`);

  // 4. Insert crew for new schedule
  if (data.crew_ids.length > 0) {
    await supabase
      .from('schedule_crew')
      .insert(data.crew_ids.map(tid => ({ schedule_id: newSchedule.id, technician_id: tid })));
  }

  // 5. Generate new instances
  const from = parseISO(changeDate);
  const to = data.valid_until
    ? parseISO(data.valid_until)
    : addMonths(from, GENERATE_MONTHS_AHEAD);

  const dates = generateEventDates(newSchedule, from, to);

  if (dates.length > 0) {
    const instances = dates.map(d => ({ schedule_id: newSchedule.id, date: toDateString(d) }));
    const { data: insertedEvents, error: evtErr } = await supabase
      .from('event_instances')
      .insert(instances)
      .select('id');

    if (evtErr) throw new Error(`فشل إنشاء الأحداث المستقبلية: ${evtErr.message}`);

    if (data.crew_ids.length > 0 && insertedEvents) {
      await supabase.from('event_crew').insert(
        insertedEvents.flatMap(evt =>
          data.crew_ids.map(tid => ({ event_id: evt.id, technician_id: tid }))
        )
      );
    }
  }

  return newSchedule;
}

/**
 * Cancel this event and all future instances of the same schedule (on or after fromDate).
 */
export async function cancelFutureInstances(scheduleId: string, fromDate: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('event_instances')
    .update({ is_cancelled: true })
    .eq('schedule_id', scheduleId)
    .gte('date', fromDate)
    .eq('is_cancelled', false);
  if (error) throw new Error(`فشل إلغاء الأحداث: ${error.message}`);
}

/**
 * Permanently delete a single event instance (and cascade: crew, attendance).
 */
export async function deleteSingleEvent(eventId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('event_instances').delete().eq('id', eventId);
  if (error) throw new Error(`فشل حذف الحدث: ${error.message}`);
}

/**
 * Permanently delete this event and all future instances of the same schedule.
 */
export async function deleteFutureEvents(scheduleId: string, fromDate: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('event_instances')
    .delete()
    .eq('schedule_id', scheduleId)
    .gte('date', fromDate);
  if (error) throw new Error(`فشل حذف الأحداث: ${error.message}`);
}

/**
 * Extend generated instances forward (call when approaching generation horizon).
 */
export async function extendScheduleInstances(scheduleId: string) {
  const supabase = getSupabase();

  const { data: schedule } = await supabase
    .from('program_schedules')
    .select('*')
    .eq('id', scheduleId)
    .single();

  if (!schedule) throw new Error('الجدول غير موجود');

  const { data: latest } = await supabase
    .from('event_instances')
    .select('date')
    .eq('schedule_id', scheduleId)
    .order('date', { ascending: false })
    .limit(1)
    .single();

  const from = latest ? parseISO(latest.date) : parseISO(schedule.valid_from);
  const to = schedule.valid_until
    ? parseISO(schedule.valid_until)
    : addMonths(new Date(), GENERATE_MONTHS_AHEAD);

  const dates = generateEventDates(schedule, from, to);
  const { data: crew } = await supabase
    .from('schedule_crew')
    .select('technician_id')
    .eq('schedule_id', scheduleId);
  const crewIds = crew?.map(c => c.technician_id) ?? [];

  for (const d of dates) {
    const dateStr = toDateString(d);
    const { data: evt, error } = await supabase
      .from('event_instances')
      .insert({ schedule_id: scheduleId, date: dateStr })
      .select('id')
      .single();

    if (!error && evt && crewIds.length > 0) {
      await supabase.from('event_crew').insert(
        crewIds.map(tid => ({ event_id: evt.id, technician_id: tid }))
      );
    }
  }
}

/**
 * Duplicate a schedule (create a copy starting from today).
 */
export async function duplicateSchedule(scheduleId: string) {
  const supabase = getSupabase();

  const { data: original } = await supabase
    .from('program_schedules')
    .select('*')
    .eq('id', scheduleId)
    .single();

  if (!original) throw new Error('الجدول غير موجود');

  const { data: crew } = await supabase
    .from('schedule_crew')
    .select('technician_id')
    .eq('schedule_id', scheduleId);

  return createSchedule({
    name: `${original.name} (نسخة)`,
    category: original.category,
    broadcast_mode: original.broadcast_mode,
    recurrence_type: original.recurrence_type,
    weekdays: original.weekdays ?? [],
    start_time: original.start_time,
    end_time: original.end_time,
    valid_from: format(new Date(), 'yyyy-MM-dd'),
    valid_until: '',
    crew_ids: crew?.map(c => c.technician_id) ?? [],
    bonus_amount: original.bonus_amount ?? null,
  });
}
