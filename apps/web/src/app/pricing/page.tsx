import { PricingPage } from '@/components/pricing-page';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { AccountTier } from '@/types';

export const dynamic = 'force-dynamic';

export default async function Pricing() {
  let currentTier: AccountTier | undefined;
  let isLoggedIn = false;
  let creditsRemaining: number | undefined;

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      isLoggedIn = true;
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_tier, credits_remaining')
        .eq('id', user.id)
        .single();

      if (profile?.account_tier) {
        currentTier = profile.account_tier as AccountTier;
      }
      if (profile?.credits_remaining !== undefined && profile?.credits_remaining !== null) {
        creditsRemaining = profile.credits_remaining;
      }
    }
  } catch {
    // Not logged in — show pricing page without current plan indicator
  }

  return <PricingPage currentTier={currentTier} isLoggedIn={isLoggedIn} creditsRemaining={creditsRemaining} />;
}
