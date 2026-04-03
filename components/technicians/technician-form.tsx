'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { WeekdayPicker } from '@/components/events/weekday-picker';
import { createClient } from '@/lib/supabase/client';
import { Technician, TechnicianStatus } from '@/types';
import { TECHNICIAN_STATUS_LABELS } from '@/lib/constants';
import { cn } from '@/lib/utils';

const COMMON_ROLES = [
  'مصور', 'فني الصوت', 'مونتاج', 'اوتوكيو',
  'شاشة', 'كابشن', 'مخرج', 'سويتشر', 'هندسة', 'مذيع',
];

const STATUS_OPTIONS: { value: TechnicianStatus; color: string }[] = [
  { value: 'active',   color: 'text-emerald-700 border-emerald-300 bg-emerald-50' },
  { value: 'on_leave', color: 'text-amber-700 border-amber-300 bg-amber-50' },
  { value: 'left',     color: 'text-gray-600 border-gray-300 bg-gray-50' },
];

interface TechnicianFormProps {
  initial?: Technician | null;
  onClose: () => void;
  onSaved: () => void;
}

export function TechnicianForm({ initial, onClose, onSaved }: TechnicianFormProps) {
  const supabase = createClient();
  const [name, setName] = useState(initial?.name ?? '');
  const [role, setRole] = useState(initial?.role ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [status, setStatus] = useState<TechnicianStatus>(initial?.status ?? 'active');
  const [defaultDays, setDefaultDays] = useState<number[]>(initial?.default_days ?? []);
  const [workStart, setWorkStart] = useState(initial?.work_start_time ?? '');
  const [workEnd, setWorkEnd] = useState(initial?.work_end_time ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!name.trim()) { setError('الاسم مطلوب'); return; }
    if (!role.trim()) { setError('الدور مطلوب'); return; }
    setError('');
    setLoading(true);

    try {
      const payload = {
        name: name.trim(),
        role: role.trim(),
        phone: phone.trim() || null,
        notes: notes.trim() || null,
        status,
        default_days: defaultDays,
        work_start_time: workStart || null,
        work_end_time: workEnd || null,
      };

      if (initial) {
        const { error: err } = await supabase.from('technicians').update(payload).eq('id', initial.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('technicians').insert(payload);
        if (err) throw err;
      }
      onSaved();
    } catch (err: any) {
      setError(err.message ?? 'حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white rounded-t-3xl z-10 px-4 pt-4 pb-3 border-b">
          <div className="flex items-center justify-between">
            <button onClick={onClose} className="w-8 h-8 rounded-full border flex items-center justify-center">
              <X size={16} />
            </button>
            <h2 className="text-lg font-bold">{initial ? 'تعديل بيانات الفني' : 'إضافة فني جديد'}</h2>
          </div>
        </div>

        <div className="px-4 py-4 space-y-5">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-right w-full block">الاسم</Label>
            <Input
              placeholder="الاسم الكامل"
              value={name}
              onChange={e => setName(e.target.value)}
              className="h-12 text-right"
            />
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label className="text-right w-full block">الدور / التخصص</Label>
            <Input
              placeholder="مثال: مصور"
              value={role}
              onChange={e => setRole(e.target.value)}
              className="h-12 text-right"
            />
            <div className="flex flex-wrap gap-2 justify-end">
              {COMMON_ROLES.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={cn(
                    'text-xs px-2.5 py-1.5 rounded-full border transition-colors touch-target',
                    role === r
                      ? 'bg-[#008D8B] text-white border-[#008D8B]'
                      : 'bg-white text-muted-foreground border-border'
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label className="text-right w-full block">الحالة</Label>
            <div className="flex gap-2">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatus(opt.value)}
                  className={cn(
                    'flex-1 py-2.5 rounded-xl border text-sm font-bold transition-colors touch-target',
                    status === opt.value
                      ? opt.color
                      : 'bg-white text-muted-foreground border-border'
                  )}
                >
                  {TECHNICIAN_STATUS_LABELS[opt.value]}
                </button>
              ))}
            </div>
          </div>

          {/* ── Default schedule section ── */}
          <div className="bg-muted/40 rounded-2xl p-4 space-y-4">
            <p className="text-sm font-bold text-right">الجدول الافتراضي</p>

            {/* Default days */}
            <div className="space-y-1.5">
              <Label className="text-right w-full block text-xs text-muted-foreground">
                أيام العمل المعتادة
              </Label>
              <WeekdayPicker value={defaultDays} onChange={setDefaultDays} />
              {defaultDays.length === 0 && (
                <p className="text-xs text-muted-foreground text-right">
                  اختر أيام العمل المعتادة لهذا الفني لتفعيل الاقتراح التلقائي عند إنشاء الأحداث
                </p>
              )}
            </div>

            {/* Work times */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-right w-full block text-xs text-muted-foreground">
                  وقت النهاية <span className="font-normal">(اختياري)</span>
                </Label>
                <Input
                  type="time"
                  value={workEnd}
                  onChange={e => setWorkEnd(e.target.value)}
                  className="h-11 text-sm"
                  dir="ltr"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-right w-full block text-xs text-muted-foreground">
                  وقت البداية <span className="font-normal">(اختياري)</span>
                </Label>
                <Input
                  type="time"
                  value={workStart}
                  onChange={e => setWorkStart(e.target.value)}
                  className="h-11 text-sm"
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label className="text-right w-full block">
              رقم التواصل <span className="text-muted-foreground font-normal">(اختياري)</span>
            </Label>
            <Input
              type="tel"
              placeholder="مثال: 0501234567"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="h-12"
              dir="ltr"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-right w-full block">
              ملاحظات <span className="text-muted-foreground font-normal">(اختيارية)</span>
            </Label>
            <Textarea
              placeholder="أي ملاحظات حول هذا الفني"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className="text-right"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-xl text-right">{error}</p>
          )}

          <Button
            onClick={handleSave}
            disabled={loading}
            className="w-full h-12 bg-[#008D8B] hover:bg-[#007a78] text-white rounded-xl text-base"
          >
            {loading ? 'جارٍ الحفظ…' : initial ? 'تحديث البيانات' : 'إضافة الفني'}
          </Button>
        </div>
      </div>
    </div>
  );
}
