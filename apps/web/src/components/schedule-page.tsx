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
  Plus,
  Calendar,
  Clock,
  Repeat,
  XCircle,
  CheckCircle2,
  CalendarClock,
} from 'lucide-react';
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
  { label: string; color: string; bgColor: string; icon: React.ElementType }
> = {
  pending: { label: 'Pending', color: '#787774', bgColor: 'rgba(120,119,116,0.06)', icon: Clock },
  executed: { label: 'Completed', color: '#4DAB9A', bgColor: 'rgba(77,171,154,0.06)', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: '#EB5757', bgColor: 'rgba(235,87,87,0.06)', icon: XCircle },
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
      <div
        key={task.id}
        style={{
          background: '#FFFFFF',
          border: '1px solid #E3E2DE',
          borderRadius: 8,
          boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
          padding: 16,
          opacity: isPast ? 0.6 : 1,
          transition: 'opacity 200ms ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, minWidth: 0, flex: 1 }}>
            <div
              style={{
                marginTop: 2,
                display: 'flex',
                height: 36,
                width: 36,
                flexShrink: 0,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 8,
                background: task.status === 'pending'
                  ? 'rgba(35,131,226,0.08)'
                  : task.status === 'executed'
                    ? 'rgba(77,171,154,0.08)'
                    : 'rgba(120,119,116,0.06)',
                color: task.status === 'pending'
                  ? '#2383E2'
                  : task.status === 'executed'
                    ? '#4DAB9A'
                    : '#787774',
              }}
            >
              <StatusIcon style={{ height: 16, width: 16 }} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 500, fontSize: 14, color: '#37352F' }}>{task.title}</span>
                {task.recurrence && (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 10,
                    fontWeight: 500,
                    padding: '1px 6px',
                    borderRadius: 4,
                    background: '#F7F6F3',
                    color: '#787774',
                  }}>
                    <Repeat style={{ height: 10, width: 10 }} />
                    {recurrenceLabels[task.recurrence]}
                  </span>
                )}
              </div>
              {task.description && (
                <p style={{ fontSize: 12, color: '#787774', marginTop: 4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', margin: '4px 0 0' }}>
                  {task.description}
                </p>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 12, color: '#787774' }}>
                <Calendar style={{ height: 12, width: 12 }} />
                <span>{formatScheduledTime(task.scheduled_for)}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{
              fontSize: 12,
              fontWeight: 500,
              padding: '2px 8px',
              borderRadius: 6,
              background: config.bgColor,
              color: config.color,
            }}>
              {config.label}
            </span>
            {task.status === 'pending' && !isPast && (
              <button
                onClick={() => handleCancel(task.id)}
                disabled={cancellingId === task.id}
                style={{
                  padding: '3px 8px',
                  fontSize: 12,
                  fontWeight: 500,
                  color: '#787774',
                  background: 'none',
                  border: 'none',
                  borderRadius: 6,
                  cursor: cancellingId === task.id ? 'not-allowed' : 'pointer',
                  transition: 'color 120ms ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#EB5757'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#787774'; }}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const hasAny = tasks.length > 0;

  return (
    <div style={{ maxWidth: 672, margin: '0 auto', padding: '16px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#37352F', letterSpacing: '-0.01em', margin: 0 }}>Schedule</h1>
          <p style={{ fontSize: 14, color: '#787774', marginTop: 4 }}>
            Manage your upcoming and past scheduled calls.
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
          Schedule New
        </button>
      </div>

      {!hasAny ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', textAlign: 'center' }}>
          <div style={{ display: 'flex', height: 64, width: 64, alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: '#F7F6F3', marginBottom: 16 }}>
            <CalendarClock style={{ height: 32, width: 32, color: '#787774' }} />
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 500, marginBottom: 4, color: '#37352F' }}>Nothing scheduled yet</h2>
          <p style={{ fontSize: 14, color: '#787774', maxWidth: 360 }}>
            You can schedule calls to be made automatically. Set a time and we will handle the rest.
          </p>
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
            Schedule your first call
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <section>
              <h2 style={{ fontSize: 11, fontWeight: 600, color: '#787774', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                Upcoming
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {upcoming.map((t) => renderTaskCard(t, false))}
              </div>
            </section>
          )}

          {/* Past */}
          {past.length > 0 && (
            <section>
              {upcoming.length > 0 && <div style={{ height: 1, background: '#E3E2DE', marginBottom: 24 }} />}
              <h2 style={{ fontSize: 11, fontWeight: 600, color: '#787774', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                Past
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {past.map((t) => renderTaskCard(t, true))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Schedule Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent style={{ borderRadius: 8, border: '1px solid #E3E2DE', boxShadow: '0 1px 2px rgba(0,0,0,0.06)', background: '#FFFFFF' }}>
          <DialogHeader>
            <DialogTitle style={{ fontSize: 18, fontWeight: 600, color: '#37352F' }}>Schedule a Call</DialogTitle>
            <DialogDescription style={{ fontSize: 14, color: '#787774' }}>
              Set a time and we will make the call for you automatically.
            </DialogDescription>
          </DialogHeader>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 6, display: 'block', color: '#37352F' }}>
                Title <span style={{ color: '#EB5757' }}>*</span>
              </label>
              <input
                placeholder="e.g. Call dentist to reschedule"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                style={inputStyle}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>

            <div>
              <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 6, display: 'block', color: '#37352F' }}>Description</label>
              <textarea
                placeholder="What should the call accomplish?"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                style={textareaStyle}
                onFocus={handleFocus as any}
                onBlur={handleBlur as any}
              />
            </div>

            <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr' }}>
              <div>
                <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 6, display: 'block', color: '#37352F' }}>Date & Time</label>
                <input
                  type="datetime-local"
                  value={form.scheduled_for}
                  onChange={(e) => setForm((f) => ({ ...f, scheduled_for: e.target.value }))}
                  style={inputStyle}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                />
              </div>
              <div>
                <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 6, display: 'block', color: '#37352F' }}>Repeat</label>
                <select
                  value={form.recurrence || ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      recurrence: (e.target.value || null) as Recurrence,
                    }))
                  }
                  style={{ ...inputStyle, appearance: 'auto' as const }}
                  onFocus={handleFocus as any}
                  onBlur={handleBlur as any}
                >
                  <option value="">No repeat</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
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
              {saving ? 'Scheduling...' : 'Schedule'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
