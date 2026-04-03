'use client';

import { format, addMonths, subMonths, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { arMonthYear } from '@/lib/ar';
import { cn } from '@/lib/utils';

interface MonthFilterProps {
  value: string; // 'YYYY-MM'
  onChange: (month: string) => void;
  className?: string;
}

export function MonthFilter({ value, onChange, className }: MonthFilterProps) {
  const current = parseISO(value + '-01');

  const prev = () => onChange(format(subMonths(current, 1), 'yyyy-MM'));
  const next = () => onChange(format(addMonths(current, 1), 'yyyy-MM'));

  const isCurrentMonth = value === format(new Date(), 'yyyy-MM');

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* In RTL: this button appears on the RIGHT = "previous month" */}
      <button
        onClick={prev}
        className="p-2 rounded-xl border bg-white text-muted-foreground active:bg-muted touch-target flex items-center justify-center"
        aria-label="الشهر السابق"
      >
        <ChevronRight size={18} />
      </button>

      <div className="flex-1 text-center">
        <span className="text-sm font-bold text-foreground">
          {arMonthYear(current)}
        </span>
        {isCurrentMonth && (
          <span className="me-2 text-[10px] font-semibold bg-[#008D8B]/10 text-[#008D8B] px-1.5 py-0.5 rounded-full">
            الآن
          </span>
        )}
      </div>

      {/* In RTL: this button appears on the LEFT = "next month" */}
      <button
        onClick={next}
        className="p-2 rounded-xl border bg-white text-muted-foreground active:bg-muted touch-target flex items-center justify-center"
        aria-label="الشهر التالي"
      >
        <ChevronLeft size={18} />
      </button>
    </div>
  );
}
