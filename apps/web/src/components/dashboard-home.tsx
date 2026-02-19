'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Send,
  Phone,
  Clock,
  CheckCircle,
  TrendingUp,
  Sparkles,
  ArrowRight,
  ArrowUpRight,
  Stethoscope,
  Wrench,
  UtensilsCrossed,
  Car,
  Search,
  Loader2,
  PhoneCall,
  Timer,
  Zap,
  ChevronRight,
  AlertCircle,
  PhoneForwarded,
  MessageCircle,
  Crown,
} from 'lucide-react';
import { OnboardingNudge } from './onboarding-nudge';
import type { Task } from '@/types';

interface DashboardHomeProps {
  userName: string;
  recentTasks: Task[];
  stats: {
    total_tasks: number;
    total_calls: number;
    successful_calls: number;
    total_call_minutes: number;
  };
  nudgeData?: {
    hasPhoneNumber: boolean;
    hasVerifiedCallerId: boolean;
    memoryCount: number;
    contactCount: number;
  };
  creditData?: {
    creditsRemaining: number;
    creditsMonthlyAllowance: number;
    accountTier: string;
  };
}

const QUICK_ACTIONS = [
  {
    icon: Stethoscope,
    label: 'Book appointment',
    description: 'Doctor, dentist, or specialist',
    prompt: 'Book a doctor appointment for me this week',
  },
  {
    icon: Wrench,
    label: 'Find a service',
    description: 'Plumber, electrician, handyman',
    prompt: 'Find a plumber near me who can come today',
  },
  {
    icon: UtensilsCrossed,
    label: 'Make reservation',
    description: 'Restaurants and dining',
    prompt: 'Make a dinner reservation for 2 this Saturday evening',
  },
  {
    icon: Search,
    label: 'Check availability',
    description: 'Products and store stock',
    prompt: 'Check if any nearby stores have this product in stock',
  },
  {
    icon: Car,
    label: 'Auto service',
    description: 'Oil change, repairs, detailing',
    prompt: 'Schedule an oil change for my car this weekend',
  },
  {
    icon: Phone,
    label: 'General inquiry',
    description: 'Hours, pricing, and info',
    prompt: 'Call this business and ask about their hours and pricing',
  },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function getStatusConfig(status: string) {
  switch (status) {
    case 'completed':
      return {
        label: 'Completed',
        color: '#4DAB9A',
        bgColor: 'rgba(77, 171, 154, 0.06)',
        icon: CheckCircle,
        dotColor: '#4DAB9A',
      };
    case 'in_progress':
      return {
        label: 'In Progress',
        color: '#2383E2',
        bgColor: 'rgba(35, 131, 226, 0.06)',
        icon: PhoneCall,
        dotColor: '#2383E2',
      };
    case 'failed':
      return {
        label: 'Failed',
        color: '#EB5757',
        bgColor: 'rgba(235, 87, 87, 0.06)',
        icon: AlertCircle,
        dotColor: '#EB5757',
      };
    default:
      return {
        label: 'Pending',
        color: '#787774',
        bgColor: 'rgba(120, 119, 116, 0.06)',
        icon: Clock,
        dotColor: '#787774',
      };
  }
}

function AnimatedNumber({ value }: { value: number }) {
  const [displayed, setDisplayed] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    const duration = 1200;
    const steps = 40;
    const stepTime = duration / steps;
    let current = 0;
    const increment = value / steps;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayed(value);
        clearInterval(timer);
      } else {
        setDisplayed(Math.floor(current));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <span ref={ref} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {displayed.toLocaleString()}
    </span>
  );
}

