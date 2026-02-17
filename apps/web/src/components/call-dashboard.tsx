'use client';

import { useMemo } from 'react';
import { useRealtimeCalls } from '@/hooks/use-realtime-calls';
import { PlanningChat } from './planning-chat';
import { CallCard } from './call-card';
import { CallSummary } from './call-summary';
import { Phone, Clock, CheckCircle, Pause } from 'lucide-react';
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
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
      {/* Skeleton pulse animation */}
      <style>{`
        @keyframes notionPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes notionPing {
          0% { transform: scale(1); opacity: 0.6; }
          75%, 100% { transform: scale(2); opacity: 0; }
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontSize: 20,
          fontWeight: 700,
          marginBottom: 4,
          color: '#37352F',
          lineHeight: 1.3,
        }}>
          {stats.allDone ? 'Task Complete' : 'Working on it'}
        </h1>
        <p style={{
          fontSize: 14,
          color: '#787774',
          marginBottom: 16,
          lineHeight: 1.5,
        }}>
          {task.input_text}
        </p>

        {/* Progress and live stats */}
        {calls.length > 0 && !stats.allDone && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Progress bar */}
              <div style={{
                flex: 1,
                height: 6,
                backgroundColor: '#E3E2DE',
                borderRadius: 3,
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${stats.progress}%`,
                  height: '100%',
                  backgroundColor: '#2383E2',
                  borderRadius: 3,
                  transition: 'width 0.5s ease',
                }} />
              </div>
              <span style={{
                fontSize: 12,
                color: '#787774',
                fontVariantNumeric: 'tabular-nums',
                flexShrink: 0,
              }}>
                {stats.done}/{stats.total}
              </span>
            </div>

            {/* Live status chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {stats.active > 0 && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  borderRadius: 999,
                  backgroundColor: 'rgba(77,171,154,0.06)',
                  padding: '4px 12px',
                  fontSize: 12,
                  color: '#4DAB9A',
                }}>
                  <span style={{ position: 'relative', display: 'flex', height: 8, width: 8 }}>
                    <span style={{
                      position: 'absolute',
                      display: 'inline-flex',
                      height: '100%',
                      width: '100%',
                      borderRadius: '50%',
                      backgroundColor: '#4DAB9A',
                      opacity: 0.6,
                      animation: 'notionPing 1s cubic-bezier(0,0,0.2,1) infinite',
                    }} />
                    <span style={{
                      position: 'relative',
                      display: 'inline-flex',
                      height: 8,
                      width: 8,
                      borderRadius: '50%',
                      backgroundColor: '#4DAB9A',
                    }} />
                  </span>
                  {stats.active} active call{stats.active !== 1 ? 's' : ''}
                </div>
              )}
              {stats.onHold > 0 && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  borderRadius: 999,
                  backgroundColor: 'rgba(203,145,47,0.06)',
                  padding: '4px 12px',
                  fontSize: 12,
                  color: '#CB912F',
                }}>
                  <Pause style={{ height: 12, width: 12 }} />
                  {stats.onHold} on hold
                </div>
              )}
              {stats.done > 0 && stats.done < stats.total && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  borderRadius: 999,
                  backgroundColor: 'rgba(120,119,116,0.06)',
                  padding: '4px 12px',
                  fontSize: 12,
                  color: '#787774',
                }}>
                  <CheckCircle style={{ height: 12, width: 12 }} />
                  {stats.done} done
                </div>
              )}
            </div>
          </div>
        )}
      </div>

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
            <Phone style={{ height: 20, width: 20, color: '#787774' }} />
          </div>
          <p style={{ fontSize: 14, color: '#787774' }}>
            Calls are being prepared...
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
      {stats.allDone && <CallSummary taskId={taskId} calls={calls} />}
    </div>
  );
}
