'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Send,
  Phone,
  Loader2,
  Copy,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Clock,
  MessageSquare,
  Search,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import type { ChatMessage, CallPlan, PlannedCall } from '@/types';

// ---------------------------------------------------------------------------
// Notion color palette
// ---------------------------------------------------------------------------

const COLORS = {
  text: '#37352F',
  secondary: '#787774',
  border: '#E3E2DE',
  warmBg: '#F7F6F3',
  accent: '#2383E2',
  white: '#FFFFFF',
  red: '#EB5757',
  green: '#4DAB9A',
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Very small markdown-like formatter. No library needed. */
function formatAssistantText(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let listBuffer: string[] = [];
  let key = 0;

  function flushList() {
    if (listBuffer.length === 0) return;
    elements.push(
      <ul
        key={key++}
        style={{
          margin: '6px 0',
          marginLeft: 16,
          listStyleType: 'disc',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {listBuffer.map((item, i) => (
          <li
            key={i}
            style={{ fontSize: 14, lineHeight: 1.625, color: COLORS.text }}
          >
            {inlineFormat(item)}
          </li>
        ))}
      </ul>,
    );
    listBuffer = [];
  }

  for (const line of lines) {
    const trimmed = line.trim();

    // Bullet points: -, *, or numbered (1.)
    const bulletMatch = trimmed.match(/^(?:[-*]|\d+\.)\s+(.*)/);
    if (bulletMatch) {
      listBuffer.push(bulletMatch[1]);
      continue;
    }

    flushList();

    if (trimmed === '') {
      elements.push(<div key={key++} style={{ height: 8 }} />);
    } else if (trimmed.startsWith('###')) {
      elements.push(
        <p
          key={key++}
          style={{
            fontSize: 14,
            fontWeight: 600,
            marginTop: 8,
            marginBottom: 2,
            color: COLORS.text,
          }}
        >
          {inlineFormat(trimmed.replace(/^#{1,3}\s*/, ''))}
        </p>,
      );
    } else {
      elements.push(
        <p
          key={key++}
          style={{ fontSize: 14, lineHeight: 1.625, color: COLORS.text }}
        >
          {inlineFormat(trimmed)}
        </p>,
      );
    }
  }
  flushList();
  return elements;
}

/** Handle **bold** and *italic* inline */
function inlineFormat(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Match **bold** and *italic*
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let k = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    if (match[2]) {
      parts.push(
        <strong key={k++} style={{ fontWeight: 600 }}>
          {match[2]}
        </strong>,
      );
    } else if (match[3]) {
      parts.push(
        <em key={k++} style={{ fontStyle: 'italic' }}>
          {match[3]}
        </em>,
      );
    }
    last = match.index + match[0].length;
  }

  if (last < text.length) {
    parts.push(text.slice(last));
  }

  return parts.length > 0 ? parts : [text];
}

/** Parse a duration like "5 min" or "10 minutes" into a number of minutes */
function parseDurationMinutes(dur?: string): number {
  if (!dur) return 5; // default estimate
  const num = parseInt(dur, 10);
  return isNaN(num) ? 5 : num;
}

const PRIORITY_CONFIG = {
  high: {
    dotColor: COLORS.red,
    label: 'High',
    ringColor: 'rgba(235, 87, 87, 0.15)',
    bgColor: 'rgba(235, 87, 87, 0.06)',
    textColor: '#C4554D',
  },
  medium: {
    dotColor: '#CB912F',
    label: 'Medium',
    ringColor: 'rgba(203, 145, 47, 0.15)',
    bgColor: 'rgba(203, 145, 47, 0.06)',
    textColor: '#CB912F',
  },
  low: {
    dotColor: COLORS.green,
    label: 'Low',
    ringColor: 'rgba(77, 171, 154, 0.15)',
    bgColor: 'rgba(77, 171, 154, 0.06)',
    textColor: '#448361',
  },
} as const;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Animated typing dots */
function TypingIndicator() {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
      <div
        style={{
          backgroundColor: COLORS.warmBg,
          borderRadius: '16px 16px 16px 6px',
          padding: '12px 16px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            <span
              className="notion-bounce"
              style={{
                display: 'inline-block',
                height: 8,
                width: 8,
                borderRadius: '50%',
                backgroundColor: COLORS.secondary,
                animationDelay: '0ms',
                animationDuration: '1.2s',
              }}
            />
            <span
              className="notion-bounce"
              style={{
                display: 'inline-block',
                height: 8,
                width: 8,
                borderRadius: '50%',
                backgroundColor: COLORS.secondary,
                animationDelay: '150ms',
                animationDuration: '1.2s',
              }}
            />
            <span
              className="notion-bounce"
              style={{
                display: 'inline-block',
                height: 8,
                width: 8,
                borderRadius: '50%',
                backgroundColor: COLORS.secondary,
                animationDelay: '300ms',
                animationDuration: '1.2s',
              }}
            />
          </div>
          <span
            style={{
              fontSize: 12,
              color: COLORS.secondary,
              marginLeft: 6,
            }}
          >
            Thinking...
          </span>
        </div>
      </div>
    </div>
  );
}

/** Single planned call card */
function CallCard({
  call,
  index,
  onRemove,
}: {
  call: PlannedCall;
  index: number;
  onRemove: (index: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);
  const priority = call.priority ?? 'medium';
  const config = PRIORITY_CONFIG[priority];
  const isLookup = !call.phone_number || call.phone_number === 'LOOKUP_NEEDED';

  const handleCopy = useCallback(async () => {
    if (isLookup) return;
    await navigator.clipboard.writeText(call.phone_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [call.phone_number, isLookup]);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        borderRadius: 8,
        border: `1px solid ${COLORS.border}`,
        backgroundColor: COLORS.white,
        boxShadow: hovered
          ? '0 1px 2px rgba(0,0,0,0.06)'
          : 'none',
        transition: 'all 200ms',
      }}
    >
      {/* Remove button */}
      <button
        type="button"
        onClick={() => onRemove(index)}
        style={{
          position: 'absolute',
          right: -8,
          top: -8,
          zIndex: 10,
          display: 'flex',
          height: 24,
          width: 24,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          border: `1px solid ${COLORS.border}`,
          backgroundColor: COLORS.white,
          color: COLORS.secondary,
          cursor: 'pointer',
          opacity: hovered ? 1 : 0,
          transition: 'opacity 150ms',
          padding: 0,
        }}
        aria-label={`Remove call to ${call.business_name}`}
      >
        <X style={{ height: 12, width: 12 }} />
      </button>

      <div style={{ padding: 16 }}>
        {/* Top row: priority dot, name, badges */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          {/* Priority indicator */}
          <div
            style={{
              marginTop: 4,
              flexShrink: 0,
              height: 12,
              width: 12,
              borderRadius: '50%',
              backgroundColor: config.dotColor,
              boxShadow: `0 0 0 4px ${config.ringColor}`,
            }}
          />

          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Name row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <h4
                style={{
                  fontWeight: 500,
                  fontSize: 14,
                  color: COLORS.text,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  margin: 0,
                }}
              >
                {call.business_name}
              </h4>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  flexShrink: 0,
                }}
              >
                {call.expected_duration && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 12,
                      color: COLORS.secondary,
                      backgroundColor: COLORS.warmBg,
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontWeight: 400,
                    }}
                  >
                    <Clock style={{ height: 12, width: 12 }} />
                    {call.expected_duration}
                  </span>
                )}
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    fontSize: 12,
                    color: config.textColor,
                    border: `1px solid ${COLORS.border}`,
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontWeight: 400,
                  }}
                >
                  {config.label}
                </span>
              </div>
            </div>

            {/* Purpose */}
            <p
              style={{
                fontSize: 12,
                color: COLORS.secondary,
                marginTop: 4,
                lineHeight: 1.625,
                margin: '4px 0 0 0',
              }}
            >
              {call.purpose}
            </p>

            {/* Phone number row */}
            <div
              style={{
                marginTop: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {isLookup ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 12,
                    color: COLORS.secondary,
                    backgroundColor: COLORS.warmBg,
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontWeight: 400,
                  }}
                >
                  <Search style={{ height: 12, width: 12 }} />
                  Will look up number
                </span>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontFamily: 'monospace',
                      color: COLORS.secondary,
                    }}
                  >
                    {call.phone_number}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    style={{
                      display: 'inline-flex',
                      height: 24,
                      width: 24,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 4,
                      color: COLORS.secondary,
                      border: 'none',
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                      padding: 0,
                      transition: 'background-color 150ms',
                    }}
                    aria-label="Copy phone number"
                  >
                    {copied ? (
                      <Check
                        style={{
                          height: 12,
                          width: 12,
                          color: COLORS.green,
                        }}
                      />
                    ) : (
                      <Copy style={{ height: 12, width: 12 }} />
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Expandable questions */}
            {call.questions.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setExpanded(!expanded)}
                  style={{
                    display: 'flex',
                    width: '100%',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12,
                    fontWeight: 500,
                    color: COLORS.secondary,
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    padding: 0,
                    transition: 'color 150ms',
                  }}
                >
                  <MessageSquare style={{ height: 12, width: 12 }} />
                  {call.questions.length} question
                  {call.questions.length !== 1 ? 's' : ''} to ask
                  {expanded ? (
                    <ChevronUp
                      style={{ height: 12, width: 12, marginLeft: 'auto' }}
                    />
                  ) : (
                    <ChevronDown
                      style={{ height: 12, width: 12, marginLeft: 'auto' }}
                    />
                  )}
                </button>

                <div
                  style={{
                    overflow: 'hidden',
                    transition: 'all 200ms ease-in-out',
                    maxHeight: expanded ? 384 : 0,
                    opacity: expanded ? 1 : 0,
                    marginTop: expanded ? 8 : 0,
                  }}
                >
                  <ul
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                      borderRadius: 8,
                      backgroundColor: COLORS.warmBg,
                      padding: 12,
                      margin: 0,
                      listStyle: 'none',
                    }}
                  >
                    {call.questions.map((q, qi) => (
                      <li
                        key={qi}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 8,
                          fontSize: 12,
                          color: COLORS.secondary,
                        }}
                      >
                        <span
                          style={{
                            marginTop: 2,
                            flexShrink: 0,
                            display: 'flex',
                            height: 16,
                            width: 16,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(35, 131, 226, 0.1)',
                            fontSize: 10,
                            fontWeight: 500,
                            color: COLORS.accent,
                          }}
                        >
                          {qi + 1}
                        </span>
                        <span style={{ lineHeight: 1.625 }}>{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Empty state when there are no messages yet */
function EmptyState() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: '48px 16px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          display: 'flex',
          height: 56,
          width: 56,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 16,
          backgroundColor: 'rgba(35, 131, 226, 0.1)',
          marginBottom: 16,
        }}
      >
        <Sparkles style={{ height: 28, width: 28, color: COLORS.accent }} />
      </div>
      <h3
        style={{
          fontSize: 16,
          fontWeight: 600,
          marginBottom: 6,
          color: COLORS.text,
          margin: '0 0 6px 0',
        }}
      >
        Tell me what calls you need made
      </h3>
      <p
        style={{
          fontSize: 14,
          color: COLORS.secondary,
          maxWidth: 384,
          lineHeight: 1.625,
          margin: 0,
        }}
      >
        Describe what you need and I will put together a plan, figure out who to
        call, and handle everything for you.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface PlanningChatProps {
  taskId: string;
  initialMessages: ChatMessage[];
  plan: CallPlan | null;
  status: string;
}

