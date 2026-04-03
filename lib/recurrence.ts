import { addDays, addMonths, parseISO, isAfter, isBefore, isSameDay, format } from 'date-fns';
import { ProgramSchedule, EventInstance } from '@/types';

/**
 * Generate all event dates for a schedule within a date range.
 * Respects valid_from and valid_until boundaries.
 */
export function generateEventDates(
  schedule: ProgramSchedule,
  from: Date,
  to: Date
): Date[] {
  const validFrom = parseISO(schedule.valid_from);
  const validUntil = schedule.valid_until ? parseISO(schedule.valid_until) : null;

  // Effective range = intersection of [from,to] and [validFrom, validUntil]
  const start = isAfter(validFrom, from) ? validFrom : from;
  const end = validUntil && isBefore(validUntil, to) ? validUntil : to;

  if (isAfter(start, end)) return [];

  const dates: Date[] = [];

  switch (schedule.recurrence_type) {
    case 'one_time': {
      if (
        (isSameDay(validFrom, start) || isAfter(validFrom, start)) &&
        (isSameDay(validFrom, end) || isBefore(validFrom, end))
      ) {
        dates.push(new Date(validFrom));
      }
      break;
    }
    case 'daily': {
      let current = new Date(start);
      while (!isAfter(current, end)) {
        dates.push(new Date(current));
        current = addDays(current, 1);
      }
      break;
    }
    case 'weekdays': {
      if (!schedule.weekdays || schedule.weekdays.length === 0) break;
      let current = new Date(start);
      while (!isAfter(current, end)) {
        if (schedule.weekdays.includes(current.getDay())) {
          dates.push(new Date(current));
        }
        current = addDays(current, 1);
      }
      break;
    }
  }

  return dates;
}

/**
 * Default generation window: from schedule.valid_from to 3 months ahead.
 */
export function getDefaultGenerationRange(schedule: ProgramSchedule): { from: Date; to: Date } {
  const from = parseISO(schedule.valid_from);
  const to = schedule.valid_until
    ? parseISO(schedule.valid_until)
    : addMonths(from, 3);
  return { from, to };
}

/**
 * Resolve the effective display values of an event (overrides take priority).
 */
export function resolveEventValues(
  event: EventInstance,
  schedule: ProgramSchedule
) {
  return {
    name: event.name_override ?? schedule.name,
    category: event.category_override ?? schedule.category,
    broadcast_mode: event.broadcast_mode_override ?? schedule.broadcast_mode,
    start_time: event.start_time_override ?? schedule.start_time,
    end_time: event.end_time_override ?? schedule.end_time,
    bonus_amount: event.bonus_amount_override ?? schedule.bonus_amount ?? null,
  };
}

/**
 * Format a date as YYYY-MM-DD (local time, not UTC).
 */
export function toDateString(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}
