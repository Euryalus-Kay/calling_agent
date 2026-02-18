'use client';

import { useState, useEffect } from 'react';
import { CallTranscript } from './call-transcript';
import {
  Phone,
  PhoneOff,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Pause,
  ArrowRightLeft,
  Hash,
  Voicemail,
  RotateCw,
  Brain,
  BookUser,
  FileText,
  Lightbulb,
} from 'lucide-react';
import type { Call } from '@/types';

/** Strip markdown formatting characters from text */
function cleanMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^-\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n');
}

const statusConfig: Record<
  string,
  { label: string; color: string; bgColor: string; icon: React.ElementType; description?: string }
> = {
  queued: { label: 'In queue', color: '#787774', bgColor: 'rgba(120,119,116,0.06)', icon: Clock },
  initiating: { label: 'Dialing', color: '#CB912F', bgColor: 'rgba(203,145,47,0.06)', icon: Loader2 },
  ringing: { label: 'Ringing', color: '#2383E2', bgColor: 'rgba(35,131,226,0.06)', icon: Phone },
  in_progress: { label: 'On call', color: '#4DAB9A', bgColor: 'rgba(77,171,154,0.06)', icon: Phone },
  on_hold: { label: 'On hold', color: '#CB912F', bgColor: 'rgba(203,145,47,0.06)', icon: Pause, description: 'Waiting patiently on hold' },
  navigating_menu: { label: 'Phone menu', color: '#6940A5', bgColor: 'rgba(105,64,165,0.06)', icon: Hash, description: 'Navigating automated menu' },
  transferred: { label: 'Transferred', color: '#6940A5', bgColor: 'rgba(105,64,165,0.06)', icon: ArrowRightLeft, description: 'Being transferred' },
  voicemail: { label: 'Voicemail', color: '#D9730D', bgColor: 'rgba(217,115,13,0.06)', icon: Voicemail, description: 'Leaving a voicemail message' },
  retrying: { label: 'Retrying', color: '#CB912F', bgColor: 'rgba(203,145,47,0.06)', icon: RotateCw, description: 'Trying again in a moment' },
  completed: { label: 'Done', color: '#4DAB9A', bgColor: 'rgba(77,171,154,0.06)', icon: CheckCircle },
  failed: { label: 'Failed', color: '#EB5757', bgColor: 'rgba(235,87,87,0.06)', icon: XCircle },
  no_answer: { label: 'No answer', color: '#D9730D', bgColor: 'rgba(217,115,13,0.06)', icon: PhoneOff },
  busy: { label: 'Busy', color: '#D9730D', bgColor: 'rgba(217,115,13,0.06)', icon: PhoneOff },
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
    <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 12, fontFamily: 'monospace', color: '#4DAB9A' }}>
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
    <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 12, fontFamily: 'monospace', color: '#CB912F' }}>
      {mins}:{secs.toString().padStart(2, '0')} on hold
    </span>
  );
}

