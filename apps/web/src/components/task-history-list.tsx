'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Phone,
  CheckCircle,
  Loader2,
  AlertCircle,
  Clock,
  Search,
  X,
  ArrowUpRight,
  Star,
  PhoneOff,
  StopCircle,
} from 'lucide-react';
import type { Task } from '@/types';

const statusConfig: Record<
  string,
  { label: string; color: string; bgColor: string; icon: React.ElementType }
> = {
  planning: {
    label: 'Planning',
    color: '#CB912F',
    bgColor: 'rgba(203,145,47,0.06)',
    icon: Loader2,
  },
  ready: {
    label: 'Ready',
    color: '#2383E2',
    bgColor: 'rgba(35,131,226,0.06)',
    icon: Phone,
  },
  in_progress: {
    label: 'In Progress',
    color: '#4DAB9A',
    bgColor: 'rgba(77,171,154,0.06)',
    icon: Loader2,
  },
  completed: {
    label: 'Completed',
    color: '#4DAB9A',
    bgColor: 'rgba(77,171,154,0.06)',
    icon: CheckCircle,
  },
  failed: {
    label: 'Failed',
    color: '#EB5757',
    bgColor: 'rgba(235,87,87,0.06)',
    icon: AlertCircle,
  },
  cancelled: {
    label: 'Cancelled',
    color: '#787774',
    bgColor: 'rgba(120,119,116,0.06)',
    icon: StopCircle,
  },
};

type FilterTab = 'all' | 'active' | 'completed' | 'failed';

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);

  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

const tabStyle = (active: boolean): React.CSSProperties => ({
  padding: '4px 12px',
  fontSize: 13,
  fontWeight: active ? 600 : 400,
  color: active ? '#37352F' : '#787774',
  background: active ? '#EFEFEF' : 'transparent',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  transition: 'background 120ms ease',
});

