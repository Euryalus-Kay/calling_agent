'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Check,
  Minus,
  Phone,
  Zap,
  Crown,
  Infinity,
  ArrowLeft,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import type { AccountTier } from '@/types';

/* ── Palette ─────────────────────────────────────────── */
const C = {
  text: '#37352F',
  secondary: '#787774',
  border: '#E3E2DE',
  bg: '#F7F6F3',
  white: '#FFFFFF',
  blue: '#2383E2',
  purple: '#6940A5',
  teal: '#4DAB9A',
} as const;

/* ── Comparison Data ─────────────────────────────────── */
interface ComparisonRow {
  label: string;
  free: string | boolean;
  pro: string | boolean;
  unlimited: string | boolean;
  bestCol?: 'pro' | 'unlimited';
}

interface ComparisonCategory {
  category: string;
  rows: ComparisonRow[];
}

const COMPARISON: ComparisonCategory[] = [
  {
    category: 'Credits & Calls',
    rows: [
      { label: 'Monthly credits', free: '25', pro: '200', unlimited: 'Unlimited', bestCol: 'unlimited' },
      { label: 'Buy extra credits', free: false, pro: true, unlimited: 'N/A' },
      { label: 'Max call duration', free: '5 min', pro: '10 min', unlimited: '15 min', bestCol: 'unlimited' },
      { label: 'Concurrent calls', free: '3', pro: '10', unlimited: '20', bestCol: 'unlimited' },
      { label: 'Calls per task', free: '3', pro: '10', unlimited: '20', bestCol: 'unlimited' },
    ],
  },
  {
    category: 'Tasks & Productivity',
    rows: [
      { label: 'AI questions & planning', free: 'Unlimited', pro: 'Unlimited', unlimited: 'Unlimited' },
      { label: 'Daily tasks', free: '5', pro: '50', unlimited: 'Unlimited', bestCol: 'unlimited' },
    ],
  },
  {
    category: 'Intelligence',
    rows: [
      { label: 'AI summary model', free: 'Haiku', pro: 'Opus', unlimited: 'Opus', bestCol: 'pro' },
      { label: 'Smart memory', free: '50', pro: 'Unlimited', unlimited: 'Unlimited', bestCol: 'pro' },
      { label: 'Contacts', free: '50', pro: 'Unlimited', unlimited: 'Unlimited', bestCol: 'pro' },
    ],
  },
  {
    category: 'History & Support',
    rows: [
      { label: 'Call history', free: '30 days', pro: 'Unlimited', unlimited: 'Unlimited', bestCol: 'pro' },
      { label: 'Verified caller ID', free: true, pro: true, unlimited: true },
      { label: 'Support', free: 'Community', pro: 'Email', unlimited: 'Priority', bestCol: 'unlimited' },
    ],
  },
];

/* ── FAQ Data ────────────────────────────────────────── */
const FAQ_ITEMS = [
  {
    q: 'What counts as a credit?',
    a: 'Each phone call uses 1 credit, regardless of duration. AI questions, task planning, and all other features are completely free and unlimited.',
  },
  {
    q: 'Do unused credits roll over?',
    a: 'Credits reset at the start of each billing cycle and do not roll over. Pro users can purchase additional credit packs anytime that never expire.',
  },
  {
    q: 'Can I change plans anytime?',
    a: 'Yes! You can upgrade or downgrade at any time. When you upgrade, you get immediate access to the new plan. Downgrades take effect at the end of your billing period.',
  },
  {
    q: 'What happens when I run out of credits?',
    a: 'You won\'t be able to make calls until your credits reset next month. Pro users can buy extra credit packs. Or you can upgrade to Unlimited for unrestricted access.',
  },
];

/* ── Subcomponents ───────────────────────────────────── */

function CellContent({ value, isBest }: { value: string | boolean; isBest?: boolean }) {
  if (value === true)
    return <Check style={{ width: 16, height: 16, color: C.teal }} />;
  if (value === false)
    return <Minus style={{ width: 16, height: 16, color: C.border }} />;
  return (
    <span style={{ fontWeight: isBest ? 600 : 400, color: isBest ? C.text : C.secondary, fontSize: 13 }}>
      {value}
    </span>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 0',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 500, color: C.text, textAlign: 'left' }}>{q}</span>
        <ChevronDown
          style={{
            width: 16,
            height: 16,
            color: C.secondary,
            flexShrink: 0,
            marginLeft: 12,
            transition: 'transform 0.2s',
            transform: open ? 'rotate(180deg)' : 'none',
          }}
        />
      </button>
      {open && (
        <p style={{ fontSize: 13, color: C.secondary, lineHeight: 1.6, margin: '0 0 16px', paddingRight: 28 }}>
          {a}
        </p>
      )}
    </div>
  );
}

interface TierCardProps {
  name: string;
  price: string;
  priceDetail: string;
  credits: string;
  description: string;
  cta: string;
  highlighted?: boolean;
  badge?: string;
  icon: React.ElementType;
  iconColor: string;
  isCurrentPlan?: boolean;
  loading?: boolean;
  onClick?: () => void;
  href?: string;
}

