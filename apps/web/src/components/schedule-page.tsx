'use client';

import { useState, useMemo } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Plus,
  Calendar,
  Clock,
  Repeat,
  XCircle,
  CheckCircle2,
  CalendarClock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScheduledTask } from '@/types';

interface SchedulePageProps {
  scheduledTasks: ScheduledTask[];
  userId: string;
}

type Recurrence = ScheduledTask['recurrence'];

const recurrenceLabels: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

const statusConfig: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; icon: React.ElementType }
> = {
  pending: { label: 'Pending', variant: 'outline', icon: Clock },
  executed: { label: 'Completed', variant: 'secondary', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', variant: 'destructive', icon: XCircle },
};

function formatScheduledTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 0) {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }) + ' at ' + timeStr;
    }
    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return diffMinutes <= 0 ? 'Just now' : `In ${diffMinutes} min`;
    }
    return `Today at ${timeStr}`;
  }
  if (diffDays === 1) {
    return `Tomorrow at ${timeStr}`;
  }
  if (diffDays > 1 && diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'long' }) + ` at ${timeStr}`;
  }
  return (
    date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }) + ` at ${timeStr}`
  );
}

function getDefaultDateTime(): string {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

const emptyForm = {
  title: '',
  description: '',
  scheduled_for: getDefaultDateTime(),
  recurrence: null as Recurrence,
};

export function SchedulePage({ scheduledTasks: initial, userId }: SchedulePageProps) {
  const supabase = createSupabaseBrowserClient();
  const [tasks, setTasks] = useState<ScheduledTask[]>(initial);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const now = new Date();

  const { upcoming, past } = useMemo(() => {
    const upcoming: ScheduledTask[] = [];
    const past: ScheduledTask[] = [];

    tasks.forEach((t) => {
      const scheduledDate = new Date(t.scheduled_for);
      if (t.status === 'pending' && scheduledDate > now) {
        upcoming.push(t);
      } else {
        past.push(t);
      }
    });

    upcoming.sort((a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime());
    past.sort((a, b) => new Date(b.scheduled_for).getTime() - new Date(a.scheduled_for).getTime());

    return { upcoming, past };
  }, [tasks]);

  function openDialog() {
    setForm({ ...emptyForm, scheduled_for: getDefaultDateTime() });
    setDialogOpen(true);
  }

  async function handleCreate() {
    if (!form.title.trim()) {
      toast.error('A title is required');
      return;
    }
    setSaving(true);

    const payload = {
      user_id: userId,
      title: form.title.trim(),
      description: form.description.trim(),
      scheduled_for: new Date(form.scheduled_for).toISOString(),
      recurrence: form.recurrence,
      status: 'pending' as const,
    };

    const { data, error } = await supabase
      .from('scheduled_tasks')
      .insert(payload)
      .select()
      .single();

    if (error || !data) {
      toast.error('Failed to schedule task');
    } else {
      setTasks((prev) => [...prev, data]);
      setDialogOpen(false);
      toast.success('Scheduled successfully');
    }
    setSaving(false);
  }

  async function handleCancel(taskId: string) {
    setCancellingId(taskId);
    const original = tasks.find((t) => t.id === taskId);

    // Optimistic
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: 'cancelled' as const } : t))
    );
    toast.success('Schedule cancelled');

    const { error } = await supabase
      .from('scheduled_tasks')
      .update({ status: 'cancelled' })
      .eq('id', taskId);

    if (error && original) {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? original : t)));
      toast.error('Failed to cancel');
    }
    setCancellingId(null);
  }

  function renderTaskCard(task: ScheduledTask, isPast: boolean) {
    const config = statusConfig[task.status] || statusConfig.pending;
    const StatusIcon = config.icon;

    return (
      <Card
        key={task.id}
        className={cn(
          'transition-all duration-200',
          isPast && 'opacity-60'
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div
                className={cn(
                  'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                  task.status === 'pending'
                    ? 'bg-primary/10 text-primary'
                    : task.status === 'executed'
                      ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-muted text-muted-foreground'
                )}
              >
                <StatusIcon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{task.title}</span>
                  {task.recurrence && (
                    <Badge variant="secondary" className="text-[10px] gap-1 px-1.5 py-0">
                      <Repeat className="h-2.5 w-2.5" />
                      {recurrenceLabels[task.recurrence]}
                    </Badge>
                  )}
                </div>
                {task.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {task.description}
                  </p>
                )}
                <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>{formatScheduledTime(task.scheduled_for)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Badge variant={config.variant} className="text-xs">
                {config.label}
              </Badge>
              {task.status === 'pending' && !isPast && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => handleCancel(task.id)}
                  disabled={cancellingId === task.id}
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasAny = tasks.length > 0;

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Schedule</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your upcoming and past scheduled calls.
          </p>
        </div>
        <Button onClick={openDialog} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Schedule New
        </Button>
      </div>

      {!hasAny ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
            <CalendarClock className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-medium mb-1">Nothing scheduled yet</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            You can schedule calls to be made automatically. Set a time and we will handle the rest.
          </p>
          <Button onClick={openDialog} variant="outline" className="mt-4 gap-1.5">
            <Plus className="h-4 w-4" />
            Schedule your first call
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Upcoming
              </h2>
              <div className="space-y-3">
                {upcoming.map((t) => renderTaskCard(t, false))}
              </div>
            </section>
          )}

          {/* Past */}
          {past.length > 0 && (
            <section>
              {upcoming.length > 0 && <Separator className="mb-6" />}
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Past
              </h2>
              <div className="space-y-3">
                {past.map((t) => renderTaskCard(t, true))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Schedule Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule a Call</DialogTitle>
            <DialogDescription>
              Set a time and we will make the call for you automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Title <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. Call dentist to reschedule"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Description</label>
              <Textarea
                placeholder="What should the call accomplish?"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Date & Time</label>
                <input
                  type="datetime-local"
                  value={form.scheduled_for}
                  onChange={(e) => setForm((f) => ({ ...f, scheduled_for: e.target.value }))}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Repeat</label>
                <select
                  value={form.recurrence || ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      recurrence: (e.target.value || null) as Recurrence,
                    }))
                  }
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">No repeat</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? 'Scheduling...' : 'Schedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
