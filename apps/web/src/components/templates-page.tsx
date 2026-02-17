'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
  X,
  CalendarCheck,
  HelpCircle,
  Utensils,
  LayoutGrid,
  Phone,
  ClipboardList,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import type { TaskTemplate } from '@/types';

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

type TemplateCategory = 'appointment' | 'inquiry' | 'reservation' | 'general';

const CATEGORIES: { value: TemplateCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'appointment', label: 'Appointment' },
  { value: 'inquiry', label: 'Inquiry' },
  { value: 'reservation', label: 'Reservation' },
  { value: 'general', label: 'General' },
];

const categoryColors: Record<TemplateCategory, { bg: string; text: string }> = {
  appointment: { bg: 'rgba(35,131,226,0.06)', text: '#2383E2' },
  inquiry: { bg: 'rgba(203,145,47,0.06)', text: '#CB912F' },
  reservation: { bg: 'rgba(77,171,154,0.06)', text: '#4DAB9A' },
  general: { bg: 'rgba(120,119,116,0.06)', text: '#787774' },
};

const categoryIcons: Record<TemplateCategory, React.ElementType> = {
  appointment: CalendarCheck,
  inquiry: HelpCircle,
  reservation: Utensils,
  general: Phone,
};

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

interface TemplatesPageProps {
  templates: TaskTemplate[];
  userId: string;
}

const emptyForm = {
  title: '',
  description: '',
  category: 'general' as TemplateCategory,
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

const textareaStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  fontSize: 14,
  color: '#37352F',
  background: '#FFFFFF',
  border: '1px solid #E3E2DE',
  borderRadius: 8,
  outline: 'none',
  resize: 'vertical',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};

function handleFocus(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = '#2383E2';
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(35,131,226,0.15)';
}

function handleBlur(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = '#E3E2DE';
  e.currentTarget.style.boxShadow = 'none';
}

