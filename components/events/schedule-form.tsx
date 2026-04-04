'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { WeekdayPicker } from './weekday-picker';
import { CrewPicker } from './crew-picker';
import { createSchedule } from '@/lib/actions/schedules';
import { ScheduleFormData, Category, BroadcastMode, RecurrenceType, Technician } from '@/types';
import { TechnicianForm } from '@/components/technicians/technician-form';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface ScheduleFormProps {
  technicians: Technician[];
  initialData?: Partial<ScheduleFormData>;
  onSuccess?: (scheduleId: string) => void;
}

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'bulletin',       label: 'نشرة إخبارية' },
  { value: 'short_briefing', label: 'موجز أخبار' },
  { value: 'program',        label: 'برنامج' },
];

const BROADCAST_MODES: { value: BroadcastMode; label: string }[] = [
  { value: 'live',      label: 'مباشر' },
  { value: 'recording', label: 'تسجيل' },
];

const RECURRENCE_TYPES: { value: RecurrenceType; label: string; desc: string }[] = [
  { value: 'one_time',  label: 'مرة واحدة',   desc: 'حدوث مرة واحدة فقط' },
  { value: 'daily',     label: 'يومياً',       desc: 'كل يوم' },
  { value: 'weekdays',  label: 'أيام محددة',   desc: 'اختر أياماً بعينها' },
];

