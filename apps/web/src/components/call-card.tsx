'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CallTranscript } from './call-transcript';
import { cn } from '@/lib/utils';
import {
  Phone,
  PhoneOff,
  Loader2,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Pause,
  ArrowRightLeft,
  Hash,
  Voicemail,
  RotateCw,
} from 'lucide-react';
import type { Call } from '@/types';

const statusConfig: Record<
  string,
  { label: string; color: string; bgColor: string; icon: React.ElementType; description?: string }
> = {
  queued: {
    label: 'In queue',
    color: 'text-zinc-600 dark:text-zinc-400',
    bgColor: 'bg-zinc-100 dark:bg-zinc-800',
    icon: Clock,
  },
  initiating: {
    label: 'Dialing',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 dark:bg-amber-950',
    icon: Loader2,
  },
  ringing: {
    label: 'Ringing',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950',
    icon: Phone,
  },
  in_progress: {
    label: 'On call',
    color: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-950',
    icon: Phone,
  },
  on_hold: {
    label: 'On hold',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950',
    icon: Pause,
    description: 'Waiting patiently on hold',
  },
  navigating_menu: {
    label: 'Phone menu',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50 dark:bg-indigo-950',
    icon: Hash,
    description: 'Navigating automated menu',
  },
  transferred: {
    label: 'Transferred',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-950',
    icon: ArrowRightLeft,
    description: 'Being transferred to the right department',
  },
  voicemail: {
    label: 'Voicemail',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-950',
    icon: Voicemail,
    description: 'Leaving a voicemail message',
  },
  retrying: {
    label: 'Retrying',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 dark:bg-amber-950',
    icon: RotateCw,
    description: 'Trying again in a moment',
  },
  completed: {
    label: 'Done',
    color: 'text-green-700 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-950',
    icon: CheckCircle,
  },
  failed: {
    label: 'Failed',
    color: 'text-red-600',
    bgColor: 'bg-red-50 dark:bg-red-950',
    icon: XCircle,
  },
  no_answer: {
    label: 'No answer',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-950',
    icon: PhoneOff,
  },
  busy: {
    label: 'Busy',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-950',
    icon: PhoneOff,
  },
};

const ACTIVE_STATUSES = ['ringing', 'in_progress', 'initiating', 'on_hold', 'navigating_menu', 'transferred', 'voicemail', 'retrying'];
const DONE_STATUSES = ['completed', 'failed', 'no_answer', 'busy'];
const SHOW_TRANSCRIPT_STATUSES = ['in_progress', 'on_hold', 'navigating_menu', 'transferred', 'voicemail'];

function LiveTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  return (
    <span className="tabular-nums text-xs font-mono text-green-600">
      {mins}:{secs.toString().padStart(2, '0')}
    </span>
  );
}