export function DashboardHome({ userName, recentTasks, stats, nudgeData, creditData }: DashboardHomeProps) {
  const [taskText, setTaskText] = useState('');
  const [loading, setLoading] = useState(false);
  const [quickActionLoading, setQuickActionLoading] = useState<string | null>(null);
  const [greeting, setGreeting] = useState('Welcome');
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const router = useRouter();
  const firstName = userName.split(' ')[0] || 'there';

  // Set greeting on client only to avoid SSR hydration mismatch
  useEffect(() => {
    setGreeting(getGreeting());
  }, []);

  const successRate =
    stats.total_calls > 0
      ? Math.round((stats.successful_calls / stats.total_calls) * 100)
      : 0;

  async function createTask(text: string) {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input_text: text }),
      });
      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }
      const data = await res.json();
      if (data.taskId) {
        router.push(`/tasks/${data.taskId}`);
      } else {
        throw new Error('No task ID returned');
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong';
      toast.error('Failed to create task', {
        description: message,
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!taskText.trim() || loading) return;
    setLoading(true);
    await createTask(taskText.trim());
    setLoading(false);
  }

  async function handleQuickAction(action: typeof QUICK_ACTIONS[0]) {
    setQuickActionLoading(action.label);
    await createTask(action.prompt);
    setQuickActionLoading(null);
  }

  const callCounts = recentTasks.reduce<Record<string, number>>((acc, task) => {
    const count = task.plan?.calls?.length ?? 0;
    acc[task.id] = count;
    return acc;
  }, {});

  const isNewUser = recentTasks.length === 0 && stats.total_tasks === 0;

  return (
    <div
      style={{
        maxWidth: 1080,
        marginLeft: 'auto',
        marginRight: 'auto',
        padding: '48px 24px',
      }}
    >
      {/* Onboarding Nudge */}
      {nudgeData && (
        <OnboardingNudge
          hasPhoneNumber={nudgeData.hasPhoneNumber}
          hasVerifiedCallerId={nudgeData.hasVerifiedCallerId}
          memoryCount={nudgeData.memoryCount}
          contactCount={nudgeData.contactCount}
        />
      )}

      {/* Upgrade Banner — show for non-unlimited users with ≤ 10 credits */}
      {creditData && creditData.accountTier !== 'unlimited' && creditData.creditsRemaining <= 10 && !bannerDismissed && (() => {
        const isZero = creditData.creditsRemaining === 0;
        const isFree = creditData.accountTier === 'free';
        const accentColor = isZero ? '#EB5757' : '#2383E2';
        const message = isZero
          ? "You're out of credits"
          : `Only ${creditData.creditsRemaining} credit${creditData.creditsRemaining !== 1 ? 's' : ''} left`;
        const subtitle = isFree
          ? 'Upgrade to Pro for 200 credits/month'
          : 'Buy more credits or go Unlimited';
        return (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            borderRadius: 8,
            backgroundColor: '#FFFFFF',
            border: `1px solid ${isZero ? 'rgba(235,87,87,0.2)' : '#E3E2DE'}`,
            borderLeft: `4px solid ${accentColor}`,
            marginBottom: 24,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
              <Crown style={{ width: 18, height: 18, color: accentColor, flexShrink: 0 }} />
              <div>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#37352F' }}>{message}</span>
                <span style={{ fontSize: 13, color: '#787774', marginLeft: 8 }}>{subtitle}</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <Link
                href="/pricing"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '6px 14px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#FFFFFF',
                  background: accentColor,
                  border: 'none',
                  borderRadius: 8,
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                View Plans
                <ArrowUpRight style={{ width: 14, height: 14 }} />
              </Link>
              <button
                onClick={() => setBannerDismissed(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                  color: '#B4B4B0',
                  fontSize: 18,
                  lineHeight: 1,
                  fontFamily: 'inherit',
                }}
                title="Dismiss"
              >
                &times;
              </button>
            </div>
          </div>
        );
      })()}

      {/* Hero: Greeting + Input */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ marginBottom: 24 }}>
          <p
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: '#787774',
              marginBottom: 4,
              letterSpacing: '0.02em',
            }}
          >
            {greeting}
          </p>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: '#37352F',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
              margin: 0,
            }}
          >
            {isNewUser
              ? `${firstName}, let\u2019s make your first call`
              : `${firstName}, what can I call about?`}
          </h1>
          <p
            style={{
              color: '#787774',
              marginTop: 8,
              fontSize: 15,
              lineHeight: 1.5,
            }}
          >
            {isNewUser
              ? 'Type what you need below, or tap a quick action to try it out instantly.'
              : 'Describe your task and I\u2019ll handle every phone call from start to finish.'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <fieldset disabled={loading} style={{ border: 'none', padding: 0, margin: 0 }}>
            <div
              style={{
                position: 'relative',
                borderRadius: 8,
                border: '1px solid #E3E2DE',
                backgroundColor: '#FFFFFF',
                transition: 'border-color 0.15s ease',
              }}
              onFocus={(e) => {
                const container = e.currentTarget;
                container.style.borderColor = '#2383E2';
              }}
              onBlur={(e) => {
                const container = e.currentTarget;
                if (!container.contains(e.relatedTarget as Node)) {
                  container.style.borderColor = '#E3E2DE';
                }
              }}
            >
              <textarea
                placeholder={
                  isNewUser
                    ? 'Try: "Book a dentist appointment for next Tuesday afternoon"'
                    : 'e.g. Book a dentist appointment for next Tuesday afternoon...'
                }
                value={taskText}
                onChange={(e) => setTaskText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handleSubmit(e);
                  }
                }}
                style={{
                  width: '100%',
                  minHeight: 100,
                  border: 'none',
                  outline: 'none',
                  backgroundColor: 'transparent',
                  padding: '16px 20px 56px 20px',
                  fontSize: 15,
                  lineHeight: 1.6,
                  color: '#37352F',
                  resize: 'none',
                  fontFamily: 'inherit',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: 12,
                  left: 16,
                  right: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    color: '#B4B4B0',
                    userSelect: 'none',
                  }}
                >
                  {taskText.length > 0 ? (
                    <>
                      Press{' '}
                      <kbd
                        style={{
                          display: 'inline-block',
                          padding: '1px 5px',
                          fontSize: 10,
                          fontFamily: 'monospace',
                          border: '1px solid #E3E2DE',
                          borderRadius: 4,
                          backgroundColor: '#F7F6F3',
                          color: '#787774',
                        }}
                      >
                        {typeof navigator !== 'undefined' && /Mac/.test(navigator.userAgent)
                          ? '\u2318'
                          : 'Ctrl'}
                      </kbd>{' '}
                      +{' '}
                      <kbd
                        style={{
                          display: 'inline-block',
                          padding: '1px 5px',
                          fontSize: 10,
                          fontFamily: 'monospace',
                          border: '1px solid #E3E2DE',
                          borderRadius: 4,
                          backgroundColor: '#F7F6F3',
                          color: '#787774',
                        }}
                      >
                        Enter
                      </kbd>{' '}
                      to send
                    </>
                  ) : null}
                </span>
                <button
                  type="submit"
                  disabled={!taskText.trim() || loading}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 16px',
                    fontSize: 14,
                    fontWeight: 500,
                    color: '#FFFFFF',
                    backgroundColor:
                      !taskText.trim() || loading ? '#B4B4B0' : '#2383E2',
                    border: 'none',
                    borderRadius: 8,
                    cursor: !taskText.trim() || loading ? 'not-allowed' : 'pointer',
                    transition: 'background-color 0.15s ease',
                    fontFamily: 'inherit',
                    lineHeight: 1.4,
                  }}
                  onMouseEnter={(e) => {
                    if (taskText.trim() && !loading) {
                      e.currentTarget.style.backgroundColor = '#1B6DBF';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (taskText.trim() && !loading) {
                      e.currentTarget.style.backgroundColor = '#2383E2';
                    }
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2
                        style={{
                          width: 14,
                          height: 14,
                          animation: 'spin 1s linear infinite',
                        }}
                      />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Send style={{ width: 14, height: 14 }} />
                      Send task
                    </>
                  )}
                </button>
              </div>
            </div>
          </fieldset>
        </form>
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: 48 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 16,
          }}
        >
          <Zap
            style={{ width: 16, height: 16, color: '#787774', strokeWidth: 1.5 }}
          />
          <h2
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#787774',
              textTransform: 'uppercase' as const,
              letterSpacing: '0.05em',
              margin: 0,
            }}
          >
            {isNewUser ? 'Try one of these' : 'Quick actions'}
          </h2>
          {isNewUser && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: '#787774',
                backgroundColor: '#F7F6F3',
                padding: '2px 8px',
                borderRadius: 4,
                marginLeft: 4,
              }}
            >
              One click to start
            </span>
          )}
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 12,
          }}
        >
          {QUICK_ACTIONS.map((action) => {
            const isActionLoading = quickActionLoading === action.label;
            return (
              <button
                key={action.label}
                onClick={() => handleQuickAction(action)}
                disabled={!!quickActionLoading || loading}
                style={{
                  display: 'flex',
                  flexDirection: 'column' as const,
                  gap: 12,
                  padding: 16,
                  textAlign: 'left' as const,
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E3E2DE',
                  borderRadius: 8,
                  cursor:
                    !!quickActionLoading || loading ? 'not-allowed' : 'pointer',
                  opacity: !!quickActionLoading || loading ? 0.6 : 1,
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  position: 'relative' as const,
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => {
                  if (!quickActionLoading && !loading) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow =
                      '0 4px 12px rgba(0,0,0,0.08)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    backgroundColor: '#F7F6F3',
                  }}
                >
                  {isActionLoading ? (
                    <Loader2
                      style={{
                        width: 20,
                        height: 20,
                        color: '#787774',
                        strokeWidth: 1.5,
                        animation: 'spin 1s linear infinite',
                      }}
                    />
                  ) : (
                    <action.icon
                      style={{
                        width: 20,
                        height: 20,
                        color: '#787774',
                        strokeWidth: 1.5,
                      }}
                    />
                  )}
                </div>
                <div>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#37352F',
                      display: 'block',
                    }}
                  >
                    {isActionLoading ? 'Creating...' : action.label}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      color: '#787774',
                      display: 'block',
                      marginTop: 2,
                    }}
                  >
                    {action.description}
                  </span>
                </div>
                <ArrowUpRight
                  style={{
                    position: 'absolute' as const,
                    top: 12,
                    right: 12,
                    width: 14,
                    height: 14,
                    color: '#B4B4B0',
                    strokeWidth: 1.5,
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats Cards */}
      {stats.total_tasks > 0 && (
        <div style={{ marginBottom: 48 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 16,
            }}
          >
            <TrendingUp
              style={{ width: 16, height: 16, color: '#787774', strokeWidth: 1.5 }}
            />
            <h2
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#787774',
                textTransform: 'uppercase' as const,
                letterSpacing: '0.05em',
                margin: 0,
              }}
            >
              Your stats
            </h2>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 12,
            }}
          >
            {/* Credits */}
            {creditData && (
              <Link href="/settings?tab=billing" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E3E2DE',
                    borderRadius: 8,
                    padding: 20,
                    transition: 'box-shadow 0.15s ease',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      backgroundColor: creditData.accountTier === 'unlimited' ? 'rgba(105,64,165,0.06)' : '#F7F6F3',
                      marginBottom: 12,
                    }}
                  >
                    <Zap
                      style={{
                        width: 18,
                        height: 18,
                        strokeWidth: 1.5,
                        color: creditData.accountTier === 'unlimited' ? '#6940A5'
                          : creditData.creditsRemaining > (creditData.creditsMonthlyAllowance * 0.4) ? '#4DAB9A'
                          : creditData.creditsRemaining > (creditData.creditsMonthlyAllowance * 0.15) ? '#D9730D'
                          : '#EB5757',
                      }}
                    />
                  </div>
                  <p
                    style={{
                      fontSize: 28,
                      fontWeight: 700,
                      color: '#37352F',
                      margin: 0,
                      lineHeight: 1.1,
                    }}
                  >
                    {creditData.accountTier === 'unlimited' ? (
                      <span style={{ color: '#6940A5' }}>∞</span>
                    ) : (
                      <AnimatedNumber value={creditData.creditsRemaining} />
                    )}
                  </p>
                  <p
                    style={{
                      fontSize: 12,
                      color: '#787774',
                      margin: '6px 0 0 0',
                      fontWeight: 500,
                    }}
                  >
                    Credits remaining
                  </p>
                </div>
              </Link>
            )}

            {/* Tasks created */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E3E2DE',
                borderRadius: 8,
                padding: 20,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: '#F7F6F3',
                  marginBottom: 12,
                }}
              >
                <CheckCircle
                  style={{ width: 18, height: 18, color: '#4DAB9A', strokeWidth: 1.5 }}
                />
              </div>
              <p
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: '#37352F',
                  margin: 0,
                  lineHeight: 1.1,
                }}
              >
                <AnimatedNumber value={stats.total_tasks} />
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: '#787774',
                  margin: '6px 0 0 0',
                  fontWeight: 500,
                }}
              >
                Tasks created
              </p>
            </div>

            {/* Calls made */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E3E2DE',
                borderRadius: 8,
                padding: 20,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: '#F7F6F3',
                  marginBottom: 12,
                }}
              >
                <PhoneForwarded
                  style={{ width: 18, height: 18, color: '#2383E2', strokeWidth: 1.5 }}
                />
              </div>
              <p
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: '#37352F',
                  margin: 0,
                  lineHeight: 1.1,
                }}
              >
                <AnimatedNumber value={stats.total_calls} />
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: '#787774',
                  margin: '6px 0 0 0',
                  fontWeight: 500,
                }}
              >
                Calls made
              </p>
            </div>

            {/* Success rate */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E3E2DE',
                borderRadius: 8,
                padding: 20,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: '#F7F6F3',
                  marginBottom: 12,
                }}
              >
                <Sparkles
                  style={{ width: 18, height: 18, color: '#787774', strokeWidth: 1.5 }}
                />
              </div>
              <p
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: '#37352F',
                  margin: 0,
                  lineHeight: 1.1,
                }}
              >
                <AnimatedNumber value={successRate} />
                <span
                  style={{ fontSize: 18, fontWeight: 600, color: '#787774' }}
                >
                  %
                </span>
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: '#787774',
                  margin: '6px 0 0 0',
                  fontWeight: 500,
                }}
              >
                Success rate
              </p>
            </div>

            {/* Minutes of calls */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E3E2DE',
                borderRadius: 8,
                padding: 20,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: '#F7F6F3',
                  marginBottom: 12,
                }}
              >
                <Timer
                  style={{ width: 18, height: 18, color: '#787774', strokeWidth: 1.5 }}
                />
              </div>
              <p
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: '#37352F',
                  margin: 0,
                  lineHeight: 1.1,
                }}
              >
                <AnimatedNumber value={stats.total_call_minutes} />
                <span
                  style={{ fontSize: 18, fontWeight: 600, color: '#787774' }}
                >
                  m
                </span>
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: '#787774',
                  margin: '6px 0 0 0',
                  fontWeight: 500,
                }}
              >
                Minutes of calls
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {recentTasks.length > 0 && (
        <div style={{ marginBottom: 48 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock
                style={{ width: 16, height: 16, color: '#787774', strokeWidth: 1.5 }}
              />
              <h2
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#787774',
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.05em',
                  margin: 0,
                }}
              >
                Recent activity
              </h2>
            </div>
            <Link
              href="/history"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 13,
                fontWeight: 500,
                color: '#2383E2',
                textDecoration: 'none',
              }}
            >
              View all
              <ArrowRight style={{ width: 12, height: 12 }} />
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {recentTasks.slice(0, 5).map((task) => {
              const statusConfig = getStatusConfig(task.status);
              const StatusIcon = statusConfig.icon;
              const numCalls = callCounts[task.id] ?? 0;

              return (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: '12px 16px',
                      borderRadius: 8,
                      transition:
                        'background-color 0.1s ease',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#EFEFEF';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        backgroundColor: statusConfig.bgColor,
                        flexShrink: 0,
                      }}
                    >
                      <StatusIcon
                        style={{
                          width: 16,
                          height: 16,
                          color: statusConfig.color,
                          strokeWidth: 1.5,
                        }}
                      />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: '#37352F',
                          margin: 0,
                          whiteSpace: 'nowrap' as const,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {task.input_text}
                      </p>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          marginTop: 2,
                        }}
                      >
                        {task.summary && (
                          <p
                            style={{
                              fontSize: 12,
                              color: '#787774',
                              margin: 0,
                              whiteSpace: 'nowrap' as const,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: 280,
                            }}
                          >
                            {task.summary}
                          </p>
                        )}
                        {numCalls > 0 && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                              fontSize: 11,
                              color: '#B4B4B0',
                              flexShrink: 0,
                            }}
                          >
                            <Phone style={{ width: 11, height: 11 }} />
                            {numCalls} {numCalls === 1 ? 'call' : 'calls'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column' as const,
                        alignItems: 'flex-end',
                        gap: 4,
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          fontSize: 12,
                          fontWeight: 500,
                          color: statusConfig.color,
                          padding: '2px 8px',
                          borderRadius: 4,
                          backgroundColor: statusConfig.bgColor,
                        }}
                      >
                        <span
                          style={{
                            display: 'inline-block',
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            backgroundColor: statusConfig.dotColor,
                          }}
                        />
                        {statusConfig.label}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: '#B4B4B0',
                          fontWeight: 500,
                        }}
                      >
                        {getTimeAgo(task.created_at)}
                      </span>
                    </div>

                    <ChevronRight
                      style={{
                        width: 16,
                        height: 16,
                        color: '#E3E2DE',
                        flexShrink: 0,
                        strokeWidth: 1.5,
                      }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* New User Welcome */}
      {isNewUser && (
        <div style={{ marginBottom: 48 }}>
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E3E2DE',
              borderRadius: 8,
              padding: '40px 32px',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap' as const,
                gap: 40,
              }}
            >
              {/* Left: how it works */}
              <div style={{ flex: '1 1 320px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 24,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      backgroundColor: '#F7F6F3',
                    }}
                  >
                    <MessageCircle
                      style={{
                        width: 20,
                        height: 20,
                        color: '#37352F',
                        strokeWidth: 1.5,
                      }}
                    />
                  </div>
                  <div>
                    <h3
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: '#37352F',
                        margin: 0,
                      }}
                    >
                      How it works
                    </h3>
                    <p
                      style={{
                        fontSize: 12,
                        color: '#787774',
                        margin: 0,
                      }}
                    >
                      3 simple steps
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 20,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        backgroundColor: '#2383E2',
                        color: '#FFFFFF',
                        fontSize: 12,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      1
                    </div>
                    <div>
                      <p
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: '#37352F',
                          margin: 0,
                        }}
                      >
                        Tell me what you need
                      </p>
                      <p
                        style={{
                          fontSize: 13,
                          color: '#787774',
                          margin: '2px 0 0 0',
                        }}
                      >
                        &quot;Book a dentist appointment for next week&quot;
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        backgroundColor: '#2383E2',
                        color: '#FFFFFF',
                        fontSize: 12,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      2
                    </div>
                    <div>
                      <p
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: '#37352F',
                          margin: 0,
                        }}
                      >
                        I plan the calls
                      </p>
                      <p
                        style={{
                          fontSize: 13,
                          color: '#787774',
                          margin: '2px 0 0 0',
                        }}
                      >
                        I find the right numbers and figure out what to say
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        backgroundColor: '#2383E2',
                        color: '#FFFFFF',
                        fontSize: 12,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      3
                    </div>
                    <div>
                      <p
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: '#37352F',
                          margin: 0,
                        }}
                      >
                        Calls happen automatically
                      </p>
                      <p
                        style={{
                          fontSize: 13,
                          color: '#787774',
                          margin: '2px 0 0 0',
                        }}
                      >
                        I make the calls and report back with results
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: capabilities */}
              <div style={{ flex: '1 1 320px' }}>
                <div
                  style={{
                    backgroundColor: '#F7F6F3',
                    border: '1px solid #E3E2DE',
                    borderRadius: 8,
                    padding: 20,
                  }}
                >
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#787774',
                      textTransform: 'uppercase' as const,
                      letterSpacing: '0.06em',
                      margin: '0 0 16px 0',
                    }}
                  >
                    What I can handle
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                    }}
                  >
                    {[
                      { icon: Phone, text: 'Calls show your real number — people can call you back' },
                      { icon: Clock, text: 'Wait on hold so you don\'t have to' },
                      { icon: PhoneCall, text: 'Make up to 5 calls at the same time' },
                      { icon: MessageCircle, text: 'Handles hold times and phone menus for you' },
                      { icon: Sparkles, text: 'Navigate menus, adapt to any situation' },
                      { icon: CheckCircle, text: 'Auto-retry if a line is busy' },
                    ].map((item) => (
                      <div
                        key={item.text}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 24,
                            height: 24,
                            borderRadius: 6,
                            backgroundColor: '#FFFFFF',
                          }}
                        >
                          <item.icon
                            style={{
                              width: 14,
                              height: 14,
                              color: '#787774',
                              strokeWidth: 1.5,
                            }}
                          />
                        </div>
                        <span
                          style={{ fontSize: 13, color: '#37352F' }}
                        >
                          {item.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Spin animation keyframes */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          div[style*="grid-template-columns: repeat(4"] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </div>
  );
}
