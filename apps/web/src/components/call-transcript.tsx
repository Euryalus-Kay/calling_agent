'use client';

import { useRef, useEffect } from 'react';
import { useRealtimeTranscript } from '@/hooks/use-realtime-transcript';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  Pause,
  Play,
  ArrowRightLeft,
  Hash,
  Voicemail,
  CheckCircle2,
  RotateCw,
  AlertCircle,
} from 'lucide-react';
import type { TranscriptEntry } from '@/types';

const eventIcons: Record<string, React.ElementType> = {
  hold_start: Pause,
  hold_end: Play,
  transfer: ArrowRightLeft,
  dtmf: Hash,
  dtmf_received: Hash,
  voicemail: Voicemail,
  answer_captured: CheckCircle2,
  retry_needed: RotateCw,
};

const eventColors: Record<string, string> = {
  hold_start: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/50 border-yellow-200/50 dark:border-yellow-800/30',
  hold_end: 'text-green-600 bg-green-50 dark:bg-green-950/50 border-green-200/50 dark:border-green-800/30',
  transfer: 'text-purple-600 bg-purple-50 dark:bg-purple-950/50 border-purple-200/50 dark:border-purple-800/30',
  dtmf: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200/50 dark:border-indigo-800/30',
  dtmf_received: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200/50 dark:border-indigo-800/30',
  voicemail: 'text-orange-600 bg-orange-50 dark:bg-orange-950/50 border-orange-200/50 dark:border-orange-800/30',
  answer_captured: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200/50 dark:border-emerald-800/30',
  retry_needed: 'text-amber-600 bg-amber-50 dark:bg-amber-950/50 border-amber-200/50 dark:border-amber-800/30',
};

function SystemEvent({ entry }: { entry: TranscriptEntry }) {
  const eventType = entry.event_type || 'default';
  const Icon = eventIcons[eventType] || AlertCircle;
  const colors = eventColors[eventType] || 'text-muted-foreground bg-muted border-border';

  return (
    <div className={cn('flex items-center justify-center gap-2 rounded-lg border px-3 py-1.5 text-xs mx-4', colors)}>
      <Icon className="h-3 w-3 shrink-0" />
      <span>{entry.content}</span>
    </div>
  );
}

function formatTimestamp(createdAt: string, firstEntryAt: string): string {
  const start = new Date(firstEntryAt).getTime();
  const current = new Date(createdAt).getTime();
  const elapsed = Math.max(0, Math.floor((current - start) / 1000));
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function CallTranscript({ callId }: { callId: string }) {
  const entries = useRealtimeTranscript(callId);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  const firstEntryAt = entries.length > 0 ? entries[0].created_at : '';

  return (
    <ScrollArea className="h-64 rounded-lg border bg-background">
      <div className="space-y-2 p-3">
        {entries.map((entry) => {
          if (entry.speaker === 'system') {
            return <SystemEvent key={entry.id} entry={entry} />;
          }

          return (
            <div
              key={entry.id}
              className={cn(
                'flex gap-2 text-sm',
                entry.speaker === 'agent' ? 'flex-row' : 'flex-row-reverse'
              )}
            >
              <div
                className={cn(
                  'max-w-[80%] rounded-lg px-3 py-1.5',
                  entry.speaker === 'agent'
                    ? 'bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100'
                    : 'bg-muted'
                )}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-medium uppercase opacity-60">
                    {entry.speaker === 'agent' ? 'AI Agent' : 'Business'}
                  </span>
                  {firstEntryAt && (
                    <span className="text-[10px] font-mono opacity-40">
                      {formatTimestamp(entry.created_at, firstEntryAt)}
                    </span>
                  )}
                </div>
                {entry.content}
              </div>
            </div>
          );
        })}
        {entries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <div className="flex gap-1">
              <span className="h-2 w-2 rounded-full bg-muted-foreground/30 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="h-2 w-2 rounded-full bg-muted-foreground/30 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="h-2 w-2 rounded-full bg-muted-foreground/30 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <p className="text-sm text-muted-foreground">
              Waiting for conversation to begin...
            </p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