function HoldTimer({ holdStartedAt }: { holdStartedAt: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(holdStartedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [holdStartedAt]);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  return (
    <span className="tabular-nums text-xs font-mono text-yellow-600">
      {mins}:{secs.toString().padStart(2, '0')} on hold
    </span>
  );
}

export function CallCard({ call }: { call: Call }) {
  const [expanded, setExpanded] = useState(
    ACTIVE_STATUSES.includes(call.status)
  );

  // Auto-expand when call becomes active
  useEffect(() => {
    if (ACTIVE_STATUSES.includes(call.status)) {
      setExpanded(true);
    }
  }, [call.status]);

  const config = statusConfig[call.status] || statusConfig.queued;
  const StatusIcon = config.icon;
  const isActive = ACTIVE_STATUSES.includes(call.status);
  const isDone = DONE_STATUSES.includes(call.status);
  const showTranscript = SHOW_TRANSCRIPT_STATUSES.includes(call.status);
  const isOnHold = call.status === 'on_hold';
  const isRetrying = call.status === 'retrying';

  return (
    <Card
      className={cn(
        'transition-all duration-300 overflow-hidden',
        isActive && !isOnHold && !isRetrying && 'ring-1 ring-green-400/30 shadow-sm shadow-green-500/5',
        isOnHold && 'ring-1 ring-yellow-400/30 shadow-sm shadow-yellow-500/5',
        isRetrying && 'ring-1 ring-amber-400/30 shadow-sm shadow-amber-500/5',
        isDone && call.status === 'completed' && 'border-green-200/50 dark:border-green-800/30',
        isDone && call.status === 'failed' && 'border-red-200/50 dark:border-red-800/30',
        !isDone && !isActive && 'opacity-75'
      )}
    >
      <CardHeader
        className="flex flex-row items-center gap-3 py-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Status indicator */}
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl shrink-0', config.bgColor)}>
          <StatusIcon
            className={cn(
              'h-4 w-4',
              config.color,
              (config.icon === Loader2 || config.icon === RotateCw) && 'animate-spin',
              isActive && config.icon !== Loader2 && config.icon !== RotateCw && 'animate-pulse'
            )}
          />
        </div>

        {/* Business info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm truncate">{call.business_name}</h3>
            {(call.retry_count ?? 0) > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                attempt {(call.retry_count ?? 0) + 1}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground">{call.phone_number}</span>
            {SHOW_TRANSCRIPT_STATUSES.includes(call.status) && call.started_at && (
              <>
                <span className="text-muted-foreground/50">·</span>
                <LiveTimer startedAt={call.started_at} />
              </>
            )}
            {isOnHold && call.hold_started_at && (
              <>
                <span className="text-muted-foreground/50">·</span>
                <HoldTimer holdStartedAt={call.hold_started_at} />
              </>
            )}
          </div>
        </div>

        {/* Status badge + expand */}
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className={cn('text-xs border-none', config.bgColor, config.color)}>
            {isActive && (
              <span className="relative mr-1.5 flex h-2 w-2">
                <span className={cn(
                  'absolute inline-flex h-full w-full rounded-full bg-current opacity-60',
                  isOnHold ? 'animate-pulse' : 'animate-ping'
                )} />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
              </span>
            )}
            {config.label}
          </Badge>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 px-4 pb-4 space-y-3">
          {/* Status detail */}
          {call.status_detail && isActive && (
            <div className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-2 text-xs',
              isOnHold ? 'bg-yellow-50 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-300' :
              call.status === 'navigating_menu' ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300' :
              call.status === 'transferred' ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300' :
              isRetrying ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300' :
              'bg-muted text-muted-foreground'
            )}>
              <StatusIcon className={cn('h-3.5 w-3.5 shrink-0', config.color)} />
              {call.status_detail}
            </div>
          )}

          {/* Purpose */}
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">Purpose</p>
            <p className="text-sm">{call.purpose}</p>
          </div>

          {/* Live transcript */}
          {showTranscript && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className={cn(
                    'absolute inline-flex h-full w-full rounded-full opacity-60',
                    isOnHold ? 'bg-yellow-500 animate-pulse' : 'bg-green-500 animate-ping'
                  )} />
                  <span className={cn(
                    'relative inline-flex h-2 w-2 rounded-full',
                    isOnHold ? 'bg-yellow-500' : 'bg-green-500'
                  )} />
                </span>
                {isOnHold ? 'On hold — staying on the line' : 'Live conversation'}
              </p>
              <CallTranscript callId={call.id} />
            </div>
          )}

          {/* Completed transcript */}
          {call.status === 'completed' && (
            <CallTranscript callId={call.id} />
          )}

          {/* Result */}
          {call.result_summary && (
            <div className="rounded-lg bg-green-50 dark:bg-green-950/50 border border-green-200/50 dark:border-green-800/30 p-3">
              <p className="text-xs font-medium text-green-800 dark:text-green-300 mb-1.5 flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5" />
                What I found
              </p>
              <p className="text-sm text-green-900 dark:text-green-100 whitespace-pre-line leading-relaxed">
                {call.result_summary}
              </p>
            </div>
          )}

          {/* Error */}
          {call.error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200/50 dark:border-red-800/30 p-3">
              <p className="text-xs font-medium text-red-800 dark:text-red-300 mb-1">Something went wrong</p>
              <p className="text-sm text-red-900 dark:text-red-100">{call.error}</p>
            </div>
          )}

          {/* Duration */}
          {call.duration_seconds != null && call.duration_seconds > 0 && isDone && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {Math.floor(call.duration_seconds / 60)}m {call.duration_seconds % 60}s
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
