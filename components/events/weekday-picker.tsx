'use client';

import { cn } from '@/lib/utils';
import { WEEKDAY_LABELS, WEEKDAY_FULL } from '@/lib/constants';

interface WeekdayPickerProps {
  value: number[];
  onChange: (days: number[]) => void;
}

export function WeekdayPicker({ value, onChange }: WeekdayPickerProps) {
  const toggle = (day: number) => {
    if (value.includes(day)) {
      onChange(value.filter(d => d !== day));
    } else {
      onChange([...value, day].sort((a, b) => a - b));
    }
  };

  return (
    <div className="flex gap-1.5">
      {WEEKDAY_LABELS.map((label, idx) => (
        <button
          key={idx}
          type="button"
          onClick={() => toggle(idx)}
          className={cn(
            'flex-1 h-11 rounded-xl text-xs font-bold transition-colors touch-target flex items-center justify-center',
            value.includes(idx)
              ? 'bg-[#008D8B] text-white shadow-sm'
              : 'bg-muted text-muted-foreground border border-border'
          )}
          aria-label={WEEKDAY_FULL[idx]}
          title={WEEKDAY_FULL[idx]}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
