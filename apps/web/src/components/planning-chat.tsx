'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  Pencil,
  Zap,
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
  onEditSms,
}: {
  call: PlannedCall;
  index: number;
  onRemove: (index: number) => void;
  onEditSms?: (index: number, newBody: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [editingSms, setEditingSms] = useState(false);
  const [editedSmsBody, setEditedSmsBody] = useState(call.sms_body || '');
  const priority = call.priority ?? 'medium';
  const config = PRIORITY_CONFIG[priority];
  const isLookup = !call.phone_number || call.phone_number === 'LOOKUP_NEEDED';
  const isSMS = call.type === 'sms';

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
                {isSMS && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 11,
                      fontWeight: 500,
                      color: '#6940A5',
                      backgroundColor: 'rgba(105, 64, 165, 0.06)',
                      padding: '2px 8px',
                      borderRadius: 4,
                    }}
                  >
                    <MessageSquare style={{ height: 11, width: 11 }} />
                    SMS
                  </span>
                )}
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

            {/* SMS body preview / editor */}
            {isSMS && call.sms_body && (
              <div style={{
                marginTop: 10,
                padding: 10,
                borderRadius: 6,
                backgroundColor: 'rgba(105, 64, 165, 0.04)',
                border: `1px solid ${editingSms ? '#6940A5' : 'rgba(105, 64, 165, 0.1)'}`,
                transition: 'border-color 200ms',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <p style={{ fontSize: 12, color: '#6940A5', fontWeight: 500, margin: 0 }}>
                    Message preview
                  </p>
                  {!editingSms ? (
                    <button
                      type="button"
                      onClick={() => {
                        setEditedSmsBody(call.sms_body || '');
                        setEditingSms(true);
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 11,
                        fontWeight: 500,
                        color: '#6940A5',
                        backgroundColor: 'rgba(105, 64, 165, 0.08)',
                        border: 'none',
                        borderRadius: 4,
                        padding: '3px 8px',
                        cursor: 'pointer',
                        transition: 'background-color 150ms',
                      }}
                      aria-label="Edit SMS message"
                    >
                      <Pencil style={{ height: 10, width: 10 }} />
                      Edit
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        type="button"
                        onClick={() => {
                          if (onEditSms) onEditSms(index, editedSmsBody);
                          setEditingSms(false);
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 11,
                          fontWeight: 500,
                          color: '#FFFFFF',
                          backgroundColor: '#6940A5',
                          border: 'none',
                          borderRadius: 4,
                          padding: '3px 8px',
                          cursor: 'pointer',
                        }}
                      >
                        <Check style={{ height: 10, width: 10 }} />
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditedSmsBody(call.sms_body || '');
                          setEditingSms(false);
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          fontSize: 11,
                          fontWeight: 500,
                          color: COLORS.secondary,
                          backgroundColor: 'transparent',
                          border: `1px solid ${COLORS.border}`,
                          borderRadius: 4,
                          padding: '3px 8px',
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
                {editingSms ? (
                  <textarea
                    value={editedSmsBody}
                    onChange={(e) => setEditedSmsBody(e.target.value)}
                    style={{
                      width: '100%',
                      minHeight: 60,
                      fontSize: 13,
                      color: COLORS.text,
                      lineHeight: 1.5,
                      padding: 8,
                      borderRadius: 4,
                      border: `1px solid ${COLORS.border}`,
                      backgroundColor: COLORS.white,
                      outline: 'none',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                    }}
                    autoFocus
                  />
                ) : (
                  <p style={{ fontSize: 13, color: COLORS.text, margin: 0, lineHeight: 1.5 }}>
                    {call.sms_body}
                  </p>
                )}
              </div>
            )}

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

interface CreditData {
  creditsRemaining: number;
  creditsMonthlyAllowance: number;
  accountTier: string;
}

interface PlanningChatProps {
  taskId: string;
  initialMessages: ChatMessage[];
  plan: CallPlan | null;
  status: string;
  creditData?: CreditData;
}

export function PlanningChat({
  taskId,
  initialMessages,
  plan,
  status,
  creditData,
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

  const handleEditSms = useCallback((index: number, newBody: string) => {
    setCurrentPlan((prev) => {
      if (!prev) return prev;
      const updatedCalls = [...prev.calls];
      updatedCalls[index] = { ...updatedCalls[index], sms_body: newBody };
      return { ...prev, calls: updatedCalls };
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
      // Build map of edited SMS bodies to send to the server
      const smsEdits: Record<number, string> = {};
      if (currentPlan) {
        for (let i = 0; i < currentPlan.calls.length; i++) {
          const call = currentPlan.calls[i];
          if (call.type === 'sms' && call.sms_body) {
            // Always send the current sms_body so any edits are reflected
            smsEdits[i] = call.sms_body;
          }
        }
      }

      const res = await fetch('/api/calls/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          // Send only the calls the user kept
          removedIndices: Array.from(removedIndices),
          // Send any edited SMS bodies
          smsEdits,
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

  // Full-screen ultra-modern initiating overlay
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
          background: 'linear-gradient(135deg, #0a0a0a 0%, #111111 50%, #0a0a0a 100%)',
          animationName: 'overlayFadeIn',
          animationDuration: '0.5s',
          animationFillMode: 'both',
          animationTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
          overflow: 'hidden',
        }}
      >
        {/* Ambient glow background */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -60%)',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(35,131,226,0.12) 0%, rgba(35,131,226,0.04) 40%, transparent 70%)',
          animationName: 'ambientBreath',
          animationDuration: '4s',
          animationIterationCount: 'infinite',
          animationTimingFunction: 'ease-in-out',
          pointerEvents: 'none',
        }} />

        {/* Subtle grid overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          pointerEvents: 'none',
        }} />

        {/* Orbiting rings */}
        <div style={{
          position: 'relative',
          height: 160,
          width: 160,
          marginBottom: 48,
        }}>
          {/* Ring 1 — outer */}
          <div style={{
            position: 'absolute',
            inset: -20,
            borderRadius: '50%',
            border: '1px solid rgba(35,131,226,0.15)',
            animationName: 'orbitSpin',
            animationDuration: '8s',
            animationIterationCount: 'infinite',
            animationTimingFunction: 'linear',
          }}>
            <div style={{
              position: 'absolute',
              top: -3,
              left: '50%',
              transform: 'translateX(-50%)',
              height: 6,
              width: 6,
              borderRadius: '50%',
              backgroundColor: 'rgba(35,131,226,0.6)',
              boxShadow: '0 0 12px rgba(35,131,226,0.4)',
            }} />
          </div>

          {/* Ring 2 — mid */}
          <div style={{
            position: 'absolute',
            inset: 5,
            borderRadius: '50%',
            border: '1px solid rgba(35,131,226,0.1)',
            animationName: 'orbitSpinReverse',
            animationDuration: '6s',
            animationIterationCount: 'infinite',
            animationTimingFunction: 'linear',
          }}>
            <div style={{
              position: 'absolute',
              bottom: -3,
              left: '50%',
              transform: 'translateX(-50%)',
              height: 5,
              width: 5,
              borderRadius: '50%',
              backgroundColor: 'rgba(35,131,226,0.4)',
              boxShadow: '0 0 8px rgba(35,131,226,0.3)',
            }} />
          </div>

          {/* Ring 3 — expanding pulse */}
          <div style={{
            position: 'absolute',
            inset: 20,
            borderRadius: '50%',
            border: '1px solid rgba(35,131,226,0.2)',
            animationName: 'ringExpand',
            animationDuration: '2.5s',
            animationIterationCount: 'infinite',
            animationTimingFunction: 'ease-out',
          }} />
          <div style={{
            position: 'absolute',
            inset: 20,
            borderRadius: '50%',
            border: '1px solid rgba(35,131,226,0.2)',
            animationName: 'ringExpand',
            animationDuration: '2.5s',
            animationDelay: '1.25s',
            animationIterationCount: 'infinite',
            animationTimingFunction: 'ease-out',
          }} />

          {/* Center icon */}
          <div style={{
            position: 'absolute',
            inset: 40,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(35,131,226,0.15) 0%, rgba(35,131,226,0.05) 100%)',
            backdropFilter: 'blur(20px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(35,131,226,0.2)',
          }}>
            <Phone style={{
              height: 32,
              width: 32,
              color: '#2383E2',
              filter: 'drop-shadow(0 0 8px rgba(35,131,226,0.4))',
              animationName: 'phoneFloat',
              animationDuration: '3s',
              animationIterationCount: 'infinite',
              animationTimingFunction: 'ease-in-out',
            }} />
          </div>
        </div>

        {/* Status text */}
        <div style={{
          textAlign: 'center',
          animationName: 'contentSlideUp',
          animationDuration: '0.6s',
          animationDelay: '0.2s',
          animationFillMode: 'both',
          animationTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          <h2 style={{
            fontSize: 28,
            fontWeight: 600,
            color: '#FFFFFF',
            margin: '0 0 8px',
            letterSpacing: '-0.02em',
          }}>
            Initiating calls
          </h2>
          <p style={{
            fontSize: 15,
            color: 'rgba(255,255,255,0.5)',
            margin: 0,
            fontWeight: 400,
          }}>
            Connecting {activeCalls.length} call{activeCalls.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Call cards staggered */}
        <div style={{
          marginTop: 40,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          alignItems: 'center',
          width: '100%',
          maxWidth: 400,
          padding: '0 24px',
        }}>
          {activeCalls.slice(0, 5).map((call, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              width: '100%',
              padding: '12px 16px',
              borderRadius: 12,
              backgroundColor: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              backdropFilter: 'blur(10px)',
              animationName: 'cardSlideIn',
              animationDuration: '0.5s',
              animationDelay: `${0.4 + i * 0.1}s`,
              animationFillMode: 'both',
              animationTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
            }}>
              {/* Live dot */}
              <div style={{
                position: 'relative',
                height: 8,
                width: 8,
                flexShrink: 0,
              }}>
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  backgroundColor: '#2383E2',
                }} />
                <div style={{
                  position: 'absolute',
                  inset: -3,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(35,131,226,0.3)',
                  animationName: 'livePing',
                  animationDuration: '1.5s',
                  animationIterationCount: 'infinite',
                  animationDelay: `${i * 0.3}s`,
                }} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{
                  fontSize: 14,
                  color: '#FFFFFF',
                  fontWeight: 500,
                  display: 'block',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {call.business_name}
                </span>
              </div>

              <span style={{
                fontSize: 12,
                color: 'rgba(255,255,255,0.3)',
                fontFamily: 'ui-monospace, monospace',
                fontWeight: 400,
                flexShrink: 0,
              }}>
                {call.phone_number}
              </span>
            </div>
          ))}
        </div>

        {/* Bottom progress bar */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 2,
          backgroundColor: 'rgba(255,255,255,0.05)',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            backgroundColor: '#2383E2',
            boxShadow: '0 0 12px rgba(35,131,226,0.5)',
            animationName: 'progressSweep',
            animationDuration: '2s',
            animationIterationCount: 'infinite',
            animationTimingFunction: 'ease-in-out',
          }} />
        </div>

        <style>{`
          @keyframes overlayFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes ambientBreath {
            0%, 100% { transform: translate(-50%, -60%) scale(1); opacity: 0.8; }
            50% { transform: translate(-50%, -60%) scale(1.15); opacity: 1; }
          }
          @keyframes orbitSpin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes orbitSpinReverse {
            from { transform: rotate(0deg); }
            to { transform: rotate(-360deg); }
          }
          @keyframes ringExpand {
            0% { transform: scale(1); opacity: 0.6; }
            100% { transform: scale(2.2); opacity: 0; }
          }
          @keyframes phoneFloat {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-4px); }
          }
          @keyframes contentSlideUp {
            from { opacity: 0; transform: translateY(16px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes cardSlideIn {
            from { opacity: 0; transform: translateY(12px) scale(0.97); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes livePing {
            0% { transform: scale(1); opacity: 0.6; }
            100% { transform: scale(2.5); opacity: 0; }
          }
          @keyframes progressSweep {
            0% { width: 0%; margin-left: 0%; }
            50% { width: 40%; margin-left: 30%; }
            100% { width: 0%; margin-left: 100%; }
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
                        onEditSms={handleEditSms}
                      />
                    );
                  })}
                </>
              )}

              {/* Credit warning before starting calls */}
              {activeCalls.length > 0 && creditData && creditData.accountTier !== 'unlimited' && (() => {
                const callCredits = activeCalls.filter(c => c.type !== 'sms').length;
                const smsCredits = activeCalls.filter(c => c.type === 'sms').length * 0.5;
                const totalCost = callCredits + smsCredits;
                const remaining = creditData.creditsRemaining;
                const afterCalls = remaining - totalCost;
                const notEnough = afterCalls < 0;
                const isLow = afterCalls >= 0 && afterCalls < 5;

                if (notEnough) return (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 14px',
                    borderRadius: 8,
                    backgroundColor: 'rgba(235,87,87,0.06)',
                    border: '1px solid rgba(235,87,87,0.15)',
                    marginTop: 12,
                  }}>
                    <Zap style={{ width: 14, height: 14, color: '#EB5757', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: '#EB5757', fontWeight: 500, flex: 1 }}>
                      Not enough credits &mdash; {totalCost} needed, {remaining} available
                    </span>
                    <Link href="/pricing" style={{
                      fontSize: 13, fontWeight: 600, color: '#2383E2', textDecoration: 'none', whiteSpace: 'nowrap',
                    }}>
                      View Plans
                    </Link>
                  </div>
                );
                if (isLow) return (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 14px',
                    borderRadius: 8,
                    backgroundColor: 'rgba(217,115,13,0.06)',
                    border: '1px solid rgba(217,115,13,0.15)',
                    marginTop: 12,
                  }}>
                    <Zap style={{ width: 14, height: 14, color: '#D9730D', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: '#D9730D', fontWeight: 500 }}>
                      After these calls, you&apos;ll have {afterCalls} credit{afterCalls !== 1 ? 's' : ''} left
                    </span>
                  </div>
                );
                return null;
              })()}

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
