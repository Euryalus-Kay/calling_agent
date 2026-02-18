import { NextResponse } from 'next/server';
import { stripe, priceIdToTier } from '@/lib/stripe';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { TIER_LIMITS } from '@/types';
import type Stripe from 'stripe';

// Helper: look up profile by stripe_customer_id using raw SQL via rpc or select *
async function findProfileByCustomerId(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  customerId: string
): Promise<Record<string, unknown> | null> {
  // Use select('*') then filter, since stripe_customer_id may not be in generated types
  const { data } = await admin
    .from('profiles')
    .select('*')
    .eq('stripe_customer_id' as string, customerId)
    .single();
  return data as Record<string, unknown> | null;
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown';
    console.error('[Stripe Webhook] Signature verification failed:', msg);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  try {
    switch (event.type) {
      // ── Subscription created or updated ──
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const priceId = subscription.items.data[0]?.price.id;
        const tier = priceIdToTier(priceId);

        if (!tier) {
          console.warn('[Stripe Webhook] Unknown price ID:', priceId);
          break;
        }

        const tierLimits = TIER_LIMITS[tier];

        const profile = await findProfileByCustomerId(admin, customerId);
        if (!profile) {
          console.error('[Stripe Webhook] No profile found for customer:', customerId);
          break;
        }

        const profileId = profile.id as string;
        const currentTier = profile.account_tier as string;

        const isUpgrade =
          currentTier === 'free' ||
          (currentTier === 'pro' && tier === 'unlimited');

        // In Stripe v20+, period dates are on the subscription item, not the subscription
        const subItem = subscription.items.data[0];
        const billingStart = new Date(
          subItem.current_period_start * 1000
        ).toISOString();
        const billingEnd = new Date(
          subItem.current_period_end * 1000
        ).toISOString();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateData: Record<string, any> = {
          account_tier: tier,
          stripe_subscription_id: subscription.id,
          stripe_price_id: priceId,
          credits_monthly_allowance:
            tierLimits.credits_monthly === -1 ? 999999 : tierLimits.credits_monthly,
          billing_period_start: billingStart,
          billing_period_end: billingEnd,
        };

        // Reset credits on initial upgrade or new subscription
        if (isUpgrade || event.type === 'customer.subscription.created') {
          updateData.credits_remaining =
            tierLimits.credits_monthly === -1
              ? 999999
              : tierLimits.credits_monthly;
        }

        await admin
          .from('profiles')
          .update(updateData as never)
          .eq('id', profileId);

        // Log upgrade transaction
        if (isUpgrade) {
          await admin.from('credit_transactions').insert({
            user_id: profileId,
            amount:
              tierLimits.credits_monthly === -1 ? 0 : tierLimits.credits_monthly,
            type: 'tier_upgrade',
            description: `Upgraded to ${tier} plan`,
          } as never);
        }

        console.log(
          `[Stripe Webhook] ${event.type}: user ${profileId} → ${tier}`
        );
        break;
      }

      // ── Subscription deleted (cancelled + period ended) ──
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const profile = await findProfileByCustomerId(admin, customerId);
        if (!profile) break;

        const profileId = profile.id as string;
        const freeLimits = TIER_LIMITS.free;
        await admin
          .from('profiles')
          .update({
            account_tier: 'free',
            stripe_subscription_id: null,
            stripe_price_id: null,
            credits_remaining: freeLimits.credits_monthly,
            credits_monthly_allowance: freeLimits.credits_monthly,
          } as never)
          .eq('id', profileId);

        await admin.from('credit_transactions').insert({
          user_id: profileId,
          amount: freeLimits.credits_monthly,
          type: 'monthly_reset',
          description: 'Downgraded to free plan',
        } as never);

        console.log(
          `[Stripe Webhook] subscription.deleted: user ${profileId} → free`
        );
        break;
      }

      // ── Invoice paid (handles monthly renewals → credit reset) ──
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;

        // Only process subscription renewals, not initial payments
        if (invoice.billing_reason !== 'subscription_cycle') break;

        const customerId = invoice.customer as string;
        const profile = await findProfileByCustomerId(admin, customerId);
        if (!profile) break;

        const profileId = profile.id as string;
        const accountTier = profile.account_tier as string;
        const allowance = profile.credits_monthly_allowance as number;

        await admin
          .from('profiles')
          .update({
            credits_remaining:
              accountTier === 'unlimited' ? 999999 : allowance,
            billing_period_start: new Date().toISOString(),
            billing_period_end: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000
            ).toISOString(),
          } as never)
          .eq('id', profileId);

        await admin.from('credit_transactions').insert({
          user_id: profileId,
          amount: allowance,
          type: 'monthly_reset',
          description: `Monthly credit reset (${accountTier} plan)`,
        } as never);

        console.log(
          `[Stripe Webhook] invoice.paid (renewal): user ${profileId} credits reset`
        );
        break;
      }

      // ── Checkout session completed (credit pack purchases) ──
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        // Only handle credit pack purchases (subscriptions handled by subscription events)
        if (session.metadata?.type !== 'credit_pack') break;

        const credits = parseInt(session.metadata.credits || '0', 10);
        const userId = session.metadata.supabase_user_id;
        if (!credits || !userId) break;

        await (admin.rpc as Function)('add_credits', {
          p_user_id: userId,
          p_amount: credits,
          p_type: 'purchase',
          p_description: `Purchased ${credits} credit pack`,
        });

        console.log(
          `[Stripe Webhook] checkout.session.completed: user ${userId} +${credits} credits`
        );
        break;
      }

      // ── Payment failed ──
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        console.warn(
          `[Stripe Webhook] Payment failed for customer ${customerId}. Stripe will retry.`
        );
        break;
      }

      default:
        // Unhandled event type — ignore
        break;
    }
  } catch (err) {
    console.error('[Stripe Webhook] Error processing event:', err);
    // Return 200 anyway — the webhook was received, we had a processing bug
  }

  return NextResponse.json({ received: true });
}
