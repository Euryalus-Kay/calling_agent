'use client';

import { useRef, useEffect } from 'react';
import { useRealtimeTranscript } from '@/hooks/use-realtime-transcript';
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

const eventColors: Record<string, { color: string; backgroundColor: string; borderColor: string }> = {
  hold_start: {
    color: '#9A6700',
    backgroundColor: 'rgba(154, 103, 0, 0.06)',
    borderColor: 'rgba(154, 103, 0, 0.15)',
  },
  hold_end: {
    color: '#2A7E4F',
    backgroundColor: 'rgba(42, 126, 79, 0.06)',
    borderColor: 'rgba(42, 126, 79, 0.15)',
  },
  transfer: {
    color: '#6940A5',
    backgroundColor: 'rgba(105, 64, 165, 0.06)',
    borderColor: 'rgba(105, 64, 165, 0.15)',
  },
  dtmf: {
    color: '#2383E2',
    backgroundColor: 'rgba(35, 131, 226, 0.06)',
    borderColor: 'rgba(35, 131, 226, 0.15)',
  },
  dtmf_received: {
    color: '#2383E2',
    backgroundColor: 'rgba(35, 131, 226, 0.06)',
    borderColor: 'rgba(35, 131, 226, 0.15)',
  },
  voicemail: {
    color: '#D9730D',
    backgroundColor: 'rgba(217, 115, 13, 0.06)',
    borderColor: 'rgba(217, 115, 13, 0.15)',
  },
  answer_captured: {
    color: '#0F7B6C',
    backgroundColor: 'rgba(15, 123, 108, 0.06)',
    borderColor: 'rgba(15, 123, 108, 0.15)',
  },
  retry_needed: {
    color: '#CB912F',
    backgroundColor: 'rgba(203, 145, 47, 0.06)',
    borderColor: 'rgba(203, 145, 47, 0.15)',
  },
};

const defaultEventColor = {
  color: '#787774',
  backgroundColor: 'rgba(120, 119, 116, 0.06)',
  borderColor: 'rgba(120, 119, 116, 0.15)',
};

/** Format system event content for display */
function formatEventContent(entry: TranscriptEntry): string {
  const content = entry.content;
  const eventType = entry.event_type;

  // answer_captured events come as "question_text: value" — make them nice
  if (eventType === 'answer_captured') {
    const match = content.match(/^(.+?):\s*(.+)$/);
    if (match) {
      return `${match[1].trim()} \u2192 ${match[2].trim()}`;
    }
  }

  return content;
}

function SystemEvent({ entry }: { entry: TranscriptEntry }) {
  const eventType = entry.event_type || 'default';
  const Icon = eventIcons[eventType] || AlertCircle;
  const colors = eventColors[eventType] || defaultEventColor;

  // Hide noisy events that add clutter
  if (eventType === 'dtmf' || eventType === 'dtmf_received') return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderRadius: 6,
        border: `1px solid ${colors.borderColor}`,
        paddingLeft: 12,
        paddingRight: 12,
        paddingTop: 6,
        paddingBottom: 6,
        fontSize: 12,
        lineHeight: '16px',
        marginLeft: 16,
        marginRight: 16,
        color: colors.color,
        backgroundColor: colors.backgroundColor,
      }}
    >
      <Icon style={{ height: 12, width: 12, flexShrink: 0 }} />
      <span>{formatEventContent(entry)}</span>
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
    <div
      style={{
        overflow: 'auto',
        maxHeight: 256,
        borderRadius: 8,
        border: '1px solid #E3E2DE',
        backgroundColor: '#FFFFFF',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12 }}>
        {entries.map((entry) => {
          if (entry.speaker === 'system') {
            return <SystemEvent key={entry.id} entry={entry} />;
          }

          const isAgent = entry.speaker === 'agent';

          return (
            <div
              key={entry.id}
              style={{
                display: 'flex',
                gap: 8,
                fontSize: 14,
                lineHeight: '20px',
                flexDirection: isAgent ? 'row' : 'row-reverse',
              }}
            >
              <div
                style={{
                  maxWidth: '80%',
                  borderRadius: 8,
                  paddingLeft: 12,
                  paddingRight: 12,
                  paddingTop: 6,
                  paddingBottom: 6,
                  backgroundColor: isAgent ? 'rgba(35, 131, 226, 0.06)' : '#F7F6F3',
                  color: isAgent ? '#2383E2' : '#37352F',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 2,
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      opacity: 0.6,
                    }}
                  >
                    {isAgent ? 'AI Agent' : 'Business'}
                  </span>
                  {firstEntryAt && (
                    <span
                      style={{
                        fontSize: 10,
                        fontFamily: 'monospace',
                        opacity: 0.4,
                      }}
                    >
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
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              paddingTop: 32,
              paddingBottom: 32,
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', gap: 4 }}>
              <span
                className="animate-bounce"
                style={{
                  height: 8,
                  width: 8,
                  borderRadius: '50%',
                  backgroundColor: '#787774',
                  display: 'inline-block',
                  opacity: 0.3,
                  animationDelay: '0ms',
                }}
              />
              <span
                className="animate-bounce"
                style={{
                  height: 8,
                  width: 8,
                  borderRadius: '50%',
                  backgroundColor: '#787774',
                  display: 'inline-block',
                  opacity: 0.3,
                  animationDelay: '150ms',
                }}
              />
              <span
                className="animate-bounce"
                style={{
                  height: 8,
                  width: 8,
                  borderRadius: '50%',
                  backgroundColor: '#787774',
                  display: 'inline-block',
                  opacity: 0.3,
                  animationDelay: '300ms',
                }}
              />
            </div>
            <p
              style={{
                fontSize: 14,
                color: '#787774',
              }}
            >
              Waiting for conversation to begin...
            </p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
