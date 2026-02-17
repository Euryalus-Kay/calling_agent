'use client';

import { useState, useEffect } from 'react';
import { CallTranscript } from './call-transcript';
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

/** Strip markdown formatting characters from text */
function cleanMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')   // **bold** → bold
    .replace(/\*(.+?)\*/g, '$1')        // *italic* → italic
    .replace(/^#{1,6}\s+/gm, '')        // ## heading → heading
    .replace(/^-\s+/gm, '')             // - item → item
    .replace(/\n{3,}/g, '\n\n');         // collapse 3+ newlines
}

/** Parse result_summary into a header line and Q&A pairs */
function parseResultSummary(raw: string): { header: string | null; pairs: { question: string; answer: string }[] } {
  const cleaned = cleanMarkdown(raw).trim();
  const lines = cleaned.split('\n').map((l) => l.trim()).filter(Boolean);

  if (lines.length === 0) return { header: null, pairs: [] };

  // First line that does NOT contain " — " is the header
  let header: string | null = null;
  const pairs: { question: string; answer: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Check for Q&A separator (em dash or double hyphen)
    const sepMatch = line.match(/^(.+?)\s*[—–]\s*(.+)$/);
    if (sepMatch) {
      pairs.push({ question: sepMatch[1].trim(), answer: sepMatch[2].trim() });
    } else if (header === null && i === 0) {
      header = line;
    } else {
      // Treat as a standalone answer line (no question)
      pairs.push({ question: '', answer: line });
    }
  }

  return { header, pairs };
}

const statusConfig: Record<
  string,
  { label: string; color: string; bgColor: string; icon: React.ElementType; description?: string }