export function TemplatesPage({ templates: initialTemplates, userId }: TemplatesPageProps) {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  const [templates, setTemplates] = useState<TaskTemplate[]>(initialTemplates);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<TemplateCategory | 'all'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  /* ---- Filtering ---- */
  const filtered = useMemo(() => {
    let result = templates;

    if (activeCategory !== 'all') {
      result = result.filter((t) => t.category === activeCategory);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q)
      );
    }

    return result;
  }, [templates, search, activeCategory]);

  /* ---- Dialog helpers ---- */
  const openAddDialog = useCallback(() => {
    setForm(emptyForm);
    setDialogOpen(true);
  }, []);

  /* ---- Use template ---- */
  function handleUseTemplate(template: TaskTemplate) {
    // Optimistically bump use_count in the UI
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === template.id ? { ...t, use_count: t.use_count + 1 } : t
      )
    );

    // Fire-and-forget: increment use_count in the database
    supabase
      .from('task_templates')
      .update({ use_count: template.use_count + 1 })
      .eq('id', template.id)
      .then();

    router.push(`/?template=${encodeURIComponent(template.description)}`);
  }

  /* ---- Create template ---- */
  async function handleCreate() {
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!form.description.trim()) {
      toast.error('Description is required');
      return;
    }

    setSaving(true);

    const payload = {
      user_id: userId,
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      icon: null,
      is_public: false,
      use_count: 0,
    };

    const { data, error } = await supabase
      .from('task_templates')
      .insert(payload)
      .select()
      .single();

    if (error || !data) {
      toast.error('Failed to create template');
    } else {
      setTemplates((prev) => [data, ...prev]);
      setDialogOpen(false);
      toast.success('Template created');
    }

    setSaving(false);
  }

  /* ---- Delete template ---- */
  async function handleDelete(templateId: string) {
    const original = templates.find((t) => t.id === templateId);
    // Optimistic removal
    setTemplates((prev) => prev.filter((t) => t.id !== templateId));
    toast.success('Template deleted');

    const { error } = await supabase
      .from('task_templates')
      .delete()
      .eq('id', templateId);

    if (error && original) {
      setTemplates((prev) =>
        [...prev, original].sort((a, b) => b.use_count - a.use_count)
      );
      toast.error('Failed to delete template');
    }
  }

  /* ---- Render helpers ---- */
  function getIcon(template: TaskTemplate) {
    const category = (template.category as TemplateCategory) || 'general';
    const Icon = categoryIcons[category] || Phone;
    return Icon;
  }

  return (
    <div style={{ maxWidth: 896, margin: '0 auto', padding: '16px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#37352F', letterSpacing: '-0.01em', margin: 0 }}>Templates</h1>
          <p style={{ fontSize: 14, color: '#787774', marginTop: 4 }}>
            Save and reuse common calling tasks.
          </p>
        </div>
        <button
          onClick={openAddDialog}
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
          Add Template
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', height: 16, width: 16, color: '#787774' }} />
        <input
          placeholder="Search templates..."
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
        {CATEGORIES.map((cat) => (
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

      {/* Template Grid */}
      {filtered.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', textAlign: 'center' }}>
          <div style={{ display: 'flex', height: 64, width: 64, alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: '#F7F6F3', marginBottom: 16 }}>
            <ClipboardList style={{ height: 32, width: 32, color: '#787774' }} />
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 500, marginBottom: 4, color: '#37352F' }}>
            {templates.length === 0
              ? 'No templates yet'
              : 'No templates match your search'}
          </h2>
          <p style={{ fontSize: 14, color: '#787774', maxWidth: 360 }}>
            {templates.length === 0
              ? 'Create your first template to quickly reuse common calling tasks like booking appointments or checking store hours.'
              : 'Try adjusting your search or category filter to find what you are looking for.'}
          </p>
          {templates.length === 0 && (
            <button
              onClick={openAddDialog}
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
              Create your first template
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))' }}>
          {filtered.map((template) => {
            const Icon = getIcon(template);
            const category = (template.category as TemplateCategory) || 'general';
            const catColor = categoryColors[category];

            return (
              <div
                key={template.id}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E3E2DE',
                  borderRadius: 8,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                  padding: 16,
                  transition: 'background 120ms ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#F7F6F3'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#FFFFFF'; }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  {/* Icon */}
                  <div style={{
                    display: 'flex',
                    height: 40,
                    width: 40,
                    flexShrink: 0,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 8,
                    background: 'rgba(35,131,226,0.08)',
                    color: '#2383E2',
                  }}>
                    <Icon style={{ height: 20, width: 20 }} />
                  </div>

                  {/* Content */}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 500, fontSize: 14, color: '#37352F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {template.title}
                      </span>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 500,
                        padding: '1px 6px',
                        borderRadius: 4,
                        flexShrink: 0,
                        background: catColor.bg,
                        color: catColor.text,
                      }}>
                        {category}
                      </span>
                    </div>

                    <p style={{ fontSize: 12, color: '#787774', marginTop: 4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', margin: '4px 0 0' }}>
                      {template.description}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#787774' }}>
                        <TrendingUp style={{ height: 12, width: 12 }} />
                        <span>
                          Used {template.use_count}{' '}
                          {template.use_count === 1 ? 'time' : 'times'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {template.user_id === userId && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(template.id);
                            }}
                            style={{
                              padding: '3px 8px',
                              fontSize: 12,
                              fontWeight: 500,
                              color: '#787774',
                              background: 'none',
                              border: 'none',
                              borderRadius: 6,
                              cursor: 'pointer',
                              transition: 'color 120ms ease',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = '#EB5757'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = '#787774'; }}
                          >
                            Delete
                          </button>
                        )}
                        <button
                          onClick={() => handleUseTemplate(template)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '4px 10px',
                            fontSize: 12,
                            fontWeight: 500,
                            color: '#FFFFFF',
                            background: '#2383E2',
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'pointer',
                          }}
                        >
                          Use Template
                          <ArrowRight style={{ height: 12, width: 12 }} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Template Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent style={{ maxHeight: '90vh', overflow: 'auto', borderRadius: 8, border: '1px solid #E3E2DE', boxShadow: '0 1px 2px rgba(0,0,0,0.06)', background: '#FFFFFF' }}>
          <DialogHeader>
            <DialogTitle style={{ fontSize: 18, fontWeight: 600, color: '#37352F' }}>Add Template</DialogTitle>
            <DialogDescription style={{ fontSize: 14, color: '#787774' }}>
              Create a reusable template for a common calling task.
            </DialogDescription>
          </DialogHeader>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Title */}
            <div>
              <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 6, display: 'block', color: '#37352F' }}>
                Title <span style={{ color: '#EB5757' }}>*</span>
              </label>
              <input
                placeholder="e.g. Book doctor appointment"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                style={inputStyle}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>

            {/* Description */}
            <div>
              <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 6, display: 'block', color: '#37352F' }}>
                Description <span style={{ color: '#EB5757' }}>*</span>
              </label>
              <textarea
                placeholder="Describe what this call should accomplish. This will be used as the task input when you use this template."
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={4}
                style={textareaStyle}
                onFocus={handleFocus as any}
                onBlur={handleBlur as any}
              />
            </div>

            {/* Category */}
            <div>
              <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 6, display: 'block', color: '#37352F' }}>Category</label>
              <select
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value as TemplateCategory }))
                }
                style={{ ...inputStyle, appearance: 'auto' as const }}
                onFocus={handleFocus as any}
                onBlur={handleBlur as any}
              >
                <option value="appointment">Appointment</option>
                <option value="inquiry">Inquiry</option>
                <option value="reservation">Reservation</option>
                <option value="general">General</option>
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
              onClick={handleCreate}
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
              {saving ? 'Creating...' : 'Create Template'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
