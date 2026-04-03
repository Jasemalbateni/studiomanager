import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, action, className }: PageHeaderProps) {
  return (
    <header className={cn('px-4 pt-6 pb-3 flex items-start justify-between', className)}>
      <div>
        <h1 className="text-xl font-bold text-foreground leading-tight">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
      {action && <div className="ml-2 flex-shrink-0">{action}</div>}
    </header>
  );
}
