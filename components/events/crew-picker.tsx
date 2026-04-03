'use client';

import { Technician } from '@/types';
import { cn } from '@/lib/utils';

/** Display heading for each role group */
const ROLE_HEADINGS: Record<string, string> = {
  'مصور':      'المصورون',
  'فني الصوت': 'فنيو الصوت',
  'مونتاج':    'المونتاج',
  'اوتوكيو':   'الاوتوكيو',
  'شاشة':      'الشاشة',
  'كابشن':     'الكابشن',
  'مخرج':      'المخرجون',
  'سويتشر':    'السويتشر',
  'هندسة':     'الهندسة',
  'مذيع':      'المذيعون',
};

/** Canonical role order — defines section display order */
const ROLE_ORDER = [
  'مصور', 'فني الصوت', 'مونتاج', 'اوتوكيو',
  'شاشة', 'كابشن', 'مخرج', 'سويتشر', 'هندسة', 'مذيع',
];

interface CrewPickerProps {
  technicians: Technician[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  suggestedIds?: string[];
}

export function CrewPicker({ technicians, selectedIds, onChange, suggestedIds }: CrewPickerProps) {
  const toggle = (id: string) =>
    onChange(selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id]);

  // Group technicians by role
  const grouped = new Map<string, Technician[]>();
  for (const tech of technicians) {
    if (!grouped.has(tech.role)) grouped.set(tech.role, []);
    grouped.get(tech.role)!.push(tech);
  }

  // Order by ROLE_ORDER, then any unrecognised roles at the end
  const orderedGroups: { role: string; techs: Technician[] }[] = [];
  for (const role of ROLE_ORDER) {
    if (grouped.has(role)) orderedGroups.push({ role, techs: grouped.get(role)! });
  }
  for (const [role, techs] of grouped) {
    if (!ROLE_ORDER.includes(role)) orderedGroups.push({ role, techs });
  }

  if (orderedGroups.length === 0) return null;

  return (
    <div className="space-y-5">
      {orderedGroups.map(({ role, techs }) => (
        <div key={role}>
          {/* Role section heading */}
          <p className="text-xs font-bold text-muted-foreground mb-2 text-right tracking-wide">
            {ROLE_HEADINGS[role] ?? role}
          </p>

          {/* Technician chips — multi-select */}
          <div className="flex flex-wrap gap-2 justify-end">
            {techs.map(tech => {
              const selected = selectedIds.includes(tech.id);
              const suggested = !selected && suggestedIds?.includes(tech.id);
              return (
                <button
                  key={tech.id}
                  type="button"
                  onClick={() => toggle(tech.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors touch-target',
                    selected
                      ? 'bg-[#008D8B] text-white border-[#008D8B]'
                      : suggested
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : 'bg-white text-foreground border-border'
                  )}
                >
                  {tech.name}
                  {suggested && <span className="ms-1 text-amber-500">●</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
