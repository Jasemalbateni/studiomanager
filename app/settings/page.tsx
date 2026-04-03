'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { DollarSign, Save, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PageHeader } from '@/components/layout/page-header';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CATEGORY_LABELS, CURRENCY } from '@/lib/constants';
import { PricingSetting, Category } from '@/types';
import { cn } from '@/lib/utils';

const CATEGORY_ICONS: Record<Category, string> = {
  bulletin:       '📰',
  short_briefing: '⚡',
  program:        '🎬',
};

export default function SettingsPage() {
  const supabase = createClient();
  const [settings, setSettings] = useState<PricingSetting[]>([]);
  const [rates, setRates] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  async function loadSettings() {
    const { data } = await supabase.from('pricing_settings').select('*').order('category');
    if (data) {
      setSettings(data);
      const rateMap: Record<string, string> = {};
      data.forEach(s => { rateMap[`${s.category}__${s.broadcast_mode ?? 'any'}`] = s.rate.toString(); });
      setRates(rateMap);
    }
    setLoading(false);
  }

  const getKey = (category: Category, broadcast_mode: string | null) =>
    `${category}__${broadcast_mode ?? 'any'}`;

  const getRateValue = (category: Category, broadcast_mode: string | null) =>
    rates[getKey(category, broadcast_mode)] ?? '0';

  const setRateValue = (category: Category, broadcast_mode: string | null, value: string) =>
    setRates(prev => ({ ...prev, [getKey(category, broadcast_mode)]: value }));

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      for (const s of settings) {
        const key = getKey(s.category as Category, s.broadcast_mode);
        const newRate = parseFloat(rates[key] ?? '0') || 0;
        await supabase.from('pricing_settings').update({ rate: newRate, updated_at: new Date().toISOString() }).eq('id', s.id);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  const simpleSettings = settings.filter(s => s.broadcast_mode === null);

  return (
    <div>
      <PageHeader title="الإعدادات" subtitle="الأسعار والمعدلات" />

      <div className="px-4 pb-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted rounded-2xl animate-pulse" />)}
          </div>
        ) : (
          <div className="space-y-5">
            {/* Pricing card */}
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b bg-muted/40">
                <div className="flex items-center justify-end gap-2">
                  <h2 className="font-bold text-sm">أسعار الأحداث ({CURRENCY})</h2>
                  <DollarSign size={16} className="text-[#008D8B]" />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 text-right">
                  حدّد سعر الدفع لكل حدث لحساب مكافأتك الشهرية.
                </p>
              </div>

              <div className="divide-y">
                {simpleSettings.map(s => (
                  <div key={s.id} className="px-4 py-4 flex items-center gap-4">
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-xs text-muted-foreground font-medium">{CURRENCY}</span>
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        value={getRateValue(s.category as Category, null)}
                        onChange={e => setRateValue(s.category as Category, null, e.target.value)}
                        className="w-24 h-10 text-center font-bold"
                        dir="ltr"
                      />
                    </div>
                    <div className="flex-1 text-right">
                      <Label className="text-sm font-bold">{CATEGORY_LABELS[s.category as Category]}</Label>
                      <p className="text-xs text-muted-foreground">لكل حدث حضرته</p>
                    </div>
                    <span className="text-2xl">{CATEGORY_ICONS[s.category as Category]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Hint */}
            <div className="bg-[#008D8B]/5 border border-[#008D8B]/20 rounded-2xl px-4 py-3">
              <p className="text-xs text-[#008D8B] font-semibold text-right">
                💡 يمكن ضبط معدلات المباشر والتسجيل بشكل منفصل لاحقاً. هيكل البيانات جاهز لذلك.
              </p>
            </div>

            <Button
              onClick={handleSave}
              disabled={saving}
              className={cn(
                'w-full h-12 rounded-xl text-base font-bold transition-colors',
                saved
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  : 'bg-[#008D8B] hover:bg-[#007a78] text-white'
              )}
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <RefreshCw size={16} className="animate-spin" />
                  جارٍ الحفظ…
                </span>
              ) : saved ? '✓ تم الحفظ' : (
                <span className="flex items-center gap-2">
                  <Save size={16} />
                  حفظ الأسعار
                </span>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
