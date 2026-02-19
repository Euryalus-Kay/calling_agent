import type { SupabaseClient } from '@supabase/supabase-js';
import { TIER_LIMITS, type AccountTier, type PlannedCall } from '@/types';

/**
 * Check if the user's billing period has expired and reset credits if so.
 * Should be called at the start of credit-consuming API routes.
 */
export async function checkAndResetCredits(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  const profile = profileRaw as Record<string, unknown> | null;
  if (!profile) return;

  // Paid users with active Stripe subscriptions: credit resets are handled
  // by the Stripe webhook (invoice.paid event). Skip manual reset.
  if (profile.stripe_subscription_id) return;

  const now = new Date();
  const periodEnd = new Date(profile.billing_period_end as string);

  if (now >= periodEnd) {
    // Reset credits and advance billing period
    const newPeriodStart = now.toISOString();
    const newPeriodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const allowance = profile.credits_monthly_allowance as number;

    await supabase
      .from('profiles')
      .update({
        credits_remaining: allowance,
        billing_period_start: newPeriodStart,
        billing_period_end: newPeriodEnd,
      } as never)
      .eq('id', userId);

    // Log the reset transaction (use admin/service role if available, ignore RLS errors)
    await supabase
      .from('credit_transactions')
      .insert({
        user_id: userId,
        amount: allowance,
        type: 'monthly_reset',
        description: `Monthly credit reset (${profile.account_tier as string} tier)`,
      } as never)
      .then(undefined, () => {
        // Ignore insert errors (RLS may block if using user client)
      });
  }
}

/**
 * Get tier limits for the given account tier.
 */
export function getTierLimits(tier: AccountTier) {
  return TIER_LIMITS[tier] || TIER_LIMITS.free;
}

/**
 * Calculate credits needed for a set of planned calls.
 * 1 credit per call.
 */
export function calculateCreditsNeeded(calls: PlannedCall[]): number {
  return calls.length;
}

/**
 * Check if user has enough credits. Returns true for unlimited tier.
 */
export function hasEnoughCredits(
  accountTier: AccountTier,
  creditsRemaining: number,
  creditsNeeded: number
): boolean {
  if (accountTier === 'unlimited') return true;
  return creditsRemaining >= creditsNeeded;
}