function SegmentedControl<T extends string>({
  options, value, onChange, className,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cn('flex rounded-xl border bg-muted p-1 gap-1', className)}>
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'flex-1 py-2 rounded-lg text-sm font-bold transition-colors touch-target',
            value === opt.value
              ? 'bg-white text-[#008D8B] shadow-sm'
              : 'text-muted-foreground'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function ScheduleForm({ technicians, initialData, onSuccess }: ScheduleFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  const [form, setForm] = useState<ScheduleFormData>({
    name: initialData?.name ?? '',
    category: initialData?.category ?? 'bulletin',
    broadcast_mode: initialData?.broadcast_mode ?? 'live',
    recurrence_type: initialData?.recurrence_type ?? 'daily',
    weekdays: initialData?.weekdays ?? [],
    start_time: initialData?.start_time ?? '08:00',
    end_time: initialData?.end_time ?? '08:30',
    valid_from: initialData?.valid_from ?? today,
    valid_until: initialData?.valid_until ?? '',
    crew_ids: initialData?.crew_ids ?? [],
    bonus_amount: initialData?.bonus_amount ?? 10,
  });
  const [allTechnicians, setAllTechnicians] = useState<Technician[]>(technicians);
  const [showAddTech, setShowAddTech] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = <K extends keyof ScheduleFormData>(key: K, value: ScheduleFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  async function handleTechSaved() {
    setShowAddTech(false);
    const prevIds = new Set(allTechnicians.map(t => t.id));
    const { data } = await supabase.from('technicians').select('*').order('name', { ascending: true });
    if (data) {
      setAllTechnicians(data);
      const newIds = data.filter(t => !prevIds.has(t.id)).map(t => t.id);
      if (newIds.length > 0) {
        set('crew_ids', [...form.crew_ids, ...newIds]);
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('اسم البرنامج مطلوب'); return; }
    if (form.recurrence_type === 'weekdays' && form.weekdays.length === 0) {
      setError('يرجى اختيار يوم واحد على الأقل');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const schedule = await createSchedule(form);
      if (onSuccess) onSuccess(schedule.id);
      else router.push('/events');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || 'حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 px-4 py-4">
      {/* Name */}
      <div className="space-y-1.5">
        <Label className="text-right w-full block">اسم البرنامج</Label>
        <Input
          placeholder="مثال: نشرة الصباح"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          className="h-12 text-base text-right"
        />
      </div>

      {/* Category */}
      <div className="space-y-1.5">
        <Label className="text-right w-full block">نوع البرنامج</Label>
        <SegmentedControl options={CATEGORIES} value={form.category} onChange={v => set('category', v)} />
      </div>

      {/* Broadcast mode */}
      <div className="space-y-1.5">
        <Label className="text-right w-full block">طريقة البث</Label>
        <SegmentedControl options={BROADCAST_MODES} value={form.broadcast_mode} onChange={v => set('broadcast_mode', v)} />
      </div>

      {/* Time */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-right w-full block">وقت الانتهاء</Label>
          <Input
            type="time"
            value={form.end_time}
            onChange={e => set('end_time', e.target.value)}
            className="h-12 text-base"
            dir="ltr"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-right w-full block">وقت البداية</Label>
          <Input
            type="time"
            value={form.start_time}
            onChange={e => set('start_time', e.target.value)}
            className="h-12 text-base"
            dir="ltr"
          />
        </div>
      </div>

      {/* Bonus amount */}
      <div className="space-y-1.5">
        <Label className="text-right w-full block">
          مبلغ المكافأة <span className="text-muted-foreground font-normal">(اختياري)</span>
        </Label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground font-medium flex-shrink-0">د.ك</span>
          <Input
            type="number"
            min="0"
            step="0.001"
            placeholder="تُستخدم الأسعار الافتراضية إن تُرك فارغاً"
            value={form.bonus_amount ?? ''}
            onChange={e => set('bonus_amount', e.target.value === '' ? null : parseFloat(e.target.value))}
            className="h-12 text-base"
            dir="ltr"
          />
        </div>
      </div>

      {/* Recurrence */}
      <div className="space-y-3">
        <Label className="text-right w-full block">نمط التكرار</Label>
        <div className="grid grid-cols-3 gap-2">
          {RECURRENCE_TYPES.map(r => (
            <button
              key={r.value}
              type="button"
              onClick={() => set('recurrence_type', r.value)}
              className={cn(
                'rounded-xl border p-3 text-right transition-colors touch-target',
                form.recurrence_type === r.value
                  ? 'border-[#008D8B] bg-[#008D8B]/5'
                  : 'border-border bg-white'
              )}
            >
              <p className={cn('text-sm font-bold', form.recurrence_type === r.value ? 'text-[#008D8B]' : 'text-foreground')}>
                {r.label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{r.desc}</p>
            </button>
          ))}
        </div>

        {form.recurrence_type === 'weekdays' && (
          <div className="space-y-1.5">
            <p className="text-sm text-muted-foreground text-right">اختر أيام الأسبوع:</p>
            <WeekdayPicker value={form.weekdays} onChange={v => set('weekdays', v)} />
          </div>
        )}
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-right w-full block">
            تاريخ الانتهاء <span className="text-muted-foreground font-normal">(اختياري)</span>
          </Label>
          <Input
            type="date"
            value={form.valid_until}
            onChange={e => set('valid_until', e.target.value)}
            className="h-12 text-base"
            dir="ltr"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-right w-full block">تاريخ البداية</Label>
          <Input
            type="date"
            value={form.valid_from}
            onChange={e => set('valid_from', e.target.value)}
            className="h-12 text-base"
            dir="ltr"
          />
        </div>
      </div>

      {/* Crew */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowAddTech(true)}
            className="flex items-center gap-1 text-xs text-[#008D8B] font-semibold"
          >
            <Plus size={14} />
            إضافة فني جديد
          </button>
          <Label className="text-right">إضافة الفنيين</Label>
        </div>

        {allTechnicians.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-4 text-center space-y-1">
            <p className="text-sm text-muted-foreground">لا يوجد فنيون مسجّلون بعد</p>
            <button
              type="button"
              onClick={() => setShowAddTech(true)}
              className="text-sm text-[#008D8B] font-semibold"
            >
              + أضف أول فني
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border p-4 space-y-1">
            <CrewPicker
              technicians={allTechnicians}
              selectedIds={form.crew_ids}
              onChange={ids => set('crew_ids', ids)}
              suggestedIds={(() => {
                // Compute event weekdays set
                let eventDays: number[] = [];
                if (form.recurrence_type === 'daily') {
                  eventDays = [0, 1, 2, 3, 4, 5, 6];
                } else if (form.recurrence_type === 'weekdays') {
                  eventDays = form.weekdays;
                } else if (form.recurrence_type === 'one_time' && form.valid_from) {
                  eventDays = [new Date(form.valid_from).getDay()];
                }
                return allTechnicians
                  .filter(t => t.status === 'active' && (t.default_days ?? []).some(d => eventDays.includes(d)))
                  .map(t => t.id);
              })()}
            />
          </div>
        )}

        <p className="text-xs text-muted-foreground text-right">
          يمكن إنشاء الجدول بدون اختيار الفنيين وإضافتهم لاحقاً
        </p>
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-xl text-right">{error}</p>
      )}

      <Button
        type="submit"
        disabled={loading}
        className="w-full h-12 text-base bg-[#008D8B] hover:bg-[#007a78] text-white rounded-xl"
      >
        {loading ? 'جارٍ الإنشاء…' : 'إنشاء الجدول'}
      </Button>

      {showAddTech && (
        <TechnicianForm
          onClose={() => setShowAddTech(false)}
          onSaved={handleTechSaved}
        />
      )}
    </form>
  );
}
