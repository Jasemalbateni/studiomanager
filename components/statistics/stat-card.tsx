import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  className?: string;
}

export function StatCard({ label, value, sub, accent, className }: StatCardProps) {
  return (
    <div className={cn(
      'bg-white rounded-2xl border p-4 shadow-sm flex flex-col gap-1',
      accent && 'border-[#008D8B] bg-[#008D8B]/5',
      className
    )}>
      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
        {label}
      </span>
      <span className={cn(
        'text-2xl font-bold leading-none',
        accent ? 'text-[#008D8B]' : 'text-foreground'
      )}>
        {value}
      </span>
      {sub && (
        <span className="text-xs text-muted-foreground">{sub}</span>
      )}
    </div>
  );
}
