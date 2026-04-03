'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calendar, CheckSquare, Users, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/home',        label: 'الرئيسية',    icon: Home },
  { href: '/events',      label: 'الأحداث',     icon: Calendar },
  { href: '/attendance',  label: 'حضوري',       icon: CheckSquare },
  { href: '/technicians', label: 'الفنيون',     icon: Users },
  { href: '/statistics',  label: 'الإحصائيات', icon: BarChart2 },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-white border-t border-border z-50 safe-bottom">
      <div className="flex items-stretch">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 touch-target transition-colors',
                isActive ? 'text-[#008D8B]' : 'text-muted-foreground'
              )}
            >
              <Icon
                size={22}
                strokeWidth={isActive ? 2.5 : 1.8}
                className={cn(isActive ? 'text-[#008D8B]' : 'text-muted-foreground')}
              />
              <span className={cn(
                'text-[10px] font-semibold leading-none',
                isActive ? 'text-[#008D8B]' : 'text-muted-foreground'
              )}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
