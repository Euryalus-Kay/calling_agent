'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Phone, ArrowRight, Loader2, Sparkles } from 'lucide-react';

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
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border/50">
        <CardContent className="pt-10 pb-8 px-8">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
                <Phone className="h-7 w-7 text-primary-foreground" />
              </div>
              <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-background">
                <Sparkles className="h-3 w-3 text-white" />
              </div>
            </div>
          </div>

          {/* Text */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold tracking-tight mb-2">
              Welcome to CallAgent
            </h1>
            <p className="text-muted-foreground text-[15px] leading-relaxed">
              What should I call you? This is how I&apos;ll introduce myself
              when making calls on your behalf.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-sm font-medium">
                Your name
              </label>
              <Input
                id="name"
                placeholder="e.g. Sarah Johnson"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoFocus
                className="h-12 text-base"
                disabled={loading || skipping}
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold gap-2"
              disabled={!fullName.trim() || loading || skipping}
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
            </Button>
          </form>

          {/* Skip */}
          <div className="mt-6 text-center">
            <button
              onClick={handleSkip}
              disabled={loading || skipping}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              {skipping ? (
                <span className="flex items-center gap-1.5 justify-center">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading...
                </span>
              ) : (
                'Skip for now — I\'ll set this up later'
              )}
            </button>
          </div>

          {/* What to expect */}
          <div className="mt-8 pt-6 border-t border-border/50">
            <p className="text-xs text-muted-foreground/70 text-center mb-3 uppercase font-medium tracking-wider">
              What you can do
            </p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xl font-bold">1</p>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                  Describe your task
                </p>
              </div>
              <div>
                <p className="text-xl font-bold">2</p>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                  AI plans the calls
                </p>
              </div>
              <div>
                <p className="text-xl font-bold">3</p>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                  Calls happen for you
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
