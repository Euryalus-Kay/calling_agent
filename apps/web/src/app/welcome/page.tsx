'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Phone,
  ArrowRight,
  CheckCircle,
  Clock,
  PhoneCall,
  Shield,
  Zap,
  BarChart3,
  Bot,
  Menu,
  X,
} from 'lucide-react';

/* ── Scroll-reveal hook ──────────────────────────────── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.15 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

/* ── Hero chat demo ──────────────────────────────────── */
function HeroChatDemo() {
  const [phase, setPhase] = useState<'typing-user' | 'dots' | 'typing-ai' | 'done'>('typing-user');
  const [charIdx, setCharIdx] = useState(0);
  const [aiLineIdx, setAiLineIdx] = useState(0);

  const userMsg = 'Book a dentist cleaning for next Tuesday afternoon';
  const aiLines = [
    'Sure! Let me handle that for you.',
    '',
    'Here\'s the plan:',
    '1. Call Dr. Chen\'s office at (555) 234-5678',
    '2. Request a cleaning appointment',
    '3. Preferred time: Tuesday, 2-4pm',
    '',
    'Ready to make the call?',
  ];

  const reset = useCallback(() => {
    setPhase('typing-user');
    setCharIdx(0);
    setAiLineIdx(0);
  }, []);

  useEffect(() => {
    if (phase === 'typing-user') {
      if (charIdx < userMsg.length) {
        const t = setTimeout(() => setCharIdx(c => c + 1), 35);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => setPhase('dots'), 400);
      return () => clearTimeout(t);
    }
    if (phase === 'dots') {
      const t = setTimeout(() => setPhase('typing-ai'), 1400);
      return () => clearTimeout(t);
    }
    if (phase === 'typing-ai') {
      if (aiLineIdx < aiLines.length) {
        const t = setTimeout(() => setAiLineIdx(i => i + 1), 200);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => setPhase('done'), 2000);
      return () => clearTimeout(t);
    }
    if (phase === 'done') {
      const t = setTimeout(reset, 2000);
      return () => clearTimeout(t);
    }
  }, [phase, charIdx, aiLineIdx, userMsg.length, aiLines.length, reset]);

  return (
    <div className="animate-float">
      <div className="mx-auto w-full max-w-[420px] rounded-lg border border-[#E3E2DE] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        {/* Title bar */}
        <div className="flex items-center gap-2 border-b border-[#E3E2DE] px-4 py-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#2383E2]">
            <Phone className="h-3 w-3 text-white" />
          </div>
          <span className="text-[13px] font-semibold text-[#37352F]">CallAgent</span>
          <span className="ml-auto text-[11px] text-[#787774]">just now</span>
        </div>

        {/* Messages */}
        <div className="space-y-4 p-4" style={{ minHeight: 240 }}>
          {/* User message */}
          <div className="flex justify-end">
            <div className="max-w-[80%] rounded-lg bg-[#2383E2] px-3.5 py-2.5">
              <p className="text-[14px] leading-relaxed text-white">
                {userMsg.slice(0, charIdx)}
                {phase === 'typing-user' && (
                  <span className="animate-blink ml-0.5 inline-block h-4 w-0.5 bg-white/70" />
                )}
              </p>
            </div>
          </div>

          {/* Typing dots */}
          {phase === 'dots' && (
            <div className="flex gap-1 px-1">
              <span className="typing-dot h-2 w-2 rounded-full bg-[#787774]" />
              <span className="typing-dot h-2 w-2 rounded-full bg-[#787774]" />
              <span className="typing-dot h-2 w-2 rounded-full bg-[#787774]" />
            </div>
          )}

          {/* AI response */}
          {(phase === 'typing-ai' || phase === 'done') && (
            <div className="max-w-[90%]">
              <div className="rounded-lg bg-[#F7F6F3] px-3.5 py-2.5">
                {aiLines.slice(0, aiLineIdx).map((line, i) => (
                  <p
                    key={i}
                    className="text-[14px] leading-relaxed text-[#37352F]"
                    style={{
                      opacity: 0,
                      animation: 'fadeUp 0.3s cubic-bezier(0.4,0,0.2,1) forwards',
                      animationDelay: `${i * 0.05}s`,
                      minHeight: line === '' ? 8 : undefined,
                    }}
                  >
                    {line}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Feature demo tabs ───────────────────────────────── */
const FEATURE_TABS = [
  {
    label: 'Phone menus',
    content: {
      title: 'Navigates phone trees automatically',
      description: 'CallAgent listens to IVR menus and presses the right buttons to reach a human, so you never have to sit through "Press 1 for English..."',
      demo: [
        { type: 'system', text: '"Press 1 for appointments, Press 2 for billing..."' },
        { type: 'agent', text: 'Pressing 1 for appointments' },
        { type: 'system', text: '"Press 3 for new patient scheduling"' },
        { type: 'agent', text: 'Pressing 3 — connected to scheduling desk' },
      ],
    },
  },
  {
    label: 'Holds for you',
    content: {
      title: 'Waits on hold so you don\'t have to',
      description: 'When placed on hold, CallAgent stays on the line and alerts you the moment a person picks up.',
      demo: [
        { type: 'system', text: '"Your estimated wait time is 12 minutes"' },
        { type: 'agent', text: 'I\'m on hold — I\'ll let you know when someone answers.' },
        { type: 'agent', text: '[8 min later] A representative just picked up.' },
        { type: 'agent', text: 'Booking your appointment now...' },
      ],
    },
  },
  {
    label: 'Multiple calls',
    content: {
      title: 'Makes up to 5 calls at the same time',
      description: 'Need to find the earliest appointment across several offices? CallAgent calls them all simultaneously.',
      demo: [
        { type: 'agent', text: 'Calling Dr. Chen\'s office...' },
        { type: 'agent', text: 'Calling City Dental...' },
        { type: 'agent', text: 'Calling Smile Care...' },
        { type: 'system', text: 'City Dental has the earliest slot: Tuesday 3pm' },
      ],
    },
  },
  {
    label: 'Smart retry',
    content: {
      title: 'Automatically retries failed calls',
      description: 'Busy signal? Line drops? No answer? CallAgent retries with full context so nothing is lost.',
      demo: [
        { type: 'agent', text: 'Calling (555) 234-5678...' },
        { type: 'system', text: 'Line busy. Retrying in 30 seconds...' },
        { type: 'agent', text: 'Retrying — connected! Picking up where we left off.' },
        { type: 'agent', text: 'Appointment confirmed for Tuesday at 2pm.' },
      ],
    },
  },
];

function FeatureTabsDemo() {
  const [activeTab, setActiveTab] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setProgress(0);
    const start = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min((elapsed / 5000) * 100, 100);
      setProgress(pct);
      if (pct >= 100) {
        if (timerRef.current) clearInterval(timerRef.current);
        setActiveTab(t => (t + 1) % FEATURE_TABS.length);
      }
    }, 50);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [activeTab]);

  function selectTab(idx: number) {
    if (timerRef.current) clearInterval(timerRef.current);
    setActiveTab(idx);
  }

  const tab = FEATURE_TABS[activeTab];

  return (
    <div>
      {/* Tab buttons */}
      <div className="flex flex-wrap gap-2 mb-8">
        {FEATURE_TABS.map((t, i) => (
          <button
            key={t.label}
            onClick={() => selectTab(i)}
            className={`relative rounded-lg px-4 py-2 text-[14px] font-medium transition-colors duration-300 ${
              i === activeTab
                ? 'bg-[#37352F] text-white'
                : 'bg-[#F7F6F3] text-[#787774] hover:bg-[#EFEFEF] hover:text-[#37352F]'
            }`}
          >
            {t.label}
            {i === activeTab && (
              <span
                className="absolute bottom-0 left-0 h-0.5 bg-white/40 rounded-full"
                style={{ width: `${progress}%`, transition: 'width 50ms linear' }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="grid md:grid-cols-2 gap-10 items-start">
        <div>
          <h3 className="text-[22px] font-semibold text-[#37352F] mb-3 tracking-[-0.02em]">
            {tab.content.title}
          </h3>
          <p className="text-[16px] leading-[1.6] text-[#787774]">
            {tab.content.description}
          </p>
        </div>

        {/* Demo card */}
        <div className="rounded-lg border border-[#E3E2DE] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
          <div className="space-y-3">
            {tab.content.demo.map((line, i) => (
              <div
                key={`${activeTab}-${i}`}
                className="flex items-start gap-2.5"
                style={{
                  opacity: 0,
                  animation: 'fadeUp 0.4s cubic-bezier(0.4,0,0.2,1) forwards',
                  animationDelay: `${i * 0.15}s`,
                }}
              >
                <div
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                    line.type === 'agent'
                      ? 'bg-[#2383E2] text-white'
                      : 'bg-[#F7F6F3] text-[#787774]'
                  }`}
                >
                  {line.type === 'agent' ? 'A' : 'S'}
                </div>
                <p className="text-[14px] leading-relaxed text-[#37352F]">
                  {line.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────── */
export default function WelcomePage() {
  const [mobileNav, setMobileNav] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const howItWorks = useReveal();
  const features = useReveal();
  const useCases = useReveal();
  const cta = useReveal();

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 10); }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white text-[#37352F]">
      {/* ── Nav ─────────────────────────────────────── */}
      <nav
        className={`sticky top-0 z-50 bg-white transition-shadow duration-300 ${
          scrolled ? 'shadow-[0_1px_2px_rgba(0,0,0,0.06)] border-b border-[#E3E2DE]' : ''
        }`}
      >
        <div className="mx-auto flex h-14 max-w-[1080px] items-center justify-between px-6">
          <Link href="/welcome" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#37352F]">
              <Phone className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-[15px] font-semibold">CallAgent</span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-6">
            <a href="#how-it-works" className="text-[14px] text-[#787774] hover:text-[#37352F] transition-colors">
              How it works
            </a>
            <a href="#features" className="text-[14px] text-[#787774] hover:text-[#37352F] transition-colors">
              Features
            </a>
            <div className="h-4 w-px bg-[#E3E2DE]" />
            <Link href="/login" className="text-[14px] text-[#787774] hover:text-[#37352F] transition-colors">
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-[#2383E2] px-4 py-2 text-[14px] font-medium text-white transition-all duration-300 hover:bg-[#1B6EC2] hover:scale-[1.02]"
            >
              Get started free
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button className="md:hidden" onClick={() => setMobileNav(!mobileNav)}>
            {mobileNav ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile nav overlay */}
        {mobileNav && (
          <div className="md:hidden absolute inset-x-0 top-14 bg-white border-b border-[#E3E2DE] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-6 space-y-4">
            <a href="#how-it-works" onClick={() => setMobileNav(false)} className="block text-[15px] text-[#37352F]">How it works</a>
            <a href="#features" onClick={() => setMobileNav(false)} className="block text-[15px] text-[#37352F]">Features</a>
            <div className="h-px bg-[#E3E2DE]" />
            <Link href="/login" onClick={() => setMobileNav(false)} className="block text-[15px] text-[#37352F]">Log in</Link>
            <Link href="/signup" onClick={() => setMobileNav(false)} className="block rounded-lg bg-[#2383E2] px-4 py-2.5 text-center text-[15px] font-medium text-white">Get started free</Link>
          </div>
        )}
      </nav>

      {/* ── Hero ────────────────────────────────────── */}
      <section className="mx-auto max-w-[1080px] px-6 pt-20 pb-24 md:pt-28 md:pb-32">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          {/* Left: text */}
          <div>
            <p className="animate-fade-up text-[13px] font-medium text-[#2383E2] tracking-wide mb-4">
              Your AI phone assistant
            </p>
            <h1 className="animate-fade-up animate-delay-1 text-[40px] md:text-[52px] font-bold leading-[1.1] tracking-[-0.02em] mb-5">
              Never sit on the phone again.
            </h1>
            <p className="animate-fade-up animate-delay-2 text-[17px] leading-[1.7] text-[#787774] mb-8 max-w-md">
              Tell CallAgent what you need — a dentist appointment, an insurance inquiry, a dinner
              reservation — and it handles every phone call from start to finish.
            </p>
            <div className="animate-fade-up animate-delay-3 flex flex-col sm:flex-row gap-3">
              <Link
                href="/signup"
                className="group inline-flex items-center justify-center gap-2 rounded-lg bg-[#2383E2] px-6 py-3 text-[15px] font-medium text-white transition-all duration-300 hover:bg-[#1B6EC2] hover:scale-[1.02] active:scale-[0.98]"
              >
                Get started free
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center rounded-lg border border-[#E3E2DE] px-6 py-3 text-[15px] font-medium text-[#37352F] transition-all duration-300 hover:bg-[#F7F6F3]"
              >
                See how it works
              </a>
            </div>
            <p className="animate-fade-up animate-delay-4 mt-5 text-[13px] text-[#787774]">
              Free to try. No credit card needed.
            </p>
          </div>

          {/* Right: animated chat demo */}
          <div className="animate-fade-up animate-delay-2 hidden md:block">
            <HeroChatDemo />
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────── */}
      <section
        id="how-it-works"
        ref={howItWorks.ref}
        className="bg-[#F7F6F3] py-24 md:py-32"
      >
        <div
          className={`mx-auto max-w-[1080px] px-6 transition-all duration-700 ${
            howItWorks.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
          }`}
        >
          <h2 className="text-[32px] md:text-[40px] font-bold tracking-[-0.02em] mb-3">
            Three steps. That&apos;s it.
          </h2>
          <p className="text-[16px] text-[#787774] leading-[1.6] mb-14 max-w-lg">
            Describe what you need, review the plan, and let your AI assistant handle every call.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'Describe your task',
                description: '"Book a dentist cleaning for next Tuesday" — just type what you\'d tell a helpful friend.',
              },
              {
                step: '2',
                title: 'AI plans the calls',
                description: 'CallAgent figures out who to call, what to say, and maps out the conversation.',
              },
              {
                step: '3',
                title: 'Calls happen automatically',
                description: 'Watch live transcripts as calls happen. Get a summary with the results when done.',
              },
            ].map((item, i) => (
              <div
                key={item.step}
                className="rounded-lg border border-[#E3E2DE] bg-white p-7"
                style={{
                  opacity: howItWorks.visible ? 1 : 0,
                  transform: howItWorks.visible ? 'translateY(0)' : 'translateY(12px)',
                  transition: `all 0.5s cubic-bezier(0.4,0,0.2,1) ${i * 0.1}s`,
                }}
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#37352F] text-[13px] font-bold text-white mb-5">
                  {item.step}
                </span>
                <h3 className="text-[17px] font-semibold mb-2 tracking-[-0.01em]">{item.title}</h3>
                <p className="text-[15px] leading-[1.6] text-[#787774]">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature demos with tabs ─────────────────── */}
      <section
        id="features"
        ref={features.ref}
        className="py-24 md:py-32"
      >
        <div
          className={`mx-auto max-w-[1080px] px-6 transition-all duration-700 ${
            features.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
          }`}
        >
          <h2 className="text-[32px] md:text-[40px] font-bold tracking-[-0.02em] mb-3">
            Built for real phone calls
          </h2>
          <p className="text-[16px] text-[#787774] leading-[1.6] mb-14 max-w-lg">
            Not a toy demo. CallAgent handles everything a real phone call throws at it.
          </p>

          <FeatureTabsDemo />

          {/* Additional feature cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-16">
            {[
              {
                icon: Phone,
                title: 'IVR navigation',
                description: 'Presses the right buttons to get through automated menus.',
              },
              {
                icon: Clock,
                title: 'Holds for you',
                description: 'Sits on hold so you don\'t have to. Alerts you when someone picks up.',
              },
              {
                icon: Zap,
                title: 'Simultaneous calls',
                description: 'Makes up to 5 calls at the same time to find the best option faster.',
              },
              {
                icon: Shield,
                title: 'Auto-retry',
                description: 'Automatically retries dropped or busy calls with full context.',
              },
              {
                icon: BarChart3,
                title: 'Live transcripts',
                description: 'Watch every word of the conversation as it happens in real time.',
              },
              {
                icon: Bot,
                title: 'Smart adaptation',
                description: 'Handles transfers, voicemails, and unexpected situations gracefully.',
              },
            ].map((feature, i) => (
              <div
                key={feature.title}
                className="rounded-lg border border-[#E3E2DE] bg-white p-6 transition-all duration-300 hover:shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:-translate-y-0.5"
                style={{
                  opacity: features.visible ? 1 : 0,
                  transform: features.visible ? 'translateY(0)' : 'translateY(12px)',
                  transition: `all 0.5s cubic-bezier(0.4,0,0.2,1) ${0.3 + i * 0.08}s`,
                }}
              >
                <feature.icon className="h-5 w-5 text-[#787774] mb-3" strokeWidth={1.5} />
                <h3 className="text-[15px] font-semibold mb-1">{feature.title}</h3>
                <p className="text-[14px] leading-[1.6] text-[#787774]">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Use cases ───────────────────────────────── */}
      <section
        ref={useCases.ref}
        className="bg-[#F7F6F3] py-24 md:py-32"
      >
        <div
          className={`mx-auto max-w-[1080px] px-6 transition-all duration-700 ${
            useCases.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
          }`}
        >
          <h2 className="text-[32px] md:text-[40px] font-bold tracking-[-0.02em] mb-3">
            What people use it for
          </h2>
          <p className="text-[16px] text-[#787774] leading-[1.6] mb-12 max-w-lg">
            Anything that starts with &ldquo;I need to call...&rdquo;
          </p>

          <div className="grid sm:grid-cols-2 gap-3">
            {[
              'Book doctor, dentist, or specialist appointments',
              'Call insurance companies about claims or coverage',
              'Make restaurant reservations',
              'Check store hours or product availability',
              'Schedule home repair or maintenance',
              'Follow up on orders or deliveries',
              'Call government offices for information',
              'Get quotes from multiple service providers',
            ].map((item, i) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-lg bg-white border border-[#E3E2DE] p-4"
                style={{
                  opacity: useCases.visible ? 1 : 0,
                  transform: useCases.visible ? 'translateY(0)' : 'translateY(8px)',
                  transition: `all 0.4s cubic-bezier(0.4,0,0.2,1) ${i * 0.05}s`,
                }}
              >
                <CheckCircle className="h-4 w-4 text-[#4DAB9A] shrink-0" strokeWidth={2} />
                <span className="text-[14px] font-medium">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────── */}
      <section ref={cta.ref} className="py-24 md:py-32">
        <div
          className={`mx-auto max-w-[1080px] px-6 transition-all duration-700 ${
            cta.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
          }`}
        >
          <div className="rounded-lg border border-[#E3E2DE] bg-[#F7F6F3] p-10 md:p-16">
            <h2 className="text-[28px] md:text-[36px] font-bold tracking-[-0.02em] mb-3">
              Stop wasting time on the phone.
            </h2>
            <p className="text-[16px] leading-[1.6] text-[#787774] mb-8 max-w-md">
              Create a free account and let CallAgent handle your next call.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/signup"
                className="group inline-flex items-center justify-center gap-2 rounded-lg bg-[#2383E2] px-6 py-3 text-[15px] font-medium text-white transition-all duration-300 hover:bg-[#1B6EC2] hover:scale-[1.02] active:scale-[0.98]"
              >
                Get started free
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-lg border border-[#E3E2DE] bg-white px-6 py-3 text-[15px] font-medium text-[#37352F] transition-all duration-300 hover:bg-[#EFEFEF]"
              >
                Log in
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────── */}
      <footer className="border-t border-[#E3E2DE] bg-[#F7F6F3]">
        <div className="mx-auto max-w-[1080px] px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#37352F]">
              <Phone className="h-3 w-3 text-white" />
            </div>
            <span className="text-[13px] font-semibold">CallAgent</span>
          </div>
          <p className="text-[12px] text-[#787774]">
            Powered by Claude AI
          </p>
        </div>
      </footer>
    </div>
  );
}
