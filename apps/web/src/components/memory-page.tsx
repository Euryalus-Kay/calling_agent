'use client';

import { useState, useMemo } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Search,
  Plus,
  Trash2,
  Brain,
  X,
  ExternalLink,
} from 'lucide-react';
import type { UserMemory } from '@/types';

interface MemoryPageProps {
  memories: UserMemory[];
  userId: string;
}

type MemoryCategory = UserMemory['category'];

const CATEGORY_TABS: { value: MemoryCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'preference', label: 'Preferences' },
  { value: 'fact', label: 'Facts' },
  { value: 'medical', label: 'Medical' },
  { value: 'financial', label: 'Financial' },
  { value: 'contact', label: 'Contact' },
  { value: 'general', label: 'General' },
];

const categoryColors: Record<MemoryCategory, { bg: string; text: string }> = {
  general: { bg: 'rgba(120,119,116,0.06)', text: '#787774' },
  preference: { bg: 'rgba(120,119,116,0.08)', text: '#787774' },
  fact: { bg: 'rgba(35,131,226,0.06)', text: '#2383E2' },
  medical: { bg: 'rgba(235,87,87,0.06)', text: '#EB5757' },
  financial: { bg: 'rgba(77,171,154,0.06)', text: '#4DAB9A' },
  contact: { bg: 'rgba(203,145,47,0.06)', text: '#CB912F' },
};

const categoryLabels: Record<MemoryCategory, string> = {
  general: 'General',
  preference: 'Preference',
  fact: 'Fact',
  medical: 'Medical',
  financial: 'Financial',
  contact: 'Contact',
};

const emptyForm = {
  key: '',
  value: '',
  category: 'general' as MemoryCategory,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 36,
  padding: '0 12px',
  fontSize: 14,
  color: '#37352F',
  background: '#FFFFFF',
  border: '1px solid #E3E2DE',
  borderRadius: 8,
  outline: 'none',
  boxSizing: 'border-box',
};

function handleFocus(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = '#2383E2';
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(35,131,226,0.15)';
}

function handleBlur(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = '#E3E2DE';
  e.currentTarget.style.boxShadow = 'none';
}

