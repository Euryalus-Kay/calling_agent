'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Phone, Eye, EyeOff, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';

interface AuthFormProps {
  mode: 'login' | 'signup';
}

export function AuthForm({ mode }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/api/auth/callback`,
          },
        });
        if (error) throw error;

        // Check if the user was actually created or if they already exist
        // Supabase returns a user with empty identities if the email is already taken
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          throw new Error('An account with this email already exists. Please sign in instead.');
        }

        // If the session exists, email confirmation is disabled — go straight in
        if (data.session) {
          setSuccess(true);
          setTimeout(() => {
            router.push('/onboarding');
            router.refresh();
          }, 1000);
        } else {
          // Email confirmation is required — show check email message
          setNeedsConfirmation(true);
          setSuccess(true);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      // Make common Supabase errors more user-friendly
      if (message.includes('Email not confirmed')) {
        setError('Your email is not confirmed yet. Check your inbox for a confirmation link.');
      } else if (message.includes('Invalid login credentials')) {
        setError('Wrong email or password. Please try again.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
    if (error) setError(error.message);
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#FFFFFF' }}>
        <div
          className="w-full max-w-md rounded-lg px-8 py-12 text-center"
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E3E2DE',
            boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
          }}
        >
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
            style={{ backgroundColor: 'rgba(77, 171, 154, 0.1)' }}
          >
            <CheckCircle className="h-8 w-8" style={{ color: '#4DAB9A' }} />
          </div>
          {needsConfirmation ? (
            <>
              <h2 className="text-xl font-semibold mb-2" style={{ color: '#37352F' }}>
                Check your email
              </h2>
              <p className="text-sm max-w-xs mx-auto" style={{ color: '#787774' }}>
                We sent a confirmation link to{' '}
                <strong style={{ color: '#37352F' }}>{email}</strong>.
                Click the link to activate your account, then come back to sign in.
              </p>
              <Link
                href="/login"
                className="inline-block mt-6 text-sm font-medium hover:underline underline-offset-4"
                style={{ color: '#2383E2' }}
              >
                Go to sign in
              </Link>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold mb-2" style={{ color: '#37352F' }}>
                Account created!
              </h2>
              <p className="text-sm" style={{ color: '#787774' }}>
                Setting up your account...
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F7F6F3' }}>
      {/* Back to home link */}
      <div className="p-6">
        <Link
          href="/welcome"
          className="inline-flex items-center gap-1.5 text-sm transition-colors hover:opacity-80"
          style={{ color: '#787774' }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 -mt-16">
        <div
          className="w-full max-w-md rounded-lg"
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E3E2DE',
            boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
          }}
        >
          {/* Header */}
          <div className="text-center px-8 pt-8 pb-2">
            <div
              className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-lg"
              style={{ backgroundColor: '#2383E2' }}
            >
              <Phone className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold" style={{ color: '#37352F' }}>
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h1>
            <p className="text-base mt-2" style={{ color: '#787774' }}>
              {mode === 'login'
                ? 'Sign in to manage your AI phone calls'
                : 'Start making AI-powered phone calls in minutes'}
            </p>
          </div>

          {/* Content */}
          <div className="px-8 pt-4 pb-8">
            {/* Google OAuth button first */}
            <button
              type="button"
              className="w-full h-11 rounded-lg text-sm font-medium inline-flex items-center justify-center transition-colors hover:opacity-90"
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E3E2DE',
                color: '#37352F',
                boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
              }}
              onClick={handleGoogleLogin}
            >
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full" style={{ borderTop: '1px solid #E3E2DE' }} />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="px-3" style={{ backgroundColor: '#FFFFFF', color: '#787774' }}>
                  or continue with email
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div className="space-y-1.5">
                  <label htmlFor="fullName" className="text-sm font-medium" style={{ color: '#37352F' }}>
                    Full name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full h-11 rounded-lg px-3 text-sm outline-none transition-shadow placeholder:opacity-50"
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E3E2DE',
                      color: '#37352F',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#2383E2';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(35,131,226,0.15)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#E3E2DE';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium" style={{ color: '#37352F' }}>
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full h-11 rounded-lg px-3 text-sm outline-none transition-shadow placeholder:opacity-50"
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E3E2DE',
                    color: '#37352F',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#2383E2';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(35,131,226,0.15)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#E3E2DE';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium" style={{ color: '#37352F' }}>
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={mode === 'signup' ? 'Min. 6 characters' : 'Enter your password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full h-11 rounded-lg px-3 pr-10 text-sm outline-none transition-shadow placeholder:opacity-50"
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E3E2DE',
                      color: '#37352F',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#2383E2';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(35,131,226,0.15)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#E3E2DE';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: '#787774' }}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  className="rounded-lg px-4 py-3"
                  style={{
                    backgroundColor: 'rgba(235, 87, 87, 0.06)',
                    border: '1px solid rgba(235, 87, 87, 0.25)',
                  }}
                >
                  <p className="text-sm" style={{ color: '#EB5757' }}>{error}</p>
                </div>
              )}

              <button
                type="submit"
                className="w-full h-11 rounded-lg text-sm font-semibold text-white inline-flex items-center justify-center transition-opacity disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                style={{ backgroundColor: '#2383E2' }}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                  </>
                ) : (
                  mode === 'login' ? 'Sign in' : 'Create account'
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm" style={{ color: '#787774' }}>
              {mode === 'login' ? (
                <>
                  Don&apos;t have an account?{' '}
                  <Link
                    href="/signup"
                    className="font-medium hover:underline underline-offset-4"
                    style={{ color: '#2383E2' }}
                  >
                    Sign up for free
                  </Link>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <Link
                    href="/login"
                    className="font-medium hover:underline underline-offset-4"
                    style={{ color: '#2383E2' }}
                  >
                    Sign in
                  </Link>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
