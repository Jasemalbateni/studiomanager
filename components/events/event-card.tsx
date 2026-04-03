import Link from 'next/link';
import { parseISO, format } from 'date-fns';
import { Clock, Users, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CATEGORY_LABELS, BROADCAST_LABELS, CATEGORY_COLORS, BROADCAST_COLORS, ATTENDANCE_COLORS, ATTENDANCE_SHORT } from '@/lib/constants';
import { arDate } from '@/lib/ar';
import { EventDisplay } from '@/types';

interface EventCardProps {
  event: EventDisplay;
  showAttendance?: boolean;
  onClick?: () => void;
  asLink?: boolean;
}

export function EventCard({ event, showAttendance = false, onClick, asLink = true }: EventCardProps) {
  const dateObj = parseISO(event.date);
  const isToday = event.date === format(new Date(), 'yyyy-MM-dd');

  const content = (
    <div
      className={cn(
        'bg-white rounded-2xl border p-4 shadow-sm active:scale-[0.99] transition-transform',
        event.is_cancelled && 'opacity-60',
        isToday && 'border-[#008D8B] border-2',
        !asLink && onClick && 'cursor-pointer'
      )}
      onClick={!asLink ? onClick : undefined}
    >
      {/* Top row: badges */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className={cn(
          'text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap',
          BROADCAST_COLORS[event.broadcast_mode]
        )}>
          {BROADCAST_LABELS[event.broadcast_mode]}
        </span>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', CATEGORY_COLORS[event.category])}>
            {CATEGORY_LABELS[event.category]}
          </span>
          {event.is_overridden && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 inline-flex items-center gap-1">
              <AlertCircle size={10} />
              معدَّل
            </span>
          )}
          {event.is_cancelled && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-600">
              ملغى
            </span>
          )}
        </div>
      </div>

      {/* Event name */}
      <h3 className="font-bold text-base text-foreground leading-snug mb-2">
        {event.name}
      </h3>

      {/* Date + time + crew */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <Users size={13} />
          {event.crew_count}
        </span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Clock size={13} />
            {event.start_time} – {event.end_time}
          </span>
          <span className={cn('font-medium', isToday && 'text-[#008D8B]')}>
            {isToday ? 'اليوم' : arDate(dateObj)}
          </span>
        </div>
      </div>

      {/* Attendance badge */}
      {showAttendance && event.my_attendance_status && (
        <div className="mt-2.5 pt-2.5 border-t border-border">
          <span className={cn(
            'text-xs font-semibold px-2.5 py-1 rounded-full border',
            ATTENDANCE_COLORS[event.my_attendance_status]
          )}>
            أنا: {ATTENDANCE_SHORT[event.my_attendance_status]}
          </span>
        </div>
      )}
    </div>
  );

  if (asLink) {
    return (
      <Link href={`/events/${event.id}`} className="block">
        {content}
      </Link>
    );
  }
  return content;
}
