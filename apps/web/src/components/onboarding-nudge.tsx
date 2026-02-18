'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Phone,
  Shield,
  Brain,
  Users,
  X,
  ArrowRight,
} from 'lucide-react';

interface NudgeConfig {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
  linkText: string;
  color: string;
  bgColor: string;
}

interface OnboardingNudgeProps {
  hasPhoneNumber: boolean;
  hasVerifiedCallerId: boolean;
  memoryCount: number;
  contactCount: number;
}

const NUDGES: NudgeConfig[] = [
  {
    id: 'phone_number',
    icon: Phone,
    title: 'Add your phone number',
    description: 'Businesses need a way to reach you back. Add your number in settings.',
    href: '/settings',
    linkText: 'Go to settings',
    color: '#2383E2',
    bgColor: 'rgba(35, 131, 226, 0.04)',
  },
  {
    id: 'caller_id',
    icon: Shield,
    title: 'Call from your own number',
    description: 'Verify your phone so calls show your real number and people can call you back.',
    href: '/settings',
    linkText: 'Set up now',
    color: '#6940A5',
    bgColor: 'rgba(105, 64, 165, 0.04)',
  },
  {
    id: 'memory',
    icon: Brain,
    title: 'Teach me about yourself',
    description: 'Add a memory so I can personalize calls — like your insurance or preferences.',
    href: '/knowledge?tab=memory',
    linkText: 'Add a memory',
    color: '#D9730D',
    bgColor: 'rgba(217, 115, 13, 0.04)',
  },
  {
    id: 'contacts',
    icon: Users,
    title: 'Save your frequent contacts',
    description: 'Add contacts so you can say "call my dentist" and I\'ll know who to reach.',
    href: '/knowledge?tab=contacts',
    linkText: 'Add a contact',
    color: '#4DAB9A',
    bgColor: 'rgba(77, 171, 154, 0.04)',
  },
];

const STORAGE_KEY = 'callagent_dismissed_nudges';

function getDismissedNudges(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function dismissNudge(id: string) {
  const dismissed = getDismissedNudges();
  dismissed.add(id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...dismissed]));
}

export function OnboardingNudge({
  hasPhoneNumber,
  hasVerifiedCallerId,
  memoryCount,
  contactCount,
}: OnboardingNudgeProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDismissedIds(getDismissedNudges());
  }, []);

  if (!mounted) return null;

  // Find first applicable nudge that hasn't been dismissed
  const activeNudge = NUDGES.find((nudge) => {
    if (dismissedIds.has(nudge.id)) return false;
    switch (nudge.id) {
      case 'phone_number':
        return !hasPhoneNumber;
      case 'caller_id':
        return hasPhoneNumber && !hasVerifiedCallerId;
      case 'memory':
        return memoryCount === 0;
      case 'contacts':
        return contactCount === 0;
      default:
        return false;
    }
  });

  if (!activeNudge) return null;

  const Icon = activeNudge.icon;

  function handleDismiss() {
    dismissNudge(activeNudge!.id);
    setDismissedIds((prev) => new Set([...prev, activeNudge!.id]));
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 18px',
        borderRadius: 8,
        border: `1px solid ${activeNudge.color}20`,
        backgroundColor: activeNudge.bgColor,
        marginBottom: 32,
        position: 'relative',
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
          backgroundColor: `${activeNudge.color}10`,
          flexShrink: 0,
        }}
      >
        <Icon style={{ width: 18, height: 18, color: activeNudge.color }} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 14,
          fontWeight: 600,
          color: '#37352F',
          margin: 0,
        }}>
          {activeNudge.title}
        </p>
        <p style={{
          fontSize: 13,
          color: '#787774',
          margin: '2px 0 0',
        }}>
          {activeNudge.description}
        </p>
      </div>

      <Link
        href={activeNudge.href}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '6px 12px',
          fontSize: 13,
          fontWeight: 500,
          color: activeNudge.color,
          background: '#FFFFFF',
          border: `1px solid ${activeNudge.color}30`,
          borderRadius: 6,
          textDecoration: 'none',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        {activeNudge.linkText}
        <ArrowRight style={{ width: 12, height: 12 }} />
      </Link>

      <button
        onClick={handleDismiss}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 20,
          height: 20,
          borderRadius: 4,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#B4B4B0',
          padding: 0,
        }}
        title="Dismiss"
      >
        <X style={{ width: 12, height: 12 }} />
      </button>
    </div>
  );
}
