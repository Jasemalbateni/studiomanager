'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Phone, Users, Pencil, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PageHeader } from '@/components/layout/page-header';
import { Technician } from '@/types';
import { cn } from '@/lib/utils';
import { TechnicianForm } from '@/components/technicians/technician-form';
import { TECHNICIAN_STATUS_COLORS, TECHNICIAN_STATUS_LABELS } from '@/lib/constants';

export default function TechniciansPage() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTech, setEditingTech] = useState<Technician | null>(null);
  const supabase = createClient();

  useEffect(() => { loadTechnicians(); }, []);

  async function loadTechnicians() {
    const { data } = await supabase.from('technicians').select('*').order('name', { ascending: true });
    setTechnicians(data ?? []);
    setLoading(false);
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`هل تريد حذف ${name} من قائمة الفنيين؟`)) return;
    await supabase.from('technicians').delete().eq('id', id);
    setTechnicians(prev => prev.filter(t => t.id !== id));
  }

  // Arabic role → color mapping
  const ROLE_COLORS: Record<string, string> = {
    'مصور':      'bg-blue-100 text-blue-700',
    'فني الصوت': 'bg-purple-100 text-purple-700',
    'مونتاج':    'bg-pink-100 text-pink-700',
    'اوتوكيو':   'bg-cyan-100 text-cyan-700',
    'شاشة':      'bg-yellow-100 text-yellow-700',
    'كابشن':     'bg-orange-100 text-orange-700',
    'مخرج':      'bg-emerald-100 text-emerald-700',
    'سويتشر':    'bg-teal-100 text-teal-700',
    'هندسة':     'bg-indigo-100 text-indigo-700',
    'مذيع':      'bg-rose-100 text-rose-700',
  };

  const getRoleColor = (role: string) => ROLE_COLORS[role] ?? 'bg-gray-100 text-gray-600';

  return (
    <div>
      <PageHeader
        title="الفنيون"
        subtitle={`${technicians.length} فني`}
        action={
          <button
            onClick={() => { setEditingTech(null); setShowForm(true); }}
            className="w-10 h-10 rounded-full bg-[#008D8B] flex items-center justify-center shadow-md active:scale-95 transition-transform"
          >
            <Plus size={22} className="text-white" />
          </button>
        }
      />

      <div className="px-4 pb-4">
        {loading ? (
          <div className="space-y-3 mt-2">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-muted rounded-2xl animate-pulse" />)}
          </div>
        ) : technicians.length === 0 ? (
          <div className="mt-8 text-center py-12">
            <Users size={40} className="text-muted-foreground mx-auto mb-3" />
            <p className="text-base font-bold">لا يوجد فنيون بعد</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">أضف أعضاء فريقك لتعيينهم في الأحداث.</p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 bg-[#008D8B] text-white px-5 py-2.5 rounded-xl text-sm font-bold"
            >
              <Plus size={16} />
              إضافة أول فني
            </button>
          </div>
        ) : (
          <div className="space-y-2 mt-2">
            {technicians.map(tech => (
              <div key={tech.id} className="bg-white rounded-2xl border p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  {/* Actions — on the LEFT in RTL */}
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleDelete(tech.id, tech.name)}
                      className="w-8 h-8 rounded-full border border-red-100 flex items-center justify-center text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                    <button
                      onClick={() => { setEditingTech(tech); setShowForm(true); }}
                      className="w-8 h-8 rounded-full border flex items-center justify-center text-muted-foreground"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>

                  {/* Info */}
                  <Link href={`/technicians/${tech.id}`} className="flex-1 min-w-0 text-right">
                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                      <p className="font-bold text-sm text-foreground">{tech.name}</p>
                      {tech.status !== 'active' && (
                        <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', TECHNICIAN_STATUS_COLORS[tech.status])}>
                          {TECHNICIAN_STATUS_LABELS[tech.status]}
                        </span>
                      )}
                    </div>
                    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', getRoleColor(tech.role))}>
                      {tech.role}
                    </span>
                    {tech.phone && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center justify-end gap-1">
                        {tech.phone}
                        <Phone size={11} />
                      </p>
                    )}
                  </Link>

                  {/* Avatar — on the RIGHT in RTL */}
                  <Link href={`/technicians/${tech.id}`} className="w-11 h-11 rounded-full bg-[#9EB2A6] flex items-center justify-center text-white font-extrabold text-base flex-shrink-0">
                    {tech.name.charAt(0)}
                  </Link>
                </div>
                {tech.notes && (
                  <p className="text-xs text-muted-foreground mt-2 pe-14 text-right">{tech.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <TechnicianForm
          initial={editingTech}
          onClose={() => { setShowForm(false); setEditingTech(null); }}
          onSaved={() => { setShowForm(false); setEditingTech(null); loadTechnicians(); }}
        />
      )}
    </div>
  );
}
