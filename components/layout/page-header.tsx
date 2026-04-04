import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, action, className }: PageHeaderProps) {
  return (
    <header className={cn('px-4 pt-6 pb-4 border-b bg-background', className)}>
      {/* Relative container so the action can sit absolutely at the end without pushing the title off-center */}
      <div className="relative flex items-center justify-center min-h-[44px]">
        <div className="text-center">
          <h1 className="text-xl font-bold text-foreground leading-tight">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>

        {/* Action button — positioned on the left (= RTL end side) */}
        {action && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2">
            {action}
          </div>
        )}
      </div>
    </header>
  );
}
