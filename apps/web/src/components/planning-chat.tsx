'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
      <ul key={key++} className="my-1.5 ml-4 list-disc space-y-0.5">
        {listBuffer.map((item, i) => (
          <li key={i} className="text-sm leading-relaxed">
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
      elements.push(<div key={key++} className="h-2" />);
    } else if (trimmed.startsWith('###')) {
      elements.push(
        <p key={key++} className="text-sm font-semibold mt-2 mb-0.5">
          {inlineFormat(trimmed.replace(/^#{1,3}\s*/, ''))}
        </p>,
      );
    } else {
      elements.push(
        <p key={key++} className="text-sm leading-relaxed">
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
        <strong key={k++} className="font-semibold">
          {match[2]}
        </strong>,
      );
    } else if (match[3]) {
      parts.push(
        <em key={k++} className="italic">
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
    dot: 'bg-red-500',
    label: 'High',
    ring: 'ring-red-500/20',
    bg: 'bg-red-50 dark:bg-red-950/30',
    text: 'text-red-700 dark:text-red-400',
  },
  medium: {
    dot: 'bg-amber-500',
    label: 'Medium',
    ring: 'ring-amber-500/20',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    text: 'text-amber-700 dark:text-amber-400',
  },
  low: {
    dot: 'bg-emerald-500',
    label: 'Low',
    ring: 'ring-emerald-500/20',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    text: 'text-emerald-700 dark:text-emerald-400',
  },
} as const;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Animated typing dots */
function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1.5">
          <div className="flex gap-1">
            <span
              className="inline-block h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce"
              style={{ animationDelay: '0ms', animationDuration: '1.2s' }}
            />
            <span
              className="inline-block h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce"
              style={{ animationDelay: '150ms', animationDuration: '1.2s' }}
            />
            <span
              className="inline-block h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce"
              style={{ animationDelay: '300ms', animationDuration: '1.2s' }}
            />
          </div>
          <span className="text-xs text-muted-foreground ml-1.5">
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
      className={
        'group relative rounded-xl border bg-card shadow-sm transition-all duration-200 ' +
        'hover:shadow-md hover:border-border/80'
      }
    >
      {/* Remove button */}
      <button
        type="button"
        onClick={() => onRemove(index)}
        className={
          'absolute -right-2 -top-2 z-10 flex h-6 w-6 items-center justify-center ' +
          'rounded-full border bg-background text-muted-foreground shadow-sm ' +
          'opacity-0 transition-opacity duration-150 group-hover:opacity-100 ' +
          'hover:bg-destructive hover:text-white hover:border-destructive'
        }
        aria-label={`Remove call to ${call.business_name}`}
      >
        <X className="h-3 w-3" />
      </button>

      <div className="p-4">
        {/* Top row: priority dot, name, badges */}
        <div className="flex items-start gap-3">
          {/* Priority indicator */}
          <div
            className={
              'mt-1 flex h-3 w-3 shrink-0 items-center justify-center rounded-full ring-4 ' +
              config.dot +
              ' ' +
              config.ring
            }
          />

          <div className="flex-1 min-w-0">
            {/* Name row */}
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-medium text-sm truncate">
                {call.business_name}
              </h4>
              <div className="flex items-center gap-1.5 shrink-0">
                {call.expected_duration && (
                  <Badge variant="secondary" className="text-xs gap-1 font-normal">
                    <Clock className="h-3 w-3" />
                    {call.expected_duration}
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className={'text-xs font-normal ' + config.text}
                >
                  {config.label}
                </Badge>
              </div>
            </div>

            {/* Purpose */}
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {call.purpose}
            </p>

            {/* Phone number row */}
            <div className="mt-2.5 flex items-center gap-2">
              {isLookup ? (
                <Badge
                  variant="secondary"
                  className="text-xs gap-1 font-normal text-muted-foreground"
                >
                  <Search className="h-3 w-3" />
                  Will look up number
                </Badge>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono text-muted-foreground">
                    {call.phone_number}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className={
                      'inline-flex h-6 w-6 items-center justify-center rounded-md ' +
                      'text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
                    }
                    aria-label="Copy phone number"
                  >
                    {copied ? (
                      <Check className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Expandable questions */}
            {call.questions.length > 0 && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setExpanded(!expanded)}
                  className={
                    'flex w-full items-center gap-1.5 text-xs font-medium ' +
                    'text-muted-foreground transition-colors hover:text-foreground'
                  }
                >
                  <MessageSquare className="h-3 w-3" />
                  {call.questions.length} question
                  {call.questions.length !== 1 ? 's' : ''} to ask
                  {expanded ? (
                    <ChevronUp className="h-3 w-3 ml-auto" />
                  ) : (
                    <ChevronDown className="h-3 w-3 ml-auto" />
                  )}
                </button>

                <div
                  className={
                    'overflow-hidden transition-all duration-200 ease-in-out ' +
                    (expanded ? 'max-h-96 opacity-100 mt-2' : 'max-h-0 opacity-0')
                  }
                >
                  <ul className="space-y-1.5 rounded-lg bg-muted/50 p-3">
                    {call.questions.map((q, qi) => (
                      <li
                        key={qi}
                        className="flex items-start gap-2 text-xs text-muted-foreground"
                      >
                        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary">
                          {qi + 1}
                        </span>
                        <span className="leading-relaxed">{q}</span>
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
    <div className="flex flex-col items-center justify-center h-full py-12 px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-4">
        <Sparkles className="h-7 w-7 text-primary" />
      </div>
      <h3 className="text-base font-semibold mb-1.5">
        Tell me what calls you need made
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
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
      }
    } catch {
      setInitiating(false);
    }
  }

  const showInput = currentStatus !== 'ready';
  const showPlan = currentPlan && currentStatus === 'ready';

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 p-4">
      {/* ---- Chat messages ---- */}
      <Card className="overflow-hidden border shadow-sm">
        <ScrollArea className="h-[420px]">
          <div className="p-5">
            {messages.length === 0 && !sending ? (
              <EmptyState />
            ) : (
              <div className="space-y-4">
                {messages.map((msg, i) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div
                      key={i}
                      className={
                        'flex ' + (isUser ? 'justify-end' : 'justify-start')
                      }
                      style={{
                        animationName: 'fadeInUp',
                        animationDuration: '0.25s',
                        animationFillMode: 'both',
                        animationTimingFunction: 'ease-out',
                      }}
                    >
                      {!isUser && (
                        <div className="mr-2.5 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                        </div>
                      )}
                      <div
                        className={
                          'max-w-[80%] ' +
                          (isUser
                            ? 'rounded-2xl rounded-br-md bg-primary text-primary-foreground px-4 py-2.5 shadow-sm'
                            : 'rounded-2xl rounded-bl-md bg-muted px-4 py-3 shadow-sm')
                        }
                      >
                        {isUser ? (
                          <p className="text-sm leading-relaxed">
                            {msg.content}
                          </p>
                        ) : (
                          <div className="space-y-0.5">
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
        </ScrollArea>

        {/* ---- Input bar ---- */}
        {showInput && (
          <div className="border-t bg-card px-4 py-3">
            <form onSubmit={handleSend} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    messages.length === 0
                      ? 'e.g. "Schedule a dentist appointment for next week"'
                      : 'Type your response...'
                  }
                  disabled={sending}
                  className={
                    'pr-4 transition-shadow duration-200 ' +
                    'focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50 ' +
                    'placeholder:text-muted-foreground/60'
                  }
                />
              </div>
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || sending}
                className="shrink-0 transition-transform duration-150 active:scale-95"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        )}
      </Card>

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
          <Card className="border shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Phone className="h-4 w-4 text-primary" />
                    Call Plan
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {currentPlan!.summary}
                  </CardDescription>
                </div>

                {/* Duration pill */}
                {activeCalls.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="text-xs gap-1.5 font-normal shrink-0"
                  >
                    <Clock className="h-3 w-3" />
                    ~{totalDuration} min total
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {activeCalls.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <AlertCircle className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    All calls have been removed.
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">
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
                <Button
                  onClick={handleStartCalls}
                  className={
                    'w-full mt-4 h-11 text-sm font-medium transition-all duration-200 ' +
                    'shadow-sm hover:shadow-md active:scale-[0.98]'
                  }
                  disabled={initiating}
                >
                  {initiating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Starting calls...
                    </>
                  ) : (
                    <>
                      <Phone className="mr-2 h-4 w-4" />
                      Start {activeCalls.length} Call
                      {activeCalls.length !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              )}

              {/* Back-to-chat when all removed */}
              {activeCalls.length === 0 && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setCurrentStatus('planning');
                    setRemovedIndices(new Set());
                    inputRef.current?.focus();
                  }}
                >
                  Back to conversation
                </Button>
              )}
            </CardContent>
          </Card>
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
      `}</style>
    </div>
  );
}
