'use client';

import { useState, useMemo } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  Trash2,
  Brain,
  X,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
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

const categoryColors: Record<MemoryCategory, string> = {
  general: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  preference: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  fact: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  medical: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  financial: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  contact: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
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
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Memory</h1>
          <p className="text-sm text-muted-foreground mt-1">
            What the AI knows about you. You are always in control.
          </p>
        </div>
        <Button onClick={openDialog} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Add Memory
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search memories..."
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
        onValueChange={(v) => setActiveCategory(v as MemoryCategory | 'all')}
        className="mb-6"
      >
        <TabsList className="flex-wrap">
          {CATEGORY_TABS.map((cat) => (
            <TabsTrigger key={cat.value} value={cat.value}>
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Memory Cards */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
            <Brain className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-medium mb-1">
            {memories.length === 0
              ? "I don't have any memories yet"
              : 'No memories match your search'}
          </h2>
          <p className="text-sm text-muted-foreground max-w-md">
            {memories.length === 0
              ? 'As we work together, I\'ll remember important details to make calls more effective. You can also teach me things manually.'
              : 'Try adjusting your search or filter to find what you\'re looking for.'}
          </p>
          {memories.length === 0 && (
            <Button onClick={openDialog} variant="outline" className="mt-4 gap-1.5">
              <Plus className="h-4 w-4" />
              Teach me something
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((memory) => (
            <Card
              key={memory.id}
              className="transition-all duration-200 hover:shadow-md group"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium text-sm">{memory.key}</span>
                      <Badge
                        variant="secondary"
                        className={cn(
                          'text-[10px] px-1.5 py-0 border-0',
                          categoryColors[memory.category]
                        )}
                      >
                        {categoryLabels[memory.category]}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {memory.value}
                    </p>

                    {/* Confidence + Source row */}
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Confidence:</span>
                        <div className="w-16">
                          <Progress value={memory.confidence * 100} className="h-1.5" />
                        </div>
                        <span>{confidenceLabel(memory.confidence)}</span>
                      </div>
                      {memory.source && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <ExternalLink className="h-3 w-3" />
                          <span className="truncate max-w-[120px]">{memory.source}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Forget Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 h-8 px-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(memory.id)}
                    disabled={deletingId === memory.id}
                    title="Forget this memory"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    <span className="text-xs">Forget</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Memory Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Teach Me Something</DialogTitle>
            <DialogDescription>
              Add a detail you would like me to remember for future calls.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Label <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. Preferred pharmacy, Doctor's name"
                value={form.key}
                onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Value <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. CVS on Main Street, Dr. Sarah Johnson"
                value={form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Category</label>
              <select
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value as MemoryCategory }))
                }
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={saving}>
              {saving ? 'Saving...' : 'Save Memory'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
