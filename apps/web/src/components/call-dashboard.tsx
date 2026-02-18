'use client';

import { useMemo } from 'react';
import { useRealtimeCalls } from '@/hooks/use-realtime-calls';
import { PlanningChat } from './planning-chat';
import { CallCard } from './call-card';
import { CallSummary } from './call-summary';
import { PostCallQuestions } from './post-call-questions';
import {
  Phone,
  Clock,
  CheckCircle,
  Pause,
  PhoneCall,
  PhoneOutgoing,
  Sparkles,
  Brain,
  Loader2,
} from 'lucide-react';
import type { Task, ChatMessage, CallPlan } from '@/types';

interface CallDashboardProps {
  taskId: string;
  task: Task;
}

const DONE_STATUSES = ['completed', 'failed', 'no_answer', 'busy'];

type TaskPhase = 'planning' | 'placing' | 'active' | 'on_hold' | 'wrapping_up' | 'complete';

interface PhaseConfig {
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  animate?: boolean;
}

const PHASE_CONFIGS: Record<TaskPhase, PhaseConfig> = {
  planning: {
    label: 'Planning',
    icon: Brain,
    color: '#2383E2',
    bgColor: 'rgba(35, 131, 226, 0.06)',
  },
  placing: {
    label: 'Placing calls',
    icon: PhoneOutgoing,
    color: '#D9730D',
    bgColor: 'rgba(217, 115, 13, 0.06)',
    animate: true,
  },
  active: {
    label: 'In progress',
    icon: PhoneCall,
    color: '#4DAB9A',
    bgColor: 'rgba(77, 171, 154, 0.06)',
    animate: true,
  },
  on_hold: {
    label: 'On hold',
    icon: Pause,
    color: '#CB912F',
    bgColor: 'rgba(203, 145, 47, 0.06)',
    animate: true,
  },
  wrapping_up: {
    label: 'Generating summary',
    icon: Sparkles,
    color: '#6940A5',
    bgColor: 'rgba(105, 64, 165, 0.06)',
    animate: true,
  },
  complete: {
    label: 'Complete',
    icon: CheckCircle,
    color: '#4DAB9A',
    bgColor: 'rgba(77, 171, 154, 0.06)',
  },
};

export function CallDashboard({ taskId, task }: CallDashboardProps) {
  const { calls, loading } = useRealtimeCalls(taskId);

  const stats = useMemo(() => {
    const total = calls.length;
    const done = calls.filter((c) => DONE_STATUSES.includes(c.status)).length;
    const active = calls.filter((c) => ['in_progress', 'on_hold', 'navigating_menu', 'transferred', 'voicemail'].includes(c.status)).length;
    const onHold = calls.filter((c) => c.status === 'on_hold').length;
    const placing = calls.filter((c) => ['queued', 'initiating', 'ringing'].includes(c.status)).length;
    const allDone = total > 0 && done === total;
    const progress = total > 0 ? (done / total) * 100 : 0;
    return { total, done, active, onHold, placing, allDone, progress };
  }, [calls]);

  // Determine the current phase
  const phase: TaskPhase = useMemo(() => {
    if (task.status === 'planning' || task.status === 'ready') return 'planning';
    if (stats.allDone && task.summary) return 'complete';
    if (stats.allDone) return 'wrapping_up';
    if (stats.onHold > 0) return 'on_hold';
    if (stats.active > 0) return 'active';
    if (stats.placing > 0) return 'placing';
    return 'active';
  }, [task.status, task.summary, stats]);

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

  const phaseConfig = PHASE_CONFIGS[phase];
  const PhaseIcon = phaseConfig.icon;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
      {/* Animations */}
      <style>{`
        @keyframes notionPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes notionPing {
          0% { transform: scale(1); opacity: 0.6; }
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        @keyframes statusPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Phase status bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 16px',
        borderRadius: 8,
        backgroundColor: phaseConfig.bgColor,
        border: `1px solid ${phaseConfig.color}15`,
        marginBottom: 20,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 28,
          height: 28,
          borderRadius: 6,
          backgroundColor: `${phaseConfig.color}15`,
        }}>
          <PhaseIcon
            style={{
              width: 15,
              height: 15,
              color: phaseConfig.color,
              ...(phaseConfig.animate && phase === 'wrapping_up'
                ? { animation: 'spin 2s linear infinite' }
                : {}),
            }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 14,
              fontWeight: 600,
              color: phaseConfig.color,
            }}>
              {phaseConfig.label}
            </span>
            {phaseConfig.animate && phase !== 'complete' && (
              <span style={{
                display: 'inline-block',
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: phaseConfig.color,
                animation: 'statusPulse 1.5s ease-in-out infinite',
              }} />
            )}
          </div>
          <span style={{
            fontSize: 12,
            color: '#787774',
          }}>
            {phase === 'complete'
              ? `${stats.done} call${stats.done !== 1 ? 's' : ''} finished`
              : phase === 'wrapping_up'
              ? 'Analyzing results...'
              : `${stats.done} of ${stats.total} calls complete`}
          </span>
        </div>

        {/* Mini progress */}
        {!stats.allDone && stats.total > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <div style={{
              width: 60,
              height: 4,
              backgroundColor: `${phaseConfig.color}20`,
              borderRadius: 2,
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${stats.progress}%`,
                height: '100%',
                backgroundColor: phaseConfig.color,
                borderRadius: 2,
                transition: 'width 0.5s ease',
              }} />
            </div>
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              color: phaseConfig.color,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {Math.round(stats.progress)}%
            </span>
          </div>
        )}
      </div>

      {/* Task title — use the AI-formatted plan summary, fall back to raw input */}
      {task.plan?.summary && (
        <h2 style={{
          fontSize: 16,
          fontWeight: 600,
          color: '#37352F',
          marginBottom: 4,
          lineHeight: 1.4,
        }}>
          {task.plan.summary}
        </h2>
      )}
      <p style={{
        fontSize: 13,
        color: '#787774',
        marginBottom: 20,
        lineHeight: 1.5,
      }}>
        {task.input_text}
      </p>

      {/* Call cards */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: 80,
                width: '100%',
                borderRadius: 8,
                backgroundColor: '#F7F6F3',
                animation: 'notionPulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
              }}
            />
          ))}
        </div>
      ) : calls.length === 0 ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '64px 0',
          textAlign: 'center',
        }}>
          <div style={{
            display: 'flex',
            height: 48,
            width: 48,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 8,
            backgroundColor: '#F7F6F3',
            marginBottom: 16,
          }}>
            <Loader2 style={{
              height: 20,
              width: 20,
              color: '#787774',
              animation: 'spin 1s linear infinite',
            }} />
          </div>
          <p style={{ fontSize: 14, color: '#787774' }}>
            Preparing your calls...
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {calls.map((call) => (
            <CallCard key={call.id} call={call} />
          ))}
        </div>
      )}

      {/* Summary when all done */}
      {stats.allDone && <CallSummary taskId={taskId} calls={calls} existingSummary={task.summary} />}

      {/* Post-call follow-up questions to build memory */}
      {stats.allDone && (
        <PostCallQuestions
          taskId={taskId}
          allCallsDone={stats.allDone}
          summaryReady={!!task.summary}
        />
      )}
    </div>
  );
}