export function MemoryPage({ memories: initial, userId }: MemoryPageProps) {
  const supabase = createSupabaseBrowserClient();
  const [memories, setMemories] = useState<UserMemory[]>(initial);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<MemoryCategory | 'all'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = memories;
    if (activeCategory !== 'all') {
      result = result.filter((m) => m.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.key.toLowerCase().includes(q) ||
          m.value.toLowerCase().includes(q)
      );
    }
    return result;
  }, [memories, search, activeCategory]);

  function openDialog() {
    setForm(emptyForm);
    setDialogOpen(true);
  }

  async function handleAdd() {
    if (!form.key.trim() || !form.value.trim()) {
      toast.error('Both a label and value are required');
      return;
    }
    setSaving(true);

    const payload = {
      user_id: userId,
      key: form.key.trim(),
      value: form.value.trim(),
      category: form.category,
      confidence: 1.0,
      source: 'manual',
      use_count: 0,
    };

    const { data, error } = await supabase
      .from('user_memories')
      .insert(payload)
      .select()
      .single();

    if (error || !data) {
      toast.error('Failed to save memory');
    } else {
      setMemories((prev) => [data, ...prev]);
      setDialogOpen(false);
      toast.success('Memory saved');
    }
    setSaving(false);
  }

  async function handleDelete(memoryId: string) {
    setDeletingId(memoryId);
    const original = memories.find((m) => m.id === memoryId);

    // Optimistic
    setMemories((prev) => prev.filter((m) => m.id !== memoryId));
    toast.success('Memory forgotten');

    const { error } = await supabase.from('user_memories').delete().eq('id', memoryId);
    if (error && original) {
      setMemories((prev) => [original, ...prev]);
      toast.error('Failed to delete memory');
    }
    setDeletingId(null);
  }

  function confidenceLabel(confidence: number): string {
    if (confidence >= 0.9) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  }

  return (
    <div style={{ maxWidth: 768, margin: '0 auto', padding: '16px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#37352F', letterSpacing: '-0.01em', margin: 0 }}>Memory</h1>
          <p style={{ fontSize: 14, color: '#787774', marginTop: 4 }}>
            What the AI knows about you. You are always in control.
          </p>
        </div>
        <button
          onClick={openDialog}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            fontSize: 14,
            fontWeight: 500,
            color: '#FFFFFF',
            background: '#2383E2',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          <Plus style={{ height: 16, width: 16 }} />
          Add Memory
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', height: 16, width: 16, color: '#787774' }} />
        <input
          placeholder="Search memories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, paddingLeft: 36, paddingRight: search ? 36 : 12 }}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#787774', padding: 0 }}
          >
            <X style={{ height: 16, width: 16 }} />
          </button>
        )}
      </div>

      {/* Category Tabs */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 24 }}>
        {CATEGORY_TABS.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setActiveCategory(cat.value)}
            style={{
              padding: '4px 12px',
              fontSize: 13,
              fontWeight: activeCategory === cat.value ? 600 : 400,
              color: activeCategory === cat.value ? '#37352F' : '#787774',
              background: activeCategory === cat.value ? '#EFEFEF' : 'transparent',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              transition: 'background 120ms ease',
            }}
            onMouseEnter={(e) => { if (activeCategory !== cat.value) e.currentTarget.style.background = '#EFEFEF'; }}
            onMouseLeave={(e) => { if (activeCategory !== cat.value) e.currentTarget.style.background = 'transparent'; }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Memory Cards */}
      {filtered.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', textAlign: 'center' }}>
          <div style={{ display: 'flex', height: 64, width: 64, alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: '#F7F6F3', marginBottom: 16 }}>
            <Brain style={{ height: 32, width: 32, color: '#787774' }} />
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 500, marginBottom: 4, color: '#37352F' }}>
            {memories.length === 0
              ? "I don't have any memories yet"
              : 'No memories match your search'}
          </h2>
          <p style={{ fontSize: 14, color: '#787774', maxWidth: 400 }}>
            {memories.length === 0
              ? 'As we work together, I\'ll remember important details to make calls more effective. You can also teach me things manually.'
              : 'Try adjusting your search or filter to find what you\'re looking for.'}
          </p>
          {memories.length === 0 && (
            <button
              onClick={openDialog}
              style={{
                marginTop: 16,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                fontSize: 14,
                fontWeight: 500,
                color: '#37352F',
                background: '#FFFFFF',
                border: '1px solid #E3E2DE',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              <Plus style={{ height: 16, width: 16 }} />
              Teach me something
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((memory) => {
            const catColor = categoryColors[memory.category];
            return (
              <div
                key={memory.id}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E3E2DE',
                  borderRadius: 8,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                  padding: 16,
                  transition: 'background 120ms ease',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#F7F6F3';
                  const btn = e.currentTarget.querySelector('[data-forget-btn]') as HTMLElement;
                  if (btn) btn.style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#FFFFFF';
                  const btn = e.currentTarget.querySelector('[data-forget-btn]') as HTMLElement;
                  if (btn) btn.style.opacity = '0';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      <span style={{ fontWeight: 500, fontSize: 14, color: '#37352F' }}>{memory.key}</span>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 500,
                        padding: '1px 6px',
                        borderRadius: 4,
                        background: catColor.bg,
                        color: catColor.text,
                      }}>
                        {categoryLabels[memory.category]}
                      </span>
                    </div>
                    <p style={{ fontSize: 14, color: '#787774', whiteSpace: 'pre-wrap', margin: 0 }}>
                      {memory.value}
                    </p>

                    {/* Confidence + Source row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#787774' }}>
                        <span>Confidence:</span>
                        <div style={{ width: 64, height: 6, background: '#E3E2DE', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${memory.confidence * 100}%`, background: '#2383E2', borderRadius: 3 }} />
                        </div>
                        <span>{confidenceLabel(memory.confidence)}</span>
                      </div>
                      {memory.source && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#787774' }}>
                          <ExternalLink style={{ height: 12, width: 12 }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>{memory.source}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Forget Button */}
                  <button
                    data-forget-btn
                    onClick={() => handleDelete(memory.id)}
                    disabled={deletingId === memory.id}
                    title="Forget this memory"
                    style={{
                      flexShrink: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 10px',
                      fontSize: 12,
                      fontWeight: 500,
                      color: '#787774',
                      background: 'none',
                      border: 'none',
                      borderRadius: 6,
                      cursor: deletingId === memory.id ? 'not-allowed' : 'pointer',
                      opacity: 0,
                      transition: 'opacity 120ms ease, color 120ms ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#EB5757'; e.currentTarget.style.background = 'rgba(235,87,87,0.06)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#787774'; e.currentTarget.style.background = 'none'; }}
                  >
                    <Trash2 style={{ height: 14, width: 14 }} />
                    <span>Forget</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Memory Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent style={{ borderRadius: 8, border: '1px solid #E3E2DE', boxShadow: '0 1px 2px rgba(0,0,0,0.06)', background: '#FFFFFF' }}>
          <DialogHeader>
            <DialogTitle style={{ fontSize: 18, fontWeight: 600, color: '#37352F' }}>Teach Me Something</DialogTitle>
            <DialogDescription style={{ fontSize: 14, color: '#787774' }}>
              Add a detail you would like me to remember for future calls.
            </DialogDescription>
          </DialogHeader>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 6, display: 'block', color: '#37352F' }}>
                Label <span style={{ color: '#EB5757' }}>*</span>
              </label>
              <input
                placeholder="e.g. Preferred pharmacy, Doctor's name"
                value={form.key}
                onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
                style={inputStyle}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>

            <div>
              <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 6, display: 'block', color: '#37352F' }}>
                Value <span style={{ color: '#EB5757' }}>*</span>
              </label>
              <input
                placeholder="e.g. CVS on Main Street, Dr. Sarah Johnson"
                value={form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                style={inputStyle}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>

            <div>
              <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 6, display: 'block', color: '#37352F' }}>Category</label>
              <select
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value as MemoryCategory }))
                }
                style={{ ...inputStyle, appearance: 'auto' as const }}
                onFocus={handleFocus as any}
                onBlur={handleBlur as any}
              >
                <option value="general">General</option>
                <option value="preference">Preference</option>
                <option value="fact">Fact</option>
                <option value="medical">Medical</option>
                <option value="financial">Financial</option>
                <option value="contact">Contact</option>
              </select>
            </div>
          </div>

          <DialogFooter style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <button
              onClick={() => setDialogOpen(false)}
              style={{
                padding: '6px 14px',
                fontSize: 14,
                fontWeight: 500,
                color: '#37352F',
                background: '#FFFFFF',
                border: '1px solid #E3E2DE',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={saving}
              style={{
                padding: '6px 14px',
                fontSize: 14,
                fontWeight: 500,
                color: '#FFFFFF',
                background: '#2383E2',
                border: 'none',
                borderRadius: 8,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Saving...' : 'Save Memory'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
