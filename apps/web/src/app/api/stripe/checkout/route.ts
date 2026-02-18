import { NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';
import { stripe, STRIPE_PRICES, STRIPE_CREDIT_PACKS, type CreditPackKey } from '@/lib/stripe';

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { plan, creditPack } = body as { plan?: string; creditPack?: string };

    const admin = createSupabaseAdminClient();
    const { data: profileRaw } = await admin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    const profile = profileRaw as Record<string, unknown> | null;

    // Create or retrieve Stripe customer
    let customerId = (profile?.stripe_customer_id as string) || null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await admin
        .from('profiles')
        .update({ stripe_customer_id: customerId } as never)
        .eq('id', user.id);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // --- One-time credit pack purchase ---
    if (creditPack && creditPack in STRIPE_CREDIT_PACKS) {
      const pack = STRIPE_CREDIT_PACKS[creditPack as CreditPackKey];

      // Only pro users can buy extra credits
      if ((profile?.account_tier as string) !== 'pro') {
        return NextResponse.json(
          { error: 'Credit packs are only available for Pro plan users.' },
          { status: 403 }
        );
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'payment',
        line_items: [{ price: pack.priceId, quantity: 1 }],
        success_url: `${appUrl}/settings?tab=billing&checkout=success`,
        cancel_url: `${appUrl}/settings?tab=billing`,
        metadata: {
          supabase_user_id: user.id,
          type: 'credit_pack',
          credits: String(pack.credits),
        },
      });

      return NextResponse.json({ url: session.url });
    }

    // --- Subscription checkout ---
    if (plan && (plan === 'pro' || plan === 'unlimited')) {
      const priceId = STRIPE_PRICES[plan];

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${appUrl}/settings?tab=billing&checkout=success`,
        cancel_url: `${appUrl}/pricing`,
        metadata: {
          supabase_user_id: user.id,
          type: 'subscription',
        },
      });

      return NextResponse.json({ url: session.url });
    }

    return NextResponse.json({ error: 'Invalid plan or credit pack' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Stripe Checkout] Error:', message);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
