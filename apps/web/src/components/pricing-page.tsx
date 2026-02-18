'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Check,
  Phone,
  Zap,
  Crown,
  Infinity,
  ArrowLeft,
  MessageCircle,
  Brain,
  Clock,
  Shield,
  Loader2,
} from 'lucide-react';
import type { AccountTier } from '@/types';

interface TierCardProps {
  name: string;
  price: string;
  priceDetail: string;
  credits: string;
  description: string;
  features: string[];
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
  features,
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
    <span
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
      }}
    >
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
      ? {
          backgroundColor: '#F7F6F3',
          color: '#787774',
          border: '1px solid #E3E2DE',
        }
      : highlighted
      ? {
          backgroundColor: '#2383E2',
          color: '#FFFFFF',
          border: 'none',
        }
      : {
          backgroundColor: '#FFFFFF',
          color: '#37352F',
          border: '1px solid #E3E2DE',
        }),
  };

  return (
    <div
      style={{
        flex: 1,
        minWidth: 280,
        maxWidth: 360,
        padding: highlighted ? '2px' : 0,
        borderRadius: 12,
        background: highlighted
          ? 'linear-gradient(135deg, #2383E2, #6940A5)'
          : 'transparent',
      }}
    >
      <div
        style={{
          background: '#FFFFFF',
          border: highlighted ? 'none' : '1px solid #E3E2DE',
          borderRadius: highlighted ? 10 : 12,
          padding: '28px 24px',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: `${iconColor}12`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon style={{ width: 16, height: 16, color: iconColor }} />
            </div>
            <span style={{ fontSize: 16, fontWeight: 600, color: '#37352F' }}>{name}</span>
            {badge && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#FFFFFF',
                  backgroundColor: '#2383E2',
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
                  color: '#4DAB9A',
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
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
            <span style={{ fontSize: 36, fontWeight: 700, color: '#37352F', letterSpacing: -1 }}>{price}</span>
            <span style={{ fontSize: 14, color: '#787774' }}>{priceDetail}</span>
          </div>
          <p style={{ fontSize: 13, color: '#787774', margin: 0, lineHeight: 1.5 }}>{description}</p>
        </div>

        {/* Credits highlight */}
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 8,
            backgroundColor: `${iconColor}08`,
            border: `1px solid ${iconColor}18`,
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Zap style={{ width: 14, height: 14, color: iconColor }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#37352F' }}>{credits}</span>
          </div>
        </div>

        {/* Features */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {features.map((feature, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <Check
                style={{
                  width: 15,
                  height: 15,
                  color: '#4DAB9A',
                  marginTop: 1,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 13, color: '#37352F', lineHeight: 1.4 }}>{feature}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
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
  );
}

interface PricingPageProps {
  currentTier?: AccountTier;
  isLoggedIn?: boolean;
}

export function PricingPage({ currentTier, isLoggedIn }: PricingPageProps) {
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
          color: '#787774',
          textDecoration: 'none',
          marginBottom: 32,
        }}
      >
        <ArrowLeft style={{ width: 14, height: 14 }} />
        Back to app
      </Link>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, color: '#37352F', margin: '0 0 12px', letterSpacing: -0.5 }}>
          Simple, transparent pricing
        </h1>
        <p style={{ fontSize: 16, color: '#787774', margin: 0, maxWidth: 500, marginInline: 'auto', lineHeight: 1.6 }}>
          Every plan includes unlimited AI questions and planning. Credits are only used for actual phone calls and texts.
        </p>
      </div>

      {/* Tier cards */}
      <div
        style={{
          display: 'flex',
          gap: 20,
          justifyContent: 'center',
          flexWrap: 'wrap',
          marginBottom: 64,
        }}
      >
        <TierCard
          name="Free"
          price="$0"
          priceDetail="/month"
          credits="25 credits/month"
          description="Perfect for trying out the app. Make up to 25 calls a month for free."
          features={[
            'Unlimited AI questions & planning',
            '25 phone calls per month',
            'Up to 3 calls at once',
            '5-minute max call duration',
            '5 tasks per day',
            '50 memories & contacts',
            '30-day call history',
          ]}
          cta="Get Started"
          href="/signup"
          isCurrentPlan={currentTier === 'free'}
          icon={Phone}
          iconColor="#4DAB9A"
        />

        <TierCard
          name="Pro"
          price="$19"
          priceDetail="/month"
          credits="200 credits/month"
          description="For people who use the phone regularly. More calls, longer durations, smarter summaries."
          features={[
            'Unlimited AI questions & planning',
            '200 phone calls per month',
            'Buy extra credits anytime',
            'Up to 10 calls at once',
            '10-minute max call duration',
            '50 tasks per day',
            'Opus AI summaries',
            'Unlimited memories & contacts',
            'Unlimited call history',
            'Email support',
          ]}
          cta="Upgrade to Pro"
          onClick={() => handleCheckout('pro')}
          loading={loadingPlan === 'pro'}
          highlighted
          badge="Most Popular"
          isCurrentPlan={currentTier === 'pro'}
          icon={Crown}
          iconColor="#2383E2"
        />

        <TierCard
          name="Unlimited"
          price="$49"
          priceDetail="/month"
          credits="Unlimited credits"
          description="Never worry about credits. Unlimited calls with the highest limits."
          features={[
            'Unlimited AI questions & planning',
            'Unlimited phone calls',
            'Up to 20 calls at once',
            '15-minute max call duration',
            'Unlimited tasks per day',
            'Opus AI summaries',
            'Unlimited memories & contacts',
            'Unlimited call history',
            'Priority support',
          ]}
          cta="Go Unlimited"
          onClick={() => handleCheckout('unlimited')}
          loading={loadingPlan === 'unlimited'}
          isCurrentPlan={currentTier === 'unlimited'}
          icon={Infinity}
          iconColor="#6940A5"
        />
      </div>

      {/* Feature comparison */}
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: '#37352F', textAlign: 'center', marginBottom: 24 }}>
          What&apos;s included in every plan
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16,
          }}
        >
          {[
            { icon: MessageCircle, title: 'Unlimited AI chat', desc: 'Ask questions and plan calls without using credits' },
            { icon: Brain, title: 'Smart memory', desc: 'AI remembers details from every call you make' },
            { icon: Clock, title: 'Real-time tracking', desc: 'Watch your calls progress live with transcripts' },
            { icon: Shield, title: 'Verified caller ID', desc: 'Calls show your real phone number' },
          ].map(({ icon: FIcon, title, desc }) => (
            <div
              key={title}
              style={{
                padding: '16px 18px',
                borderRadius: 8,
                border: '1px solid #E3E2DE',
              }}
            >
              <FIcon style={{ width: 18, height: 18, color: '#787774', marginBottom: 8 }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: '#37352F', marginBottom: 4 }}>{title}</div>
              <div style={{ fontSize: 12, color: '#787774', lineHeight: 1.5 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ / note */}
      <div style={{ textAlign: 'center', marginTop: 48, padding: '24px', borderRadius: 8, backgroundColor: '#F7F6F3' }}>
        <p style={{ fontSize: 13, color: '#787774', margin: 0, lineHeight: 1.6 }}>
          1 credit = 1 phone call. SMS costs 0.5 credits. Credits reset monthly.
          AI questions, planning, and task creation are always free on all plans.
        </p>
      </div>
    </div>
  );
}
