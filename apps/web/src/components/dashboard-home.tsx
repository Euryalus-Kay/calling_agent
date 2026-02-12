'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Send,
  Phone,
  Clock,
  CheckCircle,
  TrendingUp,
  Sparkles,
  ArrowRight,
  ArrowUpRight,
  Stethoscope,
  Wrench,
  UtensilsCrossed,
  Car,
  Search,
  Loader2,
  PhoneCall,
  Timer,
  Zap,
  ChevronRight,
  AlertCircle,
  PhoneForwarded,
} from 'lucide-react';
import type { Task } from '@/types';

interface DashboardHomeProps {
  userName: string;
  recentTasks: Task[];
  stats: {
    total_tasks: number;
    total_calls: number;
    successful_calls: number;
    total_call_minutes: number;
  };
}

const QUICK_ACTIONS = [
  {
    icon: Stethoscope,
    label: 'Book appointment',
    description: 'Doctor, dentist, or specialist',
    prompt: 'Book a doctor appointment for me this week',
    gradient: 'from-blue-500/10 to-blue-600/5',
    iconBg: 'bg-blue-500/10 dark:bg-blue-500/20',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  {
    icon: Wrench,
    label: 'Find a service',
    description: 'Plumber, electrician, handyman',
    prompt: 'Find a plumber near me who can come today',
    gradient: 'from-amber-500/10 to-amber-600/5',
    iconBg: 'bg-amber-500/10 dark:bg-amber-500/20',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  {
    icon: UtensilsCrossed,
    label: 'Make reservation',
    description: 'Restaurants and dining',
    prompt: 'Make a dinner reservation for 2 this Saturday evening',
    gradient: 'from-rose-500/10 to-rose-600/5',
    iconBg: 'bg-rose-500/10 dark:bg-rose-500/20',
    iconColor: 'text-rose-600 dark:text-rose-400',
  },
  {
    icon: Search,
    label: 'Check availability',
    description: 'Products and store stock',
    prompt: 'Check if any nearby stores have this product in stock',
    gradient: 'from-emerald-500/10 to-emerald-600/5',
    iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    icon: Car,
    label: 'Auto service',
    description: 'Oil change, repairs, detailing',
    prompt: 'Schedule an oil change for my car this weekend',
    gradient: 'from-violet-500/10 to-violet-600/5',
    iconBg: 'bg-violet-500/10 dark:bg-violet-500/20',
    iconColor: 'text-violet-600 dark:text-violet-400',
  },
  {
    icon: Phone,
    label: 'General inquiry',
    description: 'Hours, pricing, and info',
    prompt: 'Call this business and ask about their hours and pricing',
    gradient: 'from-slate-500/10 to-slate-600/5',
    iconBg: 'bg-slate-500/10 dark:bg-slate-500/20',
    iconColor: 'text-slate-600 dark:text-slate-400',
  },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function getStatusConfig(status: string) {
  switch (status) {
    case 'completed':
      return {
        label: 'Completed',
        color: 'text-emerald-700 dark:text-emerald-400',
        bg: 'bg-emerald-50 dark:bg-emerald-500/10',
        ringColor: 'ring-emerald-200 dark:ring-emerald-500/20',
        icon: CheckCircle,
        dotColor: 'bg-emerald-500',
      };
    case 'in_progress':
      return {
        label: 'In Progress',
        color: 'text-blue-700 dark:text-blue-400',
        bg: 'bg-blue-50 dark:bg-blue-500/10',
        ringColor: 'ring-blue-200 dark:ring-blue-500/20',
        icon: PhoneCall,
        dotColor: 'bg-blue-500',
      };
    case 'failed':
      return {
        label: 'Failed',
        color: 'text-red-700 dark:text-red-400',
        bg: 'bg-red-50 dark:bg-red-500/10',
        ringColor: 'ring-red-200 dark:ring-red-500/20',
        icon: AlertCircle,
        dotColor: 'bg-red-500',
      };
    default:
      return {
        label: 'Pending',
        color: 'text-slate-600 dark:text-slate-400',
        bg: 'bg-slate-50 dark:bg-slate-500/10',
        ringColor: 'ring-slate-200 dark:ring-slate-500/20',
        icon: Clock,
        dotColor: 'bg-slate-400',
      };
  }
}

function AnimatedNumber({ value }: { value: number }) {
  const [displayed, setDisplayed] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    const duration = 1200;
    const steps = 40;
    const stepTime = duration / steps;
    let current = 0;
    const increment = value / steps;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayed(value);
        clearInterval(timer);
      } else {
        setDisplayed(Math.floor(current));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <span
      ref={ref}
      className="tabular-nums transition-all duration-150"
    >
      {displayed.toLocaleString()}
    </span>
  );
}

export function DashboardHome({ userName, recentTasks, stats }: DashboardHomeProps) {
  const [taskText, setTaskText] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const firstName = userName.split(' ')[0] || 'there';

  const successRate =
    stats.total_calls > 0
      ? Math.round((stats.successful_calls / stats.total_calls) * 100)
      : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!taskText.trim() || loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input_text: taskText }),
      });
      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }
      const data = await res.json();
      if (data.taskId) {
        router.push(`/tasks/${data.taskId}`);
      } else {
        throw new Error('No task ID returned');
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong';
      toast.error('Failed to create task', {
        description: message,
      });
      setLoading(false);
    }
  }

  function handleQuickAction(prompt: string) {
    setTaskText(prompt);
  }

  const callCounts = recentTasks.reduce<Record<string, number>>((acc, task) => {
    const count = task.plan?.calls?.length ?? 0;
    acc[task.id] = count;
    return acc;
  }, {});

  const isNewUser = recentTasks.length === 0 && stats.total_tasks === 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-12 space-y-10">
      {/* Hero: Greeting + Input */}
      <div className="relative">
        {/* Gradient background decoration */}
        <div className="absolute inset-0 -m-4 rounded-3xl bg-gradient-to-br from-primary/[0.04] via-primary/[0.02] to-transparent dark:from-primary/[0.08] dark:via-primary/[0.03] pointer-events-none" />
        <div className="relative">
          <div className="mb-6">
            <p className="text-sm font-medium text-primary/70 mb-1 tracking-wide uppercase">
              {getGreeting()}
            </p>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              {firstName}, what can I call about?
            </h1>
            <p className="text-muted-foreground mt-2 text-[15px]">
              Describe your task and I&apos;ll handle every phone call from start to finish.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <fieldset disabled={loading} className="relative">
              <div className="relative rounded-2xl border-2 border-border/60 bg-background shadow-sm shadow-black/[0.03] transition-all duration-200 focus-within:border-primary/40 focus-within:shadow-md focus-within:shadow-primary/[0.06]">
                <Textarea
                  placeholder="e.g. Book a dentist appointment for next Tuesday afternoon..."
                  value={taskText}
                  onChange={(e) => setTaskText(e.target.value)}
                  className="min-h-[120px] border-0 bg-transparent px-5 pt-5 pb-16 text-[15px] leading-relaxed resize-none shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/50"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      handleSubmit(e);
                    }
                  }}
                />
                <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground/50 select-none">
                    {taskText.length > 0 ? (
                      <>Press <kbd className="rounded border border-border/60 bg-muted/50 px-1.5 py-0.5 text-[10px] font-mono">
                        {typeof navigator !== 'undefined' && /Mac/.test(navigator.userAgent) ? '\u2318' : 'Ctrl'}
                      </kbd> + <kbd className="rounded border border-border/60 bg-muted/50 px-1.5 py-0.5 text-[10px] font-mono">
                        Enter
                      </kbd> to send</>
                    ) : null}
                  </span>
                  <Button
                    type="submit"
                    disabled={!taskText.trim() || loading}
                    className="rounded-xl px-5 gap-2 h-9 text-sm font-medium shadow-sm transition-all duration-200 hover:shadow-md"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        Send task
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </fieldset>
          </form>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-4 w-4 text-primary/60" />
          <h2 className="text-sm font-semibold text-foreground/70 tracking-wide uppercase">
            Quick actions
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              onClick={() => handleQuickAction(action.prompt)}
              className={`group relative flex flex-col gap-3 rounded-2xl border border-border/50 bg-gradient-to-br ${action.gradient} p-4 text-left transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-black/[0.04] hover:border-border active:scale-[0.98] dark:hover:shadow-black/[0.15]`}
            >
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl ${action.iconBg} transition-transform duration-200 group-hover:scale-110`}
              >
                <action.icon className={`h-5 w-5 ${action.iconColor}`} />
              </div>
              <div>
                <span className="text-sm font-semibold block">{action.label}</span>
                <span className="text-xs text-muted-foreground mt-0.5 block">
                  {action.description}
                </span>
              </div>
              <ArrowUpRight className="absolute top-3 right-3 h-3.5 w-3.5 text-muted-foreground/30 transition-all duration-200 group-hover:text-muted-foreground/60 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      {stats.total_tasks > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-primary/60" />
            <h2 className="text-sm font-semibold text-foreground/70 tracking-wide uppercase">
              Your stats
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Tasks completed */}
            <Card className="relative overflow-hidden border-border/50">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.06] to-transparent dark:from-emerald-500/[0.1] pointer-events-none" />
              <CardContent className="relative p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20">
                    <CheckCircle className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <TrendingUp className="h-3 w-3" />
                    <span className="text-[11px] font-medium">Active</span>
                  </div>
                </div>
                <p className="text-3xl font-bold tracking-tight">
                  <AnimatedNumber value={stats.total_tasks} />
                </p>
                <p className="text-xs text-muted-foreground mt-1 font-medium">
                  Tasks completed
                </p>
              </CardContent>
            </Card>

            {/* Calls made */}
            <Card className="relative overflow-hidden border-border/50">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.06] to-transparent dark:from-blue-500/[0.1] pointer-events-none" />
              <CardContent className="relative p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 dark:bg-blue-500/20">
                    <PhoneForwarded className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                    <TrendingUp className="h-3 w-3" />
                    <span className="text-[11px] font-medium">
                      {stats.total_calls > 0 ? `${(stats.total_calls / Math.max(stats.total_tasks, 1)).toFixed(1)}/task` : '--'}
                    </span>
                  </div>
                </div>
                <p className="text-3xl font-bold tracking-tight">
                  <AnimatedNumber value={stats.total_calls} />
                </p>
                <p className="text-xs text-muted-foreground mt-1 font-medium">
                  Calls made
                </p>
              </CardContent>
            </Card>

            {/* Success rate */}
            <Card className="relative overflow-hidden border-border/50">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.06] to-transparent dark:from-violet-500/[0.1] pointer-events-none" />
              <CardContent className="relative p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 dark:bg-violet-500/20">
                    <Sparkles className="h-4.5 w-4.5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div className="flex items-center gap-1 text-violet-600 dark:text-violet-400">
                    {successRate >= 80 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <ArrowRight className="h-3 w-3" />
                    )}
                    <span className="text-[11px] font-medium">
                      {successRate >= 80 ? 'Great' : 'Improving'}
                    </span>
                  </div>
                </div>
                <p className="text-3xl font-bold tracking-tight">
                  <AnimatedNumber value={successRate} />
                  <span className="text-lg font-semibold text-muted-foreground">%</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1 font-medium">
                  Success rate
                </p>
              </CardContent>
            </Card>

            {/* Time saved */}
            <Card className="relative overflow-hidden border-border/50">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.06] to-transparent dark:from-amber-500/[0.1] pointer-events-none" />
              <CardContent className="relative p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 dark:bg-amber-500/20">
                    <Timer className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <TrendingUp className="h-3 w-3" />
                    <span className="text-[11px] font-medium">Saved</span>
                  </div>
                </div>
                <p className="text-3xl font-bold tracking-tight">
                  <AnimatedNumber value={stats.total_call_minutes} />
                  <span className="text-lg font-semibold text-muted-foreground">m</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1 font-medium">
                  Minutes of calls
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {recentTasks.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary/60" />
              <h2 className="text-sm font-semibold text-foreground/70 tracking-wide uppercase">
                Recent activity
              </h2>
            </div>
            <Link
              href="/history"
              className="group flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              View all
              <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </div>
          <div className="space-y-2">
            {recentTasks.slice(0, 5).map((task) => {
              const statusConfig = getStatusConfig(task.status);
              const StatusIcon = statusConfig.icon;
              const numCalls = callCounts[task.id] ?? 0;

              return (
                <Link key={task.id} href={`/tasks/${task.id}`}>
                  <Card className="group relative overflow-hidden border-border/50 transition-all duration-200 hover:shadow-md hover:shadow-black/[0.04] hover:border-border dark:hover:shadow-black/[0.15]">
                    <CardContent className="p-4 flex items-center gap-4">
                      {/* Status icon */}
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl ${statusConfig.bg} ring-1 ${statusConfig.ringColor} shrink-0 transition-transform duration-200 group-hover:scale-105`}
                      >
                        <StatusIcon
                          className={`h-4.5 w-4.5 ${statusConfig.color} ${
                            task.status === 'in_progress' ? 'animate-pulse' : ''
                          }`}
                        />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-medium truncate">
                            {task.input_text}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {task.summary && (
                            <p className="text-xs text-muted-foreground truncate max-w-[280px]">
                              {task.summary}
                            </p>
                          )}
                          {numCalls > 0 && (
                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground/70 shrink-0">
                              <Phone className="h-3 w-3" />
                              {numCalls} {numCalls === 1 ? 'call' : 'calls'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right side: status + time */}
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] px-2 py-0.5 font-medium border-0 ${statusConfig.bg} ${statusConfig.color}`}
                        >
                          <span
                            className={`inline-block h-1.5 w-1.5 rounded-full ${statusConfig.dotColor} mr-1.5 ${
                              task.status === 'in_progress' ? 'animate-pulse' : ''
                            }`}
                          />
                          {statusConfig.label}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground/60 font-medium">
                          {getTimeAgo(task.created_at)}
                        </span>
                      </div>

                      {/* Hover chevron */}
                      <ChevronRight className="h-4 w-4 text-muted-foreground/0 transition-all duration-200 group-hover:text-muted-foreground/40 group-hover:translate-x-0.5 shrink-0" />
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State for New Users */}
      {isNewUser && (
        <div className="relative">
          <div className="absolute inset-0 -m-2 rounded-3xl bg-gradient-to-br from-primary/[0.03] via-transparent to-primary/[0.02] pointer-events-none" />
          <Card className="relative overflow-hidden border-dashed border-2 border-border/40">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/[0.05] to-transparent rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-primary/[0.04] to-transparent rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />
            <CardContent className="relative py-16 px-6 text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/10 shadow-lg shadow-primary/[0.08]">
                <Sparkles className="h-9 w-9 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2 tracking-tight">
                Your AI phone assistant is ready
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed mb-8">
                Tell me what you need -- booking appointments, checking availability,
                making reservations -- and I&apos;ll handle every phone call for you.
                Just describe the task above and I&apos;ll take it from there.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground/70">
                <span className="flex items-center gap-1.5">
                  <div className="h-6 w-6 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle className="h-3 w-3 text-emerald-500" />
                  </div>
                  Plans calls automatically
                </span>
                <span className="flex items-center gap-1.5">
                  <div className="h-6 w-6 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <PhoneCall className="h-3 w-3 text-blue-500" />
                  </div>
                  Makes calls on your behalf
                </span>
                <span className="flex items-center gap-1.5">
                  <div className="h-6 w-6 rounded-lg bg-violet-500/10 flex items-center justify-center">
                    <Sparkles className="h-3 w-3 text-violet-500" />
                  </div>
                  Reports back with results
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