function TierCard({
  name,
  price,
  priceDetail,
  credits,
  description,
  cta,
  highlighted,
  badge,
  icon: Icon,
  iconColor,
  isCurrentPlan,
  loading,
  onClick,
  href,
}: TierCardProps) {
  const ctaContent = (
    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
      {loading && <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" />}
      {isCurrentPlan ? 'Current Plan' : loading ? 'Redirecting...' : cta}
    </span>
  );

  const ctaStyle: React.CSSProperties = {
    display: 'block',
    textAlign: 'center',
    padding: '10px 20px',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    textDecoration: 'none',
    transition: 'opacity 0.15s',
    cursor: isCurrentPlan || loading ? 'default' : 'pointer',
    opacity: isCurrentPlan ? 0.6 : loading ? 0.7 : 1,
    ...(isCurrentPlan
      ? { backgroundColor: C.bg, color: C.secondary, border: `1px solid ${C.border}` }
      : highlighted
      ? { backgroundColor: C.blue, color: C.white, border: 'none' }
      : { backgroundColor: C.white, color: C.text, border: `1px solid ${C.border}` }),
  };

  return (
    <div
      style={{
        flex: 1,
        minWidth: 260,
        maxWidth: 340,
        padding: highlighted ? '2px' : 0,
        borderRadius: 12,
        background: highlighted ? 'linear-gradient(135deg, #2383E2, #6940A5)' : 'transparent',
      }}
    >
      <div
        style={{
          background: C.white,
          border: highlighted ? 'none' : `1px solid ${C.border}`,
          borderRadius: highlighted ? 10 : 12,
          padding: '24px 22px',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              backgroundColor: `${iconColor}12`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon style={{ width: 15, height: 15, color: iconColor }} />
          </div>
          <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{name}</span>
          {badge && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: C.white,
                backgroundColor: C.blue,
                padding: '2px 8px',
                borderRadius: 10,
                marginLeft: 'auto',
              }}
            >
              {badge}
            </span>
          )}
          {isCurrentPlan && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: C.teal,
                backgroundColor: 'rgba(77,171,154,0.1)',
                padding: '2px 8px',
                borderRadius: 10,
                marginLeft: badge ? 4 : 'auto',
              }}
            >
              Active
            </span>
          )}
        </div>

        {/* Price */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
          <span style={{ fontSize: 34, fontWeight: 700, color: C.text, letterSpacing: -1 }}>{price}</span>
          <span style={{ fontSize: 14, color: C.secondary }}>{priceDetail}</span>
        </div>
        <p style={{ fontSize: 13, color: C.secondary, margin: '0 0 16px', lineHeight: 1.5 }}>{description}</p>

        {/* Credits highlight */}
        <div
          style={{
            padding: '10px 12px',
            borderRadius: 8,
            backgroundColor: `${iconColor}08`,
            border: `1px solid ${iconColor}18`,
            marginBottom: 18,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Zap style={{ width: 14, height: 14, color: iconColor }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{credits}</span>
          </div>
        </div>

        {/* CTA */}
        <div style={{ marginTop: 'auto' }}>
          {href && !isCurrentPlan && !onClick ? (
            <Link href={href} style={ctaStyle}>
              {ctaContent}
            </Link>
          ) : (
            <button
              onClick={isCurrentPlan || loading ? undefined : onClick}
              disabled={isCurrentPlan || loading}
              style={{ ...ctaStyle, fontFamily: 'inherit' }}
            >
              {ctaContent}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ──────────────────────────────────── */

interface PricingPageProps {
  currentTier?: AccountTier;
  isLoggedIn?: boolean;
  creditsRemaining?: number;
}

export function PricingPage({ currentTier, isLoggedIn, creditsRemaining }: PricingPageProps) {
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  async function handleCheckout(plan: 'pro' | 'unlimited') {
    if (!isLoggedIn) {
      router.push('/signup');
      return;
    }
    setLoadingPlan(plan);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to start checkout. Please try again.');
        setLoadingPlan(null);
      }
    } catch {
      alert('Something went wrong. Please try again.');
      setLoadingPlan(null);
    }
  }

  const colWidth = '120px';

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 20px' }}>
      {/* Back link */}
      <Link
        href="/"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 13,
          color: C.secondary,
          textDecoration: 'none',
          marginBottom: 32,
        }}
      >
        <ArrowLeft style={{ width: 14, height: 14 }} />
        Back to app
      </Link>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, color: C.text, margin: '0 0 12px', letterSpacing: -0.5 }}>
          Simple, transparent pricing
        </h1>
        <p style={{ fontSize: 16, color: C.secondary, margin: 0, maxWidth: 520, marginInline: 'auto', lineHeight: 1.6 }}>
          Every plan includes unlimited AI questions and planning. Credits are only used for phone calls.
        </p>
        {isLoggedIn && creditsRemaining !== undefined && (
          <p style={{ fontSize: 14, color: C.blue, margin: '12px 0 0', fontWeight: 500 }}>
            You have {creditsRemaining} credit{creditsRemaining !== 1 ? 's' : ''} remaining
          </p>
        )}
      </div>

      {/* Tier cards */}
      <div
        style={{
          display: 'flex',
          gap: 18,
          justifyContent: 'center',
          flexWrap: 'wrap',
          marginBottom: 56,
        }}
      >
        <TierCard
          name="Free"
          price="$0"
          priceDetail="/month"
          credits="25 credits/month"
          description="Try the app with 25 calls per month."
          cta="Get Started"
          href="/signup"
          isCurrentPlan={currentTier === 'free'}
          icon={Phone}
          iconColor={C.teal}
        />
        <TierCard
          name="Pro"
          price="$19"
          priceDetail="/month"
          credits="200 credits/month"
          description="More calls, longer durations, smarter summaries."
          cta="Upgrade to Pro"
          onClick={() => handleCheckout('pro')}
          loading={loadingPlan === 'pro'}
          highlighted
          badge="Most Popular"
          isCurrentPlan={currentTier === 'pro'}
          icon={Crown}
          iconColor={C.blue}
        />
        <TierCard
          name="Unlimited"
          price="$49"
          priceDetail="/month"
          credits="Unlimited credits"
          description="Never worry about credits again."
          cta="Go Unlimited"
          onClick={() => handleCheckout('unlimited')}
          loading={loadingPlan === 'unlimited'}
          isCurrentPlan={currentTier === 'unlimited'}
          icon={Infinity}
          iconColor={C.purple}
        />
      </div>

      {/* ── Comparison Table ──────────────────────────── */}
      <div style={{ marginBottom: 56 }}>
        <h2 style={{ fontSize: 22, fontWeight: 600, color: C.text, textAlign: 'center', marginBottom: 24 }}>
          Compare plans
        </h2>

        <div
          style={{
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          {/* Sticky header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `1fr ${colWidth} ${colWidth} ${colWidth}`,
              backgroundColor: C.bg,
              borderBottom: `1px solid ${C.border}`,
              position: 'sticky',
              top: 0,
              zIndex: 2,
            }}
          >
            <div style={{ padding: '14px 20px' }} />
            {(['Free', 'Pro', 'Unlimited'] as const).map((tier) => (
              <div
                key={tier}
                style={{
                  padding: '14px 12px',
                  textAlign: 'center',
                  borderLeft: `1px solid ${C.border}`,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{tier}</div>
                <div style={{ fontSize: 11, color: C.secondary, marginTop: 2 }}>
                  {tier === 'Free' ? '$0/mo' : tier === 'Pro' ? '$19/mo' : '$49/mo'}
                </div>
              </div>
            ))}
          </div>

          {/* Category rows */}
          {COMPARISON.map((cat, catIdx) => (
            <div key={cat.category}>
              {/* Category header */}
              <div
                style={{
                  padding: '10px 20px',
                  backgroundColor: C.bg,
                  borderTop: catIdx > 0 ? `1px solid ${C.border}` : 'none',
                  borderBottom: `1px solid ${C.border}`,
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 600, color: C.secondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {cat.category}
                </span>
              </div>

              {/* Feature rows */}
              {cat.rows.map((row, rowIdx) => (
                <div
                  key={row.label}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `1fr ${colWidth} ${colWidth} ${colWidth}`,
                    borderBottom: rowIdx < cat.rows.length - 1 ? `1px solid ${C.border}` : 'none',
                  }}
                >
                  <div style={{ padding: '11px 20px', fontSize: 13, color: C.text }}>
                    {row.label}
                  </div>
                  {(['free', 'pro', 'unlimited'] as const).map((tier) => (
                    <div
                      key={tier}
                      style={{
                        padding: '11px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderLeft: `1px solid ${C.border}`,
                      }}
                    >
                      <CellContent
                        value={row[tier]}
                        isBest={
                          row.bestCol === tier ||
                          (row.bestCol === 'pro' && tier === 'unlimited' && row.pro === row.unlimited)
                        }
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── FAQ ───────────────────────────────────────── */}
      <div style={{ maxWidth: 640, margin: '0 auto', marginBottom: 48 }}>
        <h2 style={{ fontSize: 22, fontWeight: 600, color: C.text, textAlign: 'center', marginBottom: 20 }}>
          Frequently asked questions
        </h2>
        <div style={{ borderTop: `1px solid ${C.border}` }}>
          {FAQ_ITEMS.map((item) => (
            <FAQItem key={item.q} q={item.q} a={item.a} />
          ))}
        </div>
      </div>

      {/* Credit note */}
      <div style={{ textAlign: 'center', padding: 20, borderRadius: 8, backgroundColor: C.bg }}>
        <p style={{ fontSize: 13, color: C.secondary, margin: 0, lineHeight: 1.6 }}>
          1 credit = 1 phone call &middot; Credits reset monthly &middot; AI planning is always free
        </p>
      </div>
    </div>
  );
}
