'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Phone, ArrowRight, Loader2 } from 'lucide-react';

export function OnboardingForm({ userId }: { userId: string }) {
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  async function handleComplete(name?: string) {
    setLoading(true);
    try {
      const updateData: Record<string, unknown> = {
        onboarding_completed: true,
      };
      if (name) {
        updateData.full_name = name;
      }
      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (error) throw error;
      router.push('/');
      router.refresh();
    } catch {
      setLoading(false);
      setSkipping(false);
    }
  }

  async function handleSkip() {
    setSkipping(true);
    await handleComplete();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) return;
    await handleComplete(fullName.trim());
  }

  return (
    <div
      style={{ backgroundColor: '#F7F6F3' }}
      className="min-h-screen flex flex-col items-center justify-center p-4"
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E3E2DE',
          borderRadius: '8px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
        }}
        className="w-full max-w-md"
      >
        <div className="pt-10 pb-8 px-8">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div
              style={{
                backgroundColor: '#2383E2',
                borderRadius: '8px',
                width: '48px',
                height: '48px',
              }}
              className="flex items-center justify-center"
            >
              <Phone style={{ color: '#FFFFFF' }} className="h-5 w-5" />
            </div>
          </div>

          {/* Text */}
          <div className="text-center mb-8">
            <h1
              style={{ color: '#37352F' }}
              className="text-2xl font-bold tracking-tight mb-2"
            >
              Welcome to CallAgent
            </h1>
            <p
              style={{ color: '#787774', lineHeight: '1.6' }}
              className="text-[15px]"
            >
              What should I call you? This is how I&apos;ll introduce myself
              when making calls on your behalf.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="name"
                style={{ color: '#37352F' }}
                className="text-sm font-medium block"
              >
                Your name
              </label>
              <input
                id="name"
                type="text"
                placeholder="e.g. Sarah Johnson"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoFocus
                disabled={loading || skipping}
                style={{
                  border: '1px solid #E3E2DE',
                  borderRadius: '6px',
                  color: '#37352F',
                  backgroundColor: '#FFFFFF',
                  outline: 'none',
                }}
                className="h-11 w-full px-3 text-base transition-colors placeholder:text-[#C4C4C0] focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2] disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <button
              type="submit"
              disabled={!fullName.trim() || loading || skipping}
              style={{
                backgroundColor: '#2383E2',
                color: '#FFFFFF',
                borderRadius: '8px',
                border: 'none',
              }}
              className="w-full h-11 text-base font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading && !skipping ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  Get started
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Skip */}
          <div className="mt-6 text-center">
            <button
              onClick={handleSkip}
              disabled={loading || skipping}
              style={{ color: '#787774', background: 'none', border: 'none' }}
              className="text-sm hover:opacity-70 transition-opacity disabled:opacity-50 cursor-pointer"
            >
              {skipping ? (
                <span className="flex items-center gap-1.5 justify-center">
                  <Loader2
                    style={{ color: '#787774' }}
                    className="h-3 w-3 animate-spin"
                  />
                  Loading...
                </span>
              ) : (
                'Skip for now \u2014 I\'ll set this up later'
              )}
            </button>
          </div>

          {/* What to expect */}
          <div
            style={{ borderTop: '1px solid #E3E2DE' }}
            className="mt-8 pt-6"
          >
            <p
              style={{ color: '#787774' }}
              className="text-xs text-center mb-4 uppercase font-medium tracking-wider"
            >
              What you can do
            </p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p
                  style={{ color: '#37352F' }}
                  className="text-xl font-bold"
                >
                  1
                </p>
                <p
                  style={{ color: '#787774' }}
                  className="text-[11px] leading-tight mt-0.5"
                >
                  Describe your task
                </p>
              </div>
              <div>
                <p
                  style={{ color: '#37352F' }}
                  className="text-xl font-bold"
                >
                  2
                </p>
                <p
                  style={{ color: '#787774' }}
                  className="text-[11px] leading-tight mt-0.5"
                >
                  AI plans the calls
                </p>
              </div>
              <div>
                <p
                  style={{ color: '#37352F' }}
                  className="text-xl font-bold"
                >
                  3
                </p>
                <p
                  style={{ color: '#787774' }}
                  className="text-[11px] leading-tight mt-0.5"
                >
                  Calls happen for you
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
