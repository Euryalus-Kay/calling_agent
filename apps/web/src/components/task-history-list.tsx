'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
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
} from 'lucide-react';
import type { Task } from '@/types';

const statusConfig: Record<
  string,
  { label: string; color: string; bgColor: string; icon: React.ElementType }
> = {
  planning: {
    label: 'Planning',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 dark:bg-amber-950',
    icon: Loader2,
  },
  ready: {
    label: 'Ready',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950',
    icon: Phone,
  },
  in_progress: {
    label: 'In Progress',
    color: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-950',
    icon: Loader2,
  },
  completed: {
    label: 'Completed',
    color: 'text-green-700',
    bgColor: 'bg-green-50 dark:bg-green-950',
    icon: CheckCircle,
  },
  failed: {
    label: 'Failed',
    color: 'text-red-600',
    bgColor: 'bg-red-50 dark:bg-red-950',
    icon: AlertCircle,
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

export function TaskHistoryList({ tasks }: { tasks: Task[] }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterTab>('all');

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
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
          <Phone className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold mb-1">No tasks yet</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Go to the home page and tell me what you need. I'll plan the calls and get things done.
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          Start a new task <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 pr-9"
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

      {/* Filter Tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterTab)}>
        <TabsList>
          <TabsTrigger value="all">
            All {counts.all > 0 && <span className="ml-1 text-xs opacity-60">{counts.all}</span>}
          </TabsTrigger>
          <TabsTrigger value="active">
            Active {counts.active > 0 && <span className="ml-1 text-xs opacity-60">{counts.active}</span>}
          </TabsTrigger>
          <TabsTrigger value="completed">
            Done {counts.completed > 0 && <span className="ml-1 text-xs opacity-60">{counts.completed}</span>}
          </TabsTrigger>
          <TabsTrigger value="failed">
            Failed {counts.failed > 0 && <span className="ml-1 text-xs opacity-60">{counts.failed}</span>}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-muted-foreground">
            {search ? 'No tasks match your search' : 'No tasks in this category'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((task) => {
            const config = statusConfig[task.status] || statusConfig.planning;
            const StatusIcon = config.icon;
            const isActive = ['planning', 'ready', 'in_progress'].includes(task.status);

            return (
              <Link key={task.id} href={`/tasks/${task.id}`}>
                <Card className="group hover:shadow-sm transition-all duration-150 cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-3">
                    {/* Status icon */}
                    <div className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-xl shrink-0',
                      config.bgColor
                    )}>
                      <StatusIcon
                        className={cn(
                          'h-4 w-4',
                          config.color,
                          config.icon === Loader2 && 'animate-spin'
                        )}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{task.input_text}</p>
                        {task.is_favorite && (
                          <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
                        )}
                      </div>
                      {task.summary && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {task.summary}
                        </p>
                      )}
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(task.created_at)}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn('text-xs border-none', config.bgColor, config.color)}
                      >
                        {isActive && (
                          <span className="relative mr-1.5 flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
                          </span>
                        )}
                        {config.label}
                      </Badge>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
