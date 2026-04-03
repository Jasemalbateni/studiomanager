'use client';

import { cn } from '@/lib/utils';
import { AttendanceStatus, Technician } from '@/types';

const STATUSES: { value: AttendanceStatus; label: string }[] = [
  { value: 'present',    label: 'حاضر' },
  { value: 'absent',     label: 'غائب' },
  { value: 'late',       label: 'متأخر' },
  { value: 'left_early', label: 'غادر' },
];

const STATUS_ACTIVE: Record<AttendanceStatus, string> = {
  present:    'bg-emerald-500 text-white border-emerald-500',
  absent:     'bg-red-500 text-white border-red-500',
  late:       'bg-amber-500 text-white border-amber-500',
  left_early: 'bg-orange-500 text-white border-orange-500',
};

interface TechAttendanceRowProps {
  technician: Technician;
  status: AttendanceStatus | null;
  onChange: (status: AttendanceStatus) => void;
  loading?: boolean;
}

export function TechAttendanceRow({ technician, status, onChange, loading }: TechAttendanceRowProps) {
  return (
    <div className="flex items-center gap-3 py-3 border-b last:border-b-0">
      {/* Status chips — appear on the LEFT in RTL */}
      <div className="flex gap-1 flex-shrink-0">
        {STATUSES.map(s => (
          <button
            key={s.value}
            type="button"
            disabled={loading}
            onClick={() => onChange(s.value)}
            className={cn(
              'h-8 px-2 rounded-lg text-xs font-bold border transition-colors touch-target flex items-center whitespace-nowrap',
              status === s.value
                ? STATUS_ACTIVE[s.value]
                : 'bg-white text-muted-foreground border-border'
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Name + role — appear in the MIDDLE */}
      <div className="flex-1 min-w-0 text-right">
        <p className="text-sm font-bold text-foreground truncate">{technician.name}</p>
        <p className="text-xs text-muted-foreground truncate">{technician.role}</p>
      </div>

      {/* Avatar — appears on the RIGHT in RTL */}
      <div className="w-9 h-9 rounded-full bg-[#9EB2A6] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
        {technician.name.charAt(0)}
      </div>
    </div>
  );
}
