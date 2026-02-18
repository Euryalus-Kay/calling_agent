import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { checkAndResetCredits } from '@/lib/credits';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Reset if billing period expired
    await checkAndResetCredits(supabase, user.id);

    // Fetch profile with credit info
    const { data: profile } = await supabase
      .from('profiles')
      .select('account_tier, credits_remaining, credits_monthly_allowance, billing_period_start, billing_period_end')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Fetch recent credit transactions
    const { data: transactions } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    return NextResponse.json({
      credits_remaining: profile.credits_remaining ?? 25,
      credits_monthly_allowance: profile.credits_monthly_allowance ?? 25,
      account_tier: profile.account_tier ?? 'free',
      billing_period_start: profile.billing_period_start,
      billing_period_end: profile.billing_period_end,
      transactions: transactions || [],
    });
  } catch (err) {
    console.error('[Credits] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch credits' }, { status: 500 });
  }
}
