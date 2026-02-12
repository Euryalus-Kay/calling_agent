'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { cn } from '@/lib/utils';
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

const categoryColors: Record<TemplateCategory, string> = {
  appointment:
    'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  inquiry:
    'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  reservation:
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  general:
    'bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300',
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
    <div className="mx-auto max-w-4xl p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Templates</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Save and reuse common calling tasks.
          </p>
        </div>
        <Button onClick={openAddDialog} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Add Template
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search templates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Category Tabs */}
      <Tabs
        value={activeCategory}
        onValueChange={(v) => setActiveCategory(v as TemplateCategory | 'all')}
        className="mb-6"
      >
        <TabsList className="flex-wrap">
          {CATEGORIES.map((cat) => (
            <TabsTrigger key={cat.value} value={cat.value}>
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Template Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
            <ClipboardList className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-medium mb-1">
            {templates.length === 0
              ? 'No templates yet'
              : 'No templates match your search'}
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            {templates.length === 0
              ? 'Create your first template to quickly reuse common calling tasks like booking appointments or checking store hours.'
              : 'Try adjusting your search or category filter to find what you are looking for.'}
          </p>
          {templates.length === 0 && (
            <Button onClick={openAddDialog} variant="outline" className="mt-4 gap-1.5">
              <Plus className="h-4 w-4" />
              Create your first template
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((template) => {
            const Icon = getIcon(template);
            const category = (template.category as TemplateCategory) || 'general';

            return (
              <Card
                key={template.id}
                className="transition-all duration-200 hover:shadow-md group"
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {template.title}
                        </span>
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-[10px] px-1.5 py-0 border-0 shrink-0',
                            categoryColors[category]
                          )}
                        >
                          {category}
                        </Badge>
                      </div>

                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {template.description}
                      </p>

                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <TrendingUp className="h-3 w-3" />
                          <span>
                            Used {template.use_count}{' '}
                            {template.use_count === 1 ? 'time' : 'times'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {template.user_id === userId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(template.id);
                              }}
                            >
                              Delete
                            </Button>
                          )}
                          <Button
                            size="sm"
                            className="h-7 gap-1 text-xs"
                            onClick={() => handleUseTemplate(template)}
                          >
                            Use Template
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Template Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Template</DialogTitle>
            <DialogDescription>
              Create a reusable template for a common calling task.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Title <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. Book doctor appointment"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Description <span className="text-destructive">*</span>
              </label>
              <Textarea
                placeholder="Describe what this call should accomplish. This will be used as the task input when you use this template."
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={4}
              />
            </div>

            {/* Category */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Category</label>
              <select
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value as TemplateCategory }))
                }
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="appointment">Appointment</option>
                <option value="inquiry">Inquiry</option>
                <option value="reservation">Reservation</option>
                <option value="general">General</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? 'Creating...' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