export function TaskHistoryList({ tasks: initialTasks }: { tasks: Task[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterTab>('all');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const handleCancel = useCallback(async (taskId: string, e: React.MouseEvent) => {
    e.preventDefault(); // Prevent Link navigation
    e.stopPropagation();

    if (!window.confirm('Cancel this task? Any active calls will be hung up.')) return;

    setCancellingId(taskId);

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: 'failed' as const } : t))
    );

    try {
      const res = await fetch(`/api/tasks/${taskId}/cancel`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to cancel task');
      }

      toast.success('Task cancelled');
    } catch (err) {
      // Revert optimistic update
      setTasks(initialTasks);
      toast.error('Failed to cancel task', {
        description: err instanceof Error ? err.message : 'Please try again',
      });
    } finally {
      setCancellingId(null);
    }
  }, [initialTasks]);

  const filtered = useMemo(() => {
    let result = tasks;

    if (filter === 'active') {
      result = result.filter((t) =>
        ['planning', 'ready', 'in_progress'].includes(t.status)
      );
    } else if (filter === 'completed') {
      result = result.filter((t) => t.status === 'completed');
    } else if (filter === 'failed') {
      result = result.filter((t) => t.status === 'failed');
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.input_text.toLowerCase().includes(q) ||
          t.summary?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [tasks, search, filter]);

  const counts = useMemo(() => ({
    all: tasks.length,
    active: tasks.filter((t) => ['planning', 'ready', 'in_progress'].includes(t.status)).length,
    completed: tasks.filter((t) => t.status === 'completed').length,
    failed: tasks.filter((t) => t.status === 'failed').length,
  }), [tasks]);

  if (tasks.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', textAlign: 'center' }}>
        <div style={{ display: 'flex', height: 64, width: 64, alignItems: 'center', justifyContent: 'center', borderRadius: 16, background: '#F7F6F3', marginBottom: 16 }}>
          <Phone style={{ height: 32, width: 32, color: '#787774' }} />
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4, color: '#37352F' }}>No tasks yet</h2>
        <p style={{ fontSize: 14, color: '#787774', maxWidth: 360 }}>
          Go to the home page and tell me what you need. I&apos;ll plan the calls and get things done.
        </p>
        <Link
          href="/"
          style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#2383E2', textDecoration: 'none' }}
        >
          Start a new task <ArrowUpRight style={{ height: 14, width: 14 }} />
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Search */}
      <div style={{ position: 'relative' }}>
        <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', height: 16, width: 16, color: '#787774' }} />
        <input
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            height: 36,
            paddingLeft: 36,
            paddingRight: search ? 36 : 12,
            fontSize: 14,
            color: '#37352F',
            background: '#FFFFFF',
            border: '1px solid #E3E2DE',
            borderRadius: 8,
            outline: 'none',
            boxSizing: 'border-box',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#2383E2';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(35,131,226,0.15)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#E3E2DE';
            e.currentTarget.style.boxShadow = 'none';
          }}
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

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {([
          { value: 'all' as FilterTab, label: 'All', count: counts.all },
          { value: 'active' as FilterTab, label: 'Active', count: counts.active },
          { value: 'completed' as FilterTab, label: 'Done', count: counts.completed },
          { value: 'failed' as FilterTab, label: 'Failed', count: counts.failed },
        ]).map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            style={tabStyle(filter === tab.value)}
            onMouseEnter={(e) => { if (filter !== tab.value) e.currentTarget.style.background = '#EFEFEF'; }}
            onMouseLeave={(e) => { if (filter !== tab.value) e.currentTarget.style.background = 'transparent'; }}
          >
            {tab.label}
            {tab.count > 0 && (
              <span style={{ marginLeft: 4, fontSize: 12, opacity: 0.6 }}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <p style={{ fontSize: 14, color: '#787774' }}>
            {search ? 'No tasks match your search' : 'No tasks in this category'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((task) => {
            const config = statusConfig[task.status] || statusConfig.planning;
            const StatusIcon = config.icon;
            const isActive = ['planning', 'ready', 'in_progress'].includes(task.status);
            const isCancelling = cancellingId === task.id;

            return (
              <Link key={task.id} href={`/tasks/${task.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E3E2DE',
                    borderRadius: 8,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                    padding: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    cursor: 'pointer',
                    transition: 'background 120ms ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#F7F6F3'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#FFFFFF'; }}
                >
                  {/* Status icon */}
                  <div style={{
                    display: 'flex',
                    height: 40,
                    width: 40,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 8,
                    flexShrink: 0,
                    background: config.bgColor,
                  }}>
                    <StatusIcon
                      style={{
                        height: 16,
                        width: 16,
                        color: config.color,
                      }}
                      className={config.icon === Loader2 ? 'animate-spin' : undefined}
                    />
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <p style={{ fontSize: 14, fontWeight: 500, color: '#37352F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{task.plan?.summary || task.input_text}</p>
                      {task.is_favorite && (
                        <Star style={{ height: 14, width: 14, color: '#CB912F', fill: '#CB912F', flexShrink: 0 }} />
                      )}
                    </div>
                    {task.summary && (
                      <p style={{ fontSize: 12, color: '#787774', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: '2px 0 0' }}>
                        {task.summary}
                      </p>
                    )}
                  </div>

                  {/* Meta */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 12, color: '#787774' }}>
                      {formatDate(task.created_at)}
                    </span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 12,
                        fontWeight: 500,
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: config.bgColor,
                        color: config.color,
                      }}
                    >
                      {isActive && (
                        <span style={{ position: 'relative', display: 'flex', height: 8, width: 8 }}>
                          <span style={{ position: 'absolute', display: 'inline-flex', height: '100%', width: '100%', borderRadius: '50%', backgroundColor: 'currentColor', opacity: 0.6, animation: 'ping 1s cubic-bezier(0,0,0.2,1) infinite' }} />
                          <span style={{ position: 'relative', display: 'inline-flex', height: 8, width: 8, borderRadius: '50%', backgroundColor: 'currentColor' }} />
                        </span>
                      )}
                      {config.label}
                    </span>

                    {/* Cancel button for active tasks */}
                    {isActive && (
                      <button
                        onClick={(e) => handleCancel(task.id, e)}
                        disabled={isCancelling}
                        title="Cancel task"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          height: 28,
                          width: 28,
                          padding: 0,
                          border: '1px solid transparent',
                          borderRadius: 6,
                          background: 'transparent',
                          cursor: isCancelling ? 'not-allowed' : 'pointer',
                          color: '#787774',
                          transition: 'all 120ms ease',
                          flexShrink: 0,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(235,87,87,0.08)';
                          e.currentTarget.style.color = '#EB5757';
                          e.currentTarget.style.borderColor = 'rgba(235,87,87,0.2)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = '#787774';
                          e.currentTarget.style.borderColor = 'transparent';
                        }}
                      >
                        {isCancelling ? (
                          <Loader2 style={{ height: 14, width: 14 }} className="animate-spin" />
                        ) : (
                          <StopCircle style={{ height: 14, width: 14 }} />
                        )}
                      </button>
                    )}

                    <ArrowUpRight style={{ height: 16, width: 16, color: '#787774', opacity: 0.4 }} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
