'use client';

import { useState, useEffect } from 'react';
import { parseISO } from 'date-fns';
import { X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { applyOneTimeOverride, applyPermanentChange } from '@/lib/actions/schedules';
import { TechnicianForm } from '@/components/technicians/technician-form';
import { CrewPicker } from './crew-picker';
import { EventInstance, ProgramSchedule, Technician, Category, BroadcastMode } from '@/types';
import { resolveEventValues } from '@/lib/recurrence';
import { arDateLong } from '@/lib/ar';
import { cn } from '@/lib/utils';

type EditMode   = 'one_time' | 'permanent';
type CrewScope  = 'one_time' | 'future';

interface EditEventSheetProps {
  event: EventInstance;
  schedule: ProgramSchedule;
  crew: Technician[];
  onClose: () => void;
  onSaved: () => void;
}

export function EditEventSheet({ event, schedule, crew, onClose, onSaved }: EditEventSheetProps) {
  const resolved = resolveEventValues(event, schedule);

  const [mode, setMode] = useState<EditMode>('one_time');
  const [name, setName] = useState(resolved.name);
  const [startTime, setStartTime] = useState(resolved.start_time);
  const [endTime, setEndTime] = useState(resolved.end_time);
  const [category, setCategory] = useState<Category>(resolved.category);
  const [broadcastMode, setBroadcastMode] = useState<BroadcastMode>(resolved.broadcast_mode);
  const [bonusAmountStr, setBonusAmountStr] = useState<string>(
    resolved.bonus_amount != null ? String(resolved.bonus_amount) : ''
  );

  // Crew management
  const [crewIds, setCrewIds] = useState<string[]>(crew.map(t => t.id));
  const [crewScope, setCrewScope] = useState<CrewScope>('one_time');
  const [allTechnicians, setAllTechnicians] = useState<Technician[]>([]);
  const [showAddTech, setShowAddTech] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const supabase = createClient();
    supabase.from('technicians').select('*').order('name').then(({ data }) => {
      if (data) setAllTechnicians(data);
    });
  }, []);

  async function handleTechSaved() {
    setShowAddTech(false);
    const supabase = createClient();
    const prevIds = new Set(allTechnicians.map(t => t.id));
    const { data } = await supabase.from('technicians').select('*').order('name');
    if (data) {
      setAllTechnicians(data);
      const newIds = data.filter(t => !prevIds.has(t.id)).map(t => t.id);
      if (newIds.length > 0) setCrewIds(prev => [...prev, ...newIds]);
    }
  }

  async function handleSave() {
    setError('');
    setLoading(true);
    try {
      const bonusOverride = bonusAmountStr !== '' ? parseFloat(bonusAmountStr) : null;
      const supabase = createClient();

      if (mode === 'one_time') {
        const originalIds = new Set(crew.map(t => t.id));
        const addedIds   = crewIds.filter(id => !originalIds.has(id));
        const removedIds = crew.map(t => t.id).filter(id => !crewIds.includes(id));

        if (crewScope === 'future') {
          // Apply crew changes to this event and all future non-cancelled instances
          const { data: futureInstances } = await supabase
            .from('event_instances')
            .select('id')
            .eq('schedule_id', event.schedule_id)
            .gte('date', event.date)
            .eq('is_cancelled', false);

          const instances = futureInstances ?? [];

          if (addedIds.length > 0 && instances.length > 0) {
            const rows = instances.flatMap(inst =>
              addedIds.map(tid => ({ event_id: inst.id, technician_id: tid }))
            );
            await supabase.from('event_crew').upsert(rows, { onConflict: 'event_id,technician_id', ignoreDuplicates: true });
          }
          if (removedIds.length > 0) {
            for (const inst of instances) {
              await supabase.from('event_crew').delete()
                .eq('event_id', inst.id)
                .in('technician_id', removedIds);
            }
          }
        } else {
          // Apply crew changes to this event only
          if (removedIds.length > 0) {
            await supabase.from('event_crew').delete().eq('event_id', event.id).in('technician_id', removedIds);
          }
          if (addedIds.length > 0) {
            await supabase.from('event_crew').insert(addedIds.map(tid => ({ event_id: event.id, technician_id: tid })));
          }
        }

        await applyOneTimeOverride(event.id, {
          name_override: name !== schedule.name ? name : undefined,
          start_time_override: startTime !== schedule.start_time ? startTime : undefined,
          end_time_override: endTime !== schedule.end_time ? endTime : undefined,
          category_override: category !== schedule.category ? category : undefined,
          broadcast_mode_override: broadcastMode !== schedule.broadcast_mode ? broadcastMode : undefined,
          bonus_amount_override: bonusOverride,
        });
      } else {
        await applyPermanentChange(schedule.id, event.date, {
          name,
          category,
          broadcast_mode: broadcastMode,
          recurrence_type: schedule.recurrence_type,
          weekdays: schedule.weekdays ?? [],
          start_time: startTime,
          end_time: endTime,
          valid_until: schedule.valid_until ?? undefined,
          crew_ids: crewIds,
          bonus_amount: bonusOverride,
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل في حفظ التغييرات');
    } finally {
      setLoading(false);
    }
  }

  const CATEGORIES: { value: Category; label: string }[] = [
    { value: 'bulletin',       label: 'نشرة' },
    { value: 'short_briefing', label: 'موجز' },
    { value: 'program',        label: 'برنامج' },
  ];
  const BROADCAST_MODES: { value: BroadcastMode; label: string }[] = [
    { value: 'live',      label: 'مباشر' },
    { value: 'recording', label: 'تسجيل' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white rounded-t-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white rounded-t-3xl z-10 px-4 pt-4 pb-3 border-b">
          <div className="flex items-center justify-between">
            <button onClick={onClose} className="w-8 h-8 rounded-full border flex items-center justify-center">
              <X size={16} />
            </button>
            <div className="text-right">
              <h2 className="text-lg font-bold">تعديل الحدث</h2>
              <p className="text-xs text-muted-foreground">{arDateLong(parseISO(event.date))}</p>
            </div>
          </div>
        </div>

        <div className="px-4 py-4 space-y-5">
          {/* Edit mode */}
          <div className="space-y-2">
            <Label className="text-right w-full block">تطبيق التعديل على:</Label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: 'one_time' as EditMode,  label: 'تعديل هذا الحدث فقط',                   desc: 'يوم واحد فقط' },
                { value: 'permanent' as EditMode, label: 'هذا الحدث وجميع الأحداث القادمة', desc: 'تغيير دائم' },
              ]).map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMode(opt.value)}
                  className={cn(
                    'rounded-xl border p-3 text-right transition-colors touch-target',
                    mode === opt.value ? 'border-[#008D8B] bg-[#008D8B]/5' : 'border-border bg-white'
                  )}
                >
                  <p className={cn('text-sm font-bold', mode === opt.value ? 'text-[#008D8B]' : '')}>{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </button>
              ))}
            </div>
            {mode === 'permanent' && (
              <p className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-xl text-right">
                تبقى الأحداث السابقة دون تغيير. يبدأ الجدول الجديد من {arDateLong(parseISO(event.date))}.
              </p>
            )}
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-right w-full block">اسم البرنامج</Label>
            <Input value={name} onChange={e => setName(e.target.value)} className="h-12 text-right" />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label className="text-right w-full block">النوع</Label>
            <div className="flex gap-2">
              {CATEGORIES.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  className={cn(
                    'flex-1 py-2 rounded-xl border text-sm font-bold transition-colors touch-target',
                    category === c.value ? 'bg-[#008D8B] text-white border-[#008D8B]' : 'bg-white text-muted-foreground border-border'
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mode */}
          <div className="space-y-1.5">
            <Label className="text-right w-full block">طريقة البث</Label>
            <div className="flex gap-2">
              {BROADCAST_MODES.map(m => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setBroadcastMode(m.value)}
                  className={cn(
                    'flex-1 py-2 rounded-xl border text-sm font-bold transition-colors touch-target',
                    broadcastMode === m.value ? 'bg-[#008D8B] text-white border-[#008D8B]' : 'bg-white text-muted-foreground border-border'
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-right w-full block">وقت الانتهاء</Label>
              <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="h-12" dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-right w-full block">وقت البداية</Label>
              <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="h-12" dir="ltr" />
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
                placeholder="اتركه فارغاً لاستخدام الأسعار الافتراضية"
                value={bonusAmountStr}
                onChange={e => setBonusAmountStr(e.target.value)}
                className="h-12"
                dir="ltr"
              />
            </div>
          </div>

          {/* Crew management */}
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
              <Label className="text-right">الفنيون المعينون فعليًا</Label>
            </div>

            {/* Crew scope — only relevant for one_time event mode */}
            {mode === 'one_time' && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground text-right">تطبيق تغييرات الطاقم على:</p>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: 'one_time' as CrewScope, label: 'لهذا الحدث فقط',            desc: 'حدث واحد فقط' },
                    { value: 'future'   as CrewScope, label: 'هذا وجميع الأحداث القادمة', desc: 'لا يؤثر على الماضي' },
                  ]).map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setCrewScope(opt.value)}
                      className={cn(
                        'rounded-xl border p-3 text-right transition-colors touch-target',
                        crewScope === opt.value ? 'border-[#008D8B] bg-[#008D8B]/5' : 'border-border bg-white'
                      )}
                    >
                      <p className={cn('text-sm font-bold leading-tight', crewScope === opt.value ? 'text-[#008D8B]' : '')}>{opt.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {allTechnicians.length === 0 ? (
              <p className="text-xs text-muted-foreground text-right">جارٍ التحميل…</p>
            ) : (
              <div className="bg-white rounded-2xl border p-4">
                <CrewPicker
                  technicians={allTechnicians}
                  selectedIds={crewIds}
                  onChange={setCrewIds}
                  suggestedIds={allTechnicians
                    .filter(t => t.status === 'active' && (t.default_days ?? []).includes(parseISO(event.date).getDay()))
                    .map(t => t.id)}
                />
              </div>
            )}
            <div className="flex items-center gap-3 justify-end text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#008D8B]" />
                مُعيَّن
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400" />
                مُقترح (يعمل هذا اليوم)
              </span>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-xl text-right">{error}</p>
          )}

          <Button
            onClick={handleSave}
            disabled={loading}
            className="w-full h-12 bg-[#008D8B] hover:bg-[#007a78] text-white rounded-xl text-base"
          >
            {loading ? 'جارٍ الحفظ…' : 'حفظ التغييرات'}
          </Button>
        </div>
      </div>

      {showAddTech && (
        <TechnicianForm
          onClose={() => setShowAddTech(false)}
          onSaved={handleTechSaved}
        />
      )}
    </div>
  );
}
