'use client';

import { cn } from '@/lib/utils';
import { ATTENDANCE_SHORT, ATTENDANCE_ACTIVE_COLORS } from '@/lib/constants';
import { AttendanceStatus, Technician } from '@/types';

const ALL_STATUSES: AttendanceStatus[] = ['present', 'absent', 'late', 'left_early', 'on_leave', 'excused'];

interface TechAttendanceRowProps {
  technician: Technician;
  status: AttendanceStatus | null;
  onChange: (status: AttendanceStatus) => void;
  loading?: boolean;
}

export function TechAttendanceRow({ technician, status, onChange, loading }: TechAttendanceRowProps) {
  return (
    <div className="py-3 border-b last:border-b-0">
      {/* Name + avatar row */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex-1 min-w-0 text-right">
          <p className="text-sm font-bold text-foreground truncate">{technician.name}</p>
          <p className="text-xs text-muted-foreground truncate">{technician.role}</p>
        </div>
        <div className="w-9 h-9 rounded-full bg-[#9EB2A6] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {technician.name.charAt(0)}
        </div>
      </div>

      {/* Status buttons — 3×2 grid */}
      <div className="grid grid-cols-3 gap-1.5">
        {ALL_STATUSES.map(s => (
          <button
            key={s}
            type="button"
            disabled={loading}
            onClick={() => onChange(s)}
            className={cn(
              'py-1.5 rounded-lg text-xs font-bold border transition-colors touch-target',
              status === s
                ? ATTENDANCE_ACTIVE_COLORS[s]
                : 'bg-white text-muted-foreground border-border'
            )}
          >
            {ATTENDANCE_SHORT[s]}
          </button>
        ))}
      </div>
    </div>
  );
}