export function CallCard({ call }: { call: Call }) {
  const [showTranscript, setShowTranscript] = useState(false);
  const [showInsights, setShowInsights] = useState(false);

  const config = statusConfig[call.status] || statusConfig.queued;
  const StatusIcon = config.icon;
  const isActive = ACTIVE_STATUSES.includes(call.status);
  const isDone = DONE_STATUSES.includes(call.status);
  const isLiveTranscript = SHOW_TRANSCRIPT_STATUSES.includes(call.status);
  const isOnHold = call.status === 'on_hold';

  const getBorderColor = () => {
    if (isActive && !isOnHold && call.status !== 'retrying') return '#4DAB9A';
    if (isOnHold) return '#CB912F';
    if (call.status === 'retrying') return '#CB912F';
    if (isDone && call.status === 'completed') return 'rgba(77,171,154,0.3)';
    if (isDone && call.status === 'failed') return 'rgba(235,87,87,0.3)';
    return '#E3E2DE';
  };

  const hasMemories = !!(call.memory_extraction?.memories?.length && call.memory_extraction.memories.length > 0);
  const hasContact = !!call.memory_extraction?.contact_saved;
  const hasInsights = hasMemories || hasContact;

  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      border: `1px solid ${getBorderColor()}`,
      borderRadius: 8,
      boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
      overflow: 'hidden',
      transition: 'all 0.3s ease',
      opacity: (!isDone && !isActive) ? 0.75 : 1,
    }}>
      {/* Animations */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes notionPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes notionPing { 0% { transform: scale(1); opacity: 0.6; } 75%, 100% { transform: scale(2); opacity: 0; } }
      `}</style>

      {/* Header row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
      }}>
        {/* Status icon */}
        <div style={{
          display: 'flex',
          height: 40,
          width: 40,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 8,
          backgroundColor: config.bgColor,
          flexShrink: 0,
        }}>
          <StatusIcon style={{
            height: 16,
            width: 16,
            color: config.color,
            animation:
              (config.icon === Loader2 || config.icon === RotateCw)
                ? 'spin 1s linear infinite'
                : isActive ? 'notionPulse 2s cubic-bezier(0.4,0,0.6,1) infinite' : undefined,
          }} />
        </div>

        {/* Business info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h3 style={{
              fontWeight: 500,
              fontSize: 14,
              color: '#37352F',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              margin: 0,
            }}>
              {call.business_name}
            </h3>
            {(call.retry_count ?? 0) > 0 && (
              <span style={{
                fontSize: 10,
                padding: '0 6px',
                border: '1px solid #E3E2DE',
                borderRadius: 4,
                color: '#787774',
                lineHeight: '18px',
              }}>
                attempt {(call.retry_count ?? 0) + 1}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
            <span style={{ fontSize: 12, color: '#787774' }}>{call.phone_number}</span>
            {isLiveTranscript && call.started_at && (
              <>
                <span style={{ color: 'rgba(120,119,116,0.4)' }}>&middot;</span>
                <LiveTimer startedAt={call.started_at} />
              </>
            )}
            {isOnHold && call.hold_started_at && (
              <>
                <span style={{ color: 'rgba(120,119,116,0.4)' }}>&middot;</span>
                <HoldTimer holdStartedAt={call.hold_started_at} />
              </>
            )}
          </div>
        </div>

        {/* Status badge + duration */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {call.duration_seconds != null && call.duration_seconds > 0 && isDone && (
            <span style={{ fontSize: 12, color: '#787774', fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums' }}>
              {Math.floor(call.duration_seconds / 60)}m {call.duration_seconds % 60}s
            </span>
          )}
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            fontSize: 12,
            padding: '2px 10px',
            borderRadius: 4,
            backgroundColor: config.bgColor,
            color: config.color,
            fontWeight: 500,
          }}>
            {isActive && (
              <span style={{ position: 'relative', marginRight: 6, display: 'flex', height: 8, width: 8 }}>
                <span style={{
                  position: 'absolute',
                  display: 'inline-flex',
                  height: '100%',
                  width: '100%',
                  borderRadius: '50%',
                  backgroundColor: 'currentColor',
                  opacity: 0.6,
                  animation: isOnHold
                    ? 'notionPulse 2s cubic-bezier(0.4,0,0.6,1) infinite'
                    : 'notionPing 1s cubic-bezier(0,0,0.2,1) infinite',
                }} />
                <span style={{
                  position: 'relative',
                  display: 'inline-flex',
                  height: 8,
                  width: 8,
                  borderRadius: '50%',
                  backgroundColor: 'currentColor',
                }} />
              </span>
            )}
            {config.label}
          </span>
        </div>
      </div>

      {/* Status detail bar */}
      {call.status_detail && isActive && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 16px',
          fontSize: 12,
          color: config.color,
          backgroundColor: config.bgColor,
        }}>
          <StatusIcon style={{ height: 12, width: 12, flexShrink: 0 }} />
          {call.status_detail}
        </div>
      )}

      {/* Purpose — only for non-completed calls */}
      {!isDone && (
        <div style={{ padding: '0 16px 12px' }}>
          <p style={{ fontSize: 13, color: '#787774', margin: 0, lineHeight: 1.5 }}>{call.purpose}</p>
        </div>
      )}

      {/* Live transcript — auto-shown during active calls */}
      {isLiveTranscript && (
        <div style={{ padding: '0 16px 12px' }}>
          <p style={{
            fontSize: 12,
            fontWeight: 500,
            color: '#787774',
            marginBottom: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <span style={{ position: 'relative', display: 'flex', height: 8, width: 8 }}>
              <span style={{
                position: 'absolute',
                display: 'inline-flex',
                height: '100%',
                width: '100%',
                borderRadius: '50%',
                opacity: 0.6,
                backgroundColor: isOnHold ? '#CB912F' : '#4DAB9A',
                animation: isOnHold
                  ? 'notionPulse 2s cubic-bezier(0.4,0,0.6,1) infinite'
                  : 'notionPing 1s cubic-bezier(0,0,0.2,1) infinite',
              }} />
              <span style={{
                position: 'relative',
                display: 'inline-flex',
                height: 8,
                width: 8,
                borderRadius: '50%',
                backgroundColor: isOnHold ? '#CB912F' : '#4DAB9A',
              }} />
            </span>
            {isOnHold ? 'On hold \u2014 staying on the line' : 'Live conversation'}
          </p>
          <CallTranscript callId={call.id} />
        </div>
      )}

      {/* Result summary — the main thing for completed calls */}
      {call.result_summary && isDone && (
        <div style={{ padding: '0 16px 12px' }}>
          <p style={{
            fontSize: 14,
            color: '#37352F',
            margin: 0,
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
          }}>
            {cleanMarkdown(call.result_summary)}
          </p>
        </div>
      )}

      {/* Error */}
      {call.error && (
        <div style={{ padding: '0 16px 12px' }}>
          <div style={{
            borderRadius: 6,
            backgroundColor: 'rgba(235,87,87,0.06)',
            border: '1px solid rgba(235,87,87,0.2)',
            padding: 12,
          }}>
            <p style={{ fontSize: 12, fontWeight: 500, color: '#EB5757', marginBottom: 4 }}>Something went wrong</p>
            <p style={{ fontSize: 14, color: '#37352F', margin: 0 }}>{call.error}</p>
          </div>
        </div>
      )}

      {/* Action buttons — View Transcript, View Insights */}
      {isDone && (
        <div style={{
          display: 'flex',
          gap: 0,
          borderTop: '1px solid #E3E2DE',
        }}>
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '10px 12px',
              fontSize: 12,
              fontWeight: 500,
              color: showTranscript ? '#2383E2' : '#787774',
              backgroundColor: showTranscript ? 'rgba(35,131,226,0.04)' : 'transparent',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 150ms',
            }}
          >
            <FileText style={{ height: 13, width: 13 }} />
            {showTranscript ? 'Hide Transcript' : 'View Transcript'}
          </button>

          {hasInsights && (
            <>
              <div style={{ width: 1, backgroundColor: '#E3E2DE' }} />
              <button
                onClick={() => setShowInsights(!showInsights)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '10px 12px',
                  fontSize: 12,
                  fontWeight: 500,
                  color: showInsights ? '#6940A5' : '#787774',
                  backgroundColor: showInsights ? 'rgba(105,64,165,0.04)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 150ms',
                }}
              >
                <Lightbulb style={{ height: 13, width: 13 }} />
                {showInsights ? 'Hide Insights' : 'View Insights'}
                {hasMemories && (
                  <span style={{
                    fontSize: 10,
                    fontWeight: 600,
                    backgroundColor: 'rgba(105,64,165,0.1)',
                    color: '#6940A5',
                    padding: '1px 5px',
                    borderRadius: 3,
                  }}>
                    {call.memory_extraction!.memories.length}
                  </span>
                )}
              </button>
            </>
          )}
        </div>
      )}

      {/* Expanded transcript section */}
      {showTranscript && isDone && (
        <div style={{
          padding: '12px 16px 16px',
          borderTop: '1px solid #E3E2DE',
          backgroundColor: '#FAFAF9',
        }}>
          <CallTranscript callId={call.id} />
        </div>
      )}

      {/* Expanded insights section */}
      {showInsights && isDone && call.memory_extraction && (
        <div style={{
          padding: '12px 16px 16px',
          borderTop: '1px solid #E3E2DE',
          backgroundColor: '#FAFAF9',
        }}>
          {call.memory_extraction.memories?.length > 0 && (
            <div style={{ marginBottom: hasContact ? 12 : 0 }}>
              <p style={{
                fontSize: 12,
                fontWeight: 500,
                color: '#787774',
                marginBottom: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <Brain style={{ height: 14, width: 14, color: '#6940A5' }} />
                Remembered from this call
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {call.memory_extraction.memories.map((mem, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 8,
                    fontSize: 13,
                    lineHeight: 1.5,
                    padding: '6px 10px',
                    borderRadius: 6,
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E3E2DE',
                  }}>
                    <span style={{ color: '#787774', flexShrink: 0, fontWeight: 500 }}>{mem.key}</span>
                    <span style={{ color: '#37352F' }}>{mem.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {call.memory_extraction.contact_saved && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              color: '#2383E2',
              padding: '8px 10px',
              borderRadius: 6,
              backgroundColor: 'rgba(35,131,226,0.04)',
              border: '1px solid rgba(35,131,226,0.1)',
            }}>
              <BookUser style={{ height: 14, width: 14 }} />
              Saved {call.memory_extraction.contact_saved.name} to contacts
            </div>
          )}
        </div>
      )}
    </div>
  );
}