> = {
  queued: {
    label: 'In queue',
    color: '#787774',
    bgColor: 'rgba(120,119,116,0.06)',
    icon: Clock,
  },
  initiating: {
    label: 'Dialing',
    color: '#CB912F',
    bgColor: 'rgba(203,145,47,0.06)',
    icon: Loader2,
  },
  ringing: {
    label: 'Ringing',
    color: '#2383E2',
    bgColor: 'rgba(35,131,226,0.06)',
    icon: Phone,
  },
  in_progress: {
    label: 'On call',
    color: '#4DAB9A',
    bgColor: 'rgba(77,171,154,0.06)',
    icon: Phone,
  },
  on_hold: {
    label: 'On hold',
    color: '#CB912F',
    bgColor: 'rgba(203,145,47,0.06)',
    icon: Pause,
    description: 'Waiting patiently on hold',
  },
  navigating_menu: {
    label: 'Phone menu',
    color: '#6940A5',
    bgColor: 'rgba(105,64,165,0.06)',
    icon: Hash,
    description: 'Navigating automated menu',
  },
  transferred: {
    label: 'Transferred',
    color: '#6940A5',
    bgColor: 'rgba(105,64,165,0.06)',
    icon: ArrowRightLeft,
    description: 'Being transferred to the right department',
  },
  voicemail: {
    label: 'Voicemail',
    color: '#D9730D',
    bgColor: 'rgba(217,115,13,0.06)',
    icon: Voicemail,
    description: 'Leaving a voicemail message',
  },
  retrying: {
    label: 'Retrying',
    color: '#CB912F',
    bgColor: 'rgba(203,145,47,0.06)',
    icon: RotateCw,
    description: 'Trying again in a moment',
  },
  completed: {
    label: 'Done',
    color: '#4DAB9A',
    bgColor: 'rgba(77,171,154,0.06)',
    icon: CheckCircle,
  },
  failed: {
    label: 'Failed',
    color: '#EB5757',
    bgColor: 'rgba(235,87,87,0.06)',
    icon: XCircle,
  },
  no_answer: {
    label: 'No answer',
    color: '#D9730D',
    bgColor: 'rgba(217,115,13,0.06)',
    icon: PhoneOff,
  },
  busy: {
    label: 'Busy',
    color: '#D9730D',
    bgColor: 'rgba(217,115,13,0.06)',
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
    <span style={{
      fontVariantNumeric: 'tabular-nums',
      fontSize: 12,
      fontFamily: 'monospace',
      color: '#4DAB9A',
    }}>
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
    <span style={{
      fontVariantNumeric: 'tabular-nums',
      fontSize: 12,
      fontFamily: 'monospace',
      color: '#CB912F',
    }}>
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

  // Compute border color for the card
  const getBorderColor = () => {
    if (isActive && !isOnHold && !isRetrying) return '#4DAB9A';
    if (isOnHold) return '#CB912F';
    if (isRetrying) return '#CB912F';
    if (isDone && call.status === 'completed') return 'rgba(77,171,154,0.3)';
    if (isDone && call.status === 'failed') return 'rgba(235,87,87,0.3)';
    return '#E3E2DE';
  };

  // Compute status detail background/text color
  const getStatusDetailStyle = (): React.CSSProperties => {
    if (isOnHold) return { backgroundColor: 'rgba(203,145,47,0.06)', color: '#CB912F' };
    if (call.status === 'navigating_menu') return { backgroundColor: 'rgba(105,64,165,0.06)', color: '#6940A5' };
    if (call.status === 'transferred') return { backgroundColor: 'rgba(105,64,165,0.06)', color: '#6940A5' };
    if (isRetrying) return { backgroundColor: 'rgba(203,145,47,0.06)', color: '#CB912F' };
    return { backgroundColor: '#F7F6F3', color: '#787774' };
  };

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: `1px solid ${getBorderColor()}`,
        borderRadius: 8,
        boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        opacity: (!isDone && !isActive) ? 0.75 : 1,
      }}
    >
      {/* Header row */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          padding: '12px 16px',
          cursor: 'pointer',
          transition: 'background-color 0.15s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F7F6F3'; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
      >
        {/* Status indicator */}
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
          <StatusIcon
            style={{
              height: 16,
              width: 16,
              color: config.color,
              animation:
                (config.icon === Loader2 || config.icon === RotateCw)
                  ? 'spin 1s linear infinite'
                  : (isActive && config.icon !== Loader2 && config.icon !== RotateCw)
                    ? 'notionPulse 2s cubic-bezier(0.4,0,0.6,1) infinite'
                    : undefined,
            }}
          />
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
            {SHOW_TRANSCRIPT_STATUSES.includes(call.status) && call.started_at && (
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

        {/* Status badge + expand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
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
          {expanded ? (
            <ChevronUp style={{ height: 16, width: 16, color: '#787774' }} />
          ) : (
            <ChevronDown style={{ height: 16, width: 16, color: '#787774' }} />
          )}
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Status detail */}
          {call.status_detail && isActive && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              borderRadius: 6,
              padding: '8px 12px',
              fontSize: 12,
              ...getStatusDetailStyle(),
            }}>
              <StatusIcon style={{ height: 14, width: 14, flexShrink: 0, color: config.color }} />
              {call.status_detail}
            </div>
          )}

          {/* Purpose */}
          <div style={{
            borderRadius: 6,
            backgroundColor: '#F7F6F3',
            padding: 12,
          }}>
            <p style={{ fontSize: 12, fontWeight: 500, color: '#787774', marginBottom: 4 }}>Purpose</p>
            <p style={{ fontSize: 14, color: '#37352F', margin: 0, lineHeight: 1.5 }}>{call.purpose}</p>
          </div>

          {/* Live transcript */}
          {showTranscript && (
            <div>
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

          {/* Completed transcript */}
          {call.status === 'completed' && (
            <CallTranscript callId={call.id} />
          )}

          {/* Result */}
          {call.result_summary && (() => {
            const { header, pairs } = parseResultSummary(call.result_summary);
            return (
              <div style={{
                borderRadius: 6,
                backgroundColor: 'rgba(77,171,154,0.06)',
                border: '1px solid rgba(77,171,154,0.2)',
                padding: 12,
              }}>
                <p style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: '#4DAB9A',
                  marginBottom: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  <CheckCircle style={{ height: 14, width: 14 }} />
                  What I found
                </p>

                <div style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E3E2DE',
                  borderRadius: 6,
                  padding: '10px 14px',
                }}>
                  {header && (
                    <p style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: '#37352F',
                      margin: 0,
                      paddingBottom: pairs.length > 0 ? 10 : 0,
                      borderBottom: pairs.length > 0 ? '1px solid #F0EFEC' : 'none',
                    }}>
                      {header}
                    </p>
                  )}
                  {pairs.length > 0 && (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      paddingTop: header ? 10 : 0,
                    }}>
                      {pairs.map((pair, idx) => (
                        <div key={idx} style={{ lineHeight: 1.5 }}>
                          {pair.question && (
                            <span style={{ fontSize: 13, color: '#787774' }}>
                              {pair.question}
                            </span>
                          )}
                          {pair.question && pair.answer && (
                            <span style={{ fontSize: 13, color: '#9B9A97', margin: '0 6px' }}>&mdash;</span>
                          )}
                          <span style={{ fontSize: 13, color: '#37352F', fontWeight: 500 }}>
                            {pair.answer}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Error */}
          {call.error && (
            <div style={{
              borderRadius: 6,
              backgroundColor: 'rgba(235,87,87,0.06)',
              border: '1px solid rgba(235,87,87,0.2)',
              padding: 12,
            }}>
              <p style={{ fontSize: 12, fontWeight: 500, color: '#EB5757', marginBottom: 4 }}>Something went wrong</p>
              <p style={{ fontSize: 14, color: '#37352F', margin: 0 }}>{call.error}</p>
            </div>
          )}

          {/* Duration */}
          {call.duration_seconds != null && call.duration_seconds > 0 && isDone && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              color: '#787774',
            }}>
              <Clock style={{ height: 12, width: 12 }} />
              {Math.floor(call.duration_seconds / 60)}m {call.duration_seconds % 60}s
            </div>
          )}
        </div>
      )}

      {/* Keyframe for spin animation used by Loader2/RotateCw */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes notionPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes notionPing {
          0% { transform: scale(1); opacity: 0.6; }
          75%, 100% { transform: scale(2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
