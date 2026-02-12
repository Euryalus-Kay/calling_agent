'use client';

import { useMemo } from 'react';
import { useRealtimeCalls } from '@/hooks/use-realtime-calls';
import { PlanningChat } from './planning-chat';
import { CallCard } from './call-card';
import { CallSummary } from './call-summary';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Phone, Clock, CheckCircle, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Task, ChatMessage, CallPlan } from '@/types';

interface CallDashboardProps {
  taskId: string;
  task: Task;
}

const DONE_STATUSES = ['completed', 'failed', 'no_answer', 'busy'];

export function CallDashboard({ taskId, task }: CallDashboardProps) {
  const { calls, loading } = useRealtimeCalls(taskId);

  const stats = useMemo(() => {
    const total = calls.length;
    const done = calls.filter((c) => DONE_STATUSES.includes(c.status)).length;
    const active = calls.filter((c) => ['in_progress', 'on_hold', 'navigating_menu', 'transferred', 'voicemail'].includes(c.status)).length;
    const onHold = calls.filter((c) => c.status === 'on_hold').length;
    const allDone = total > 0 && done === total;
    const progress = total > 0 ? (done / total) * 100 : 0;
    return { total, done, active, onHold, allDone, progress };
  }, [calls]);

  // Show planning chat if still in planning phase
  if (task.status === 'planning' || task.status === 'ready') {
    return (
      <PlanningChat
        taskId={taskId}
        initialMessages={(task.clarifying_messages || []) as ChatMessage[]}
        plan={task.plan as CallPlan | null}
        status={task.status}
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold mb-1">
          {stats.allDone ? 'Task Complete' : 'Working on it'}
        </h1>
        <p className="text-sm text-muted-foreground mb-4">{task.input_text}</p>

        {/* Progress and live stats */}
        {calls.length > 0 && !stats.allDone && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Progress value={stats.progress} className="flex-1" />
              <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                {stats.done}/{stats.total}
              </span>
            </div>

            {/* Live status chips */}
            <div className="flex flex-wrap gap-2">
              {stats.active > 0 && (
                <div className="flex items-center gap-1.5 rounded-full bg-green-50 dark:bg-green-950 px-3 py-1 text-xs text-green-700 dark:text-green-300">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                  </span>
                  {stats.active} active call{stats.active !== 1 ? 's' : ''}
                </div>
              )}
              {stats.onHold > 0 && (
                <div className="flex items-center gap-1.5 rounded-full bg-yellow-50 dark:bg-yellow-950 px-3 py-1 text-xs text-yellow-700 dark:text-yellow-300">
                  <Pause className="h-3 w-3" />
                  {stats.onHold} on hold
                </div>
              )}
              {stats.done > 0 && stats.done < stats.total && (
                <div className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                  <CheckCircle className="h-3 w-3" />
                  {stats.done} done
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Call cards */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : calls.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted mb-4">
            <Phone className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            Calls are being prepared...
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {calls.map((call) => (
            <CallCard key={call.id} call={call} />
          ))}
        </div>
      )}

      {/* Summary when all done */}
      {stats.allDone && <CallSummary taskId={taskId} calls={calls} />}
    </div>
  );
}