export function PlanningChat({
  taskId,
  initialMessages,
  plan,
  status,
}: PlanningChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<CallPlan | null>(plan);
  const [currentStatus, setCurrentStatus] = useState(status);
  const [initiating, setInitiating] = useState(false);
  const [removedIndices, setRemovedIndices] = useState<Set<number>>(
    new Set(),
  );
  const [inputFocused, setInputFocused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Filtered calls (with removals applied)
  const activeCalls = useMemo(() => {
    if (!currentPlan) return [];
    return currentPlan.calls.filter((_, i) => !removedIndices.has(i));
  }, [currentPlan, removedIndices]);

  // Total estimated duration
  const totalDuration = useMemo(() => {
    return activeCalls.reduce(
      (acc, call) => acc + parseDurationMinutes(call.expected_duration),
      0,
    );
  }, [activeCalls]);

  const handleRemoveCall = useCallback((index: number) => {
    setRemovedIndices((prev) => {
      const next = new Set(prev);
      // We need to map from the filtered index back to the original index
      // The CallCard receives the original index, so we use that directly
      next.add(index);
      return next;
    });
  }, []);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setSending(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, message: userMsg }),
      });
      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.message },
      ]);

      if (data.plan) {
        setCurrentPlan(data.plan);
        setCurrentStatus('ready');
        setRemovedIndices(new Set());
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, something went wrong. Please try again.',
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  async function handleStartCalls() {
    if (activeCalls.length === 0) return;
    setInitiating(true);
    try {
      const res = await fetch('/api/calls/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          // Send only the calls the user kept
          removedIndices: Array.from(removedIndices),
        }),
      });

      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        console.error('Call initiate failed:', res.status, data);
        alert(`Failed to start calls: ${data.error || res.statusText}`);
        setInitiating(false);
      }
    } catch (err) {
      console.error('Call initiate error:', err);
      setInitiating(false);
    }
  }

  const showInput = currentStatus !== 'ready';
  const showPlan = currentPlan && currentStatus === 'ready';

  // Full-screen initiating overlay
  if (initiating) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#FFFFFF',
          animationName: 'initOverlayIn',
          animationDuration: '0.4s',
          animationFillMode: 'both',
          animationTimingFunction: 'ease-out',
        }}
      >
        {/* Animated rings */}
        <div style={{ position: 'relative', height: 120, width: 120, marginBottom: 32 }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: `2px solid rgba(35,131,226,0.1)`,
            animationName: 'ringPulse',
            animationDuration: '2s',
            animationIterationCount: 'infinite',
            animationTimingFunction: 'ease-out',
          }} />
          <div style={{
            position: 'absolute',
            inset: 10,
            borderRadius: '50%',
            border: `2px solid rgba(35,131,226,0.15)`,
            animationName: 'ringPulse',
            animationDuration: '2s',
            animationDelay: '0.3s',
            animationIterationCount: 'infinite',
            animationTimingFunction: 'ease-out',
          }} />
          <div style={{
            position: 'absolute',
            inset: 20,
            borderRadius: '50%',
            border: `2px solid rgba(35,131,226,0.2)`,
            animationName: 'ringPulse',
            animationDuration: '2s',
            animationDelay: '0.6s',
            animationIterationCount: 'infinite',
            animationTimingFunction: 'ease-out',
          }} />
          <div style={{
            position: 'absolute',
            inset: 30,
            borderRadius: '50%',
            backgroundColor: 'rgba(35,131,226,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Phone style={{
              height: 28,
              width: 28,
              color: COLORS.accent,
              animationName: 'phoneRing',
              animationDuration: '0.5s',
              animationIterationCount: 'infinite',
              animationDirection: 'alternate',
              animationTimingFunction: 'ease-in-out',
            }} />
          </div>
        </div>

        <h2 style={{
          fontSize: 20,
          fontWeight: 600,
          color: COLORS.text,
          margin: '0 0 8px',
          animationName: 'fadeInUp',
          animationDuration: '0.5s',
          animationDelay: '0.2s',
          animationFillMode: 'both',
        }}>
          Placing your calls
        </h2>
        <p style={{
          fontSize: 14,
          color: COLORS.secondary,
          margin: 0,
          animationName: 'fadeInUp',
          animationDuration: '0.5s',
          animationDelay: '0.4s',
          animationFillMode: 'both',
        }}>
          {activeCalls.length} call{activeCalls.length !== 1 ? 's' : ''} going out now...
        </p>

        {/* Call names appearing one by one */}
        <div style={{
          marginTop: 32,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          alignItems: 'center',
        }}>
          {activeCalls.slice(0, 5).map((call, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 16px',
              borderRadius: 8,
              backgroundColor: COLORS.warmBg,
              animationName: 'fadeInUp',
              animationDuration: '0.4s',
              animationDelay: `${0.5 + i * 0.15}s`,
              animationFillMode: 'both',
            }}>
              <div style={{
                height: 8,
                width: 8,
                borderRadius: '50%',
                backgroundColor: COLORS.accent,
                animationName: 'dotPulse',
                animationDuration: '1.5s',
                animationIterationCount: 'infinite',
                animationDelay: `${i * 0.2}s`,
              }} />
              <span style={{ fontSize: 14, color: COLORS.text, fontWeight: 500 }}>
                {call.business_name}
              </span>
              <span style={{ fontSize: 12, color: COLORS.secondary, fontFamily: 'monospace' }}>
                {call.phone_number}
              </span>
            </div>
          ))}
        </div>

        <style>{`
          @keyframes initOverlayIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes ringPulse {
            0% { transform: scale(1); opacity: 1; }
            100% { transform: scale(1.4); opacity: 0; }
          }
          @keyframes phoneRing {
            0% { transform: rotate(-8deg); }
            100% { transform: rotate(8deg); }
          }
          @keyframes dotPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div
      style={{
        marginLeft: 'auto',
        marginRight: 'auto',
        width: '100%',
        maxWidth: 672,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        padding: 16,
      }}
    >
      {/* ---- Chat messages ---- */}
      <div
        style={{
          overflow: 'hidden',
          border: `1px solid ${COLORS.border}`,
          borderRadius: 8,
          backgroundColor: COLORS.white,
          boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
        }}
      >
        <div
          style={{
            height: 420,
            overflowY: 'auto',
          }}
        >
          <div style={{ padding: 20 }}>
            {messages.length === 0 && !sending ? (
              <EmptyState />
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                }}
              >
                {messages.map((msg, i) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        justifyContent: isUser ? 'flex-end' : 'flex-start',
                        animationName: 'fadeInUp',
                        animationDuration: '0.25s',
                        animationFillMode: 'both',
                        animationTimingFunction: 'ease-out',
                      }}
                    >
                      {!isUser && (
                        <div
                          style={{
                            marginRight: 10,
                            marginTop: 4,
                            flexShrink: 0,
                            display: 'flex',
                            height: 28,
                            width: 28,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(35, 131, 226, 0.1)',
                          }}
                        >
                          <Sparkles
                            style={{
                              height: 14,
                              width: 14,
                              color: COLORS.accent,
                            }}
                          />
                        </div>
                      )}
                      <div
                        style={{
                          maxWidth: '80%',
                          ...(isUser
                            ? {
                                borderRadius: '16px 16px 6px 16px',
                                backgroundColor: COLORS.accent,
                                color: COLORS.white,
                                padding: '10px 16px',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                              }
                            : {
                                borderRadius: '16px 16px 16px 6px',
                                backgroundColor: COLORS.warmBg,
                                color: COLORS.text,
                                padding: '12px 16px',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                              }),
                        }}
                      >
                        {isUser ? (
                          <p
                            style={{
                              fontSize: 14,
                              lineHeight: 1.625,
                              margin: 0,
                              color: COLORS.white,
                            }}
                          >
                            {msg.content}
                          </p>
                        ) : (
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 2,
                            }}
                          >
                            {formatAssistantText(msg.content)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Typing indicator */}
                {sending && <TypingIndicator />}

                <div ref={scrollRef} />
              </div>
            )}
          </div>
        </div>

        {/* ---- Input bar ---- */}
        {showInput && (
          <div
            style={{
              borderTop: `1px solid ${COLORS.border}`,
              backgroundColor: COLORS.white,
              padding: '12px 16px',
            }}
          >
            <form
              onSubmit={handleSend}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  placeholder={
                    messages.length === 0
                      ? 'e.g. "Schedule a dentist appointment for next week"'
                      : 'Type your response...'
                  }
                  disabled={sending}
                  style={{
                    width: '100%',
                    height: 40,
                    padding: '0 16px',
                    fontSize: 14,
                    color: COLORS.text,
                    backgroundColor: COLORS.white,
                    border: `1px solid ${inputFocused ? COLORS.accent : COLORS.border}`,
                    borderRadius: 8,
                    outline: 'none',
                    boxShadow: inputFocused
                      ? `0 0 0 3px rgba(35, 131, 226, 0.15)`
                      : 'none',
                    transition: 'border-color 200ms, box-shadow 200ms',
                    opacity: sending ? 0.6 : 1,
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={!input.trim() || sending}
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  height: 40,
                  width: 40,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor:
                    !input.trim() || sending
                      ? COLORS.border
                      : COLORS.accent,
                  color: COLORS.white,
                  cursor:
                    !input.trim() || sending ? 'not-allowed' : 'pointer',
                  transition: 'transform 150ms, background-color 150ms',
                  padding: 0,
                }}
              >
                <Send style={{ height: 16, width: 16 }} />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* ---- Call Plan ---- */}
      {showPlan && (
        <div
          style={{
            animationName: 'fadeInUp',
            animationDuration: '0.35s',
            animationFillMode: 'both',
            animationTimingFunction: 'ease-out',
          }}
        >
          <div
            style={{
              border: `1px solid ${COLORS.border}`,
              borderRadius: 8,
              backgroundColor: COLORS.white,
              boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
            }}
          >
            {/* Card Header */}
            <div
              style={{
                padding: '20px 24px 0 24px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <h3
                    style={{
                      fontSize: 18,
                      fontWeight: 600,
                      color: COLORS.text,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      margin: 0,
                    }}
                  >
                    <Phone
                      style={{
                        height: 16,
                        width: 16,
                        color: COLORS.accent,
                      }}
                    />
                    Call Plan
                  </h3>
                  <p
                    style={{
                      fontSize: 14,
                      color: COLORS.secondary,
                      marginTop: 4,
                      margin: '4px 0 0 0',
                    }}
                  >
                    {currentPlan!.summary}
                  </p>
                </div>

                {/* Duration pill */}
                {activeCalls.length > 0 && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12,
                      color: COLORS.secondary,
                      backgroundColor: COLORS.warmBg,
                      padding: '4px 10px',
                      borderRadius: 4,
                      fontWeight: 400,
                      flexShrink: 0,
                    }}
                  >
                    <Clock style={{ height: 12, width: 12 }} />
                    ~{totalDuration} min total
                  </span>
                )}
              </div>
            </div>

            {/* Card Content */}
            <div
              style={{
                padding: '16px 24px 24px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              {activeCalls.length === 0 ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '32px 0',
                    textAlign: 'center',
                  }}
                >
                  <AlertCircle
                    style={{
                      height: 32,
                      width: 32,
                      color: 'rgba(120, 119, 116, 0.4)',
                      marginBottom: 8,
                    }}
                  />
                  <p
                    style={{
                      fontSize: 14,
                      color: COLORS.secondary,
                      margin: 0,
                    }}
                  >
                    All calls have been removed.
                  </p>
                  <p
                    style={{
                      fontSize: 12,
                      color: 'rgba(120, 119, 116, 0.7)',
                      marginTop: 2,
                      margin: '2px 0 0 0',
                    }}
                  >
                    Continue the conversation to build a new plan.
                  </p>
                </div>
              ) : (
                <>
                  {currentPlan!.calls.map((call, i) => {
                    if (removedIndices.has(i)) return null;
                    return (
                      <CallCard
                        key={`${call.business_name}-${i}`}
                        call={call}
                        index={i}
                        onRemove={handleRemoveCall}
                      />
                    );
                  })}
                </>
              )}

              {/* Start Calls button */}
              {activeCalls.length > 0 && (
                <button
                  onClick={handleStartCalls}
                  style={{
                    width: '100%',
                    marginTop: 16,
                    height: 44,
                    fontSize: 14,
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 8,
                    border: 'none',
                    backgroundColor: COLORS.accent,
                    color: COLORS.white,
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                    transition: 'all 200ms',
                    padding: 0,
                  }}
                >
                  <Phone
                    style={{ marginRight: 8, height: 16, width: 16 }}
                  />
                  Start {activeCalls.length} Call
                  {activeCalls.length !== 1 ? 's' : ''}
                </button>
              )}

              {/* Back-to-chat when all removed */}
              {activeCalls.length === 0 && (
                <button
                  style={{
                    width: '100%',
                    height: 40,
                    fontSize: 14,
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 8,
                    border: `1px solid ${COLORS.border}`,
                    backgroundColor: COLORS.white,
                    color: COLORS.text,
                    cursor: 'pointer',
                    transition: 'background-color 150ms',
                    padding: 0,
                  }}
                  onClick={() => {
                    setCurrentStatus('planning');
                    setRemovedIndices(new Set());
                    inputRef.current?.focus();
                  }}
                >
                  Back to conversation
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---- Inline keyframes (no external CSS needed) ---- */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes notionBounce {
          0%, 60%, 100% {
            transform: translateY(0);
          }
          30% {
            transform: translateY(-4px);
          }
        }
        .notion-bounce {
          animation-name: notionBounce;
          animation-iteration-count: infinite;
        }
        @keyframes notionSpin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .notion-spin {
          animation: notionSpin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
