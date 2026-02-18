import { PricingPage } from '@/components/pricing-page';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { AccountTier } from '@/types';

export const dynamic = 'force-dynamic';

export default async function Pricing() {
  let currentTier: AccountTier | undefined;
  let isLoggedIn = false;

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      isLoggedIn = true;
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_tier')
        .eq('id', user.id)
        .single();

      if (profile?.account_tier) {
        currentTier = profile.account_tier as AccountTier;
      }
    }
  } catch {
    // Not logged in — show pricing page without current plan indicator
  }

  return <PricingPage currentTier={currentTier} isLoggedIn={isLoggedIn} />;
}
