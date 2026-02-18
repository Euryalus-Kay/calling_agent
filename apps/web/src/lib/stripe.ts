import Stripe from 'stripe';

// Lazy-initialize the Stripe client to avoid errors during build
// when STRIPE_SECRET_KEY is not available
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      typescript: true,
    });
  }
  return _stripe;
}

/** @deprecated Use getStripe() instead. Kept for convenience — accesses lazy singleton. */
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop: string | symbol) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// Price IDs for subscription plans (created in Stripe Dashboard)
export const STRIPE_PRICES = {
  get pro() {
    return process.env.STRIPE_PRO_PRICE_ID!;
  },
  get unlimited() {
    return process.env.STRIPE_UNLIMITED_PRICE_ID!;
  },
} as const;

// One-time credit pack purchases
export const STRIPE_CREDIT_PACKS = {
  credits_10: {
    get priceId() { return process.env.STRIPE_CREDITS_10_PRICE_ID!; },
    credits: 10,
    label: '10 credits',
    price: '$4',
  },
  credits_25: {
    get priceId() { return process.env.STRIPE_CREDITS_25_PRICE_ID!; },
    credits: 25,
    label: '25 credits',
    price: '$9',
  },
  credits_50: {
    get priceId() { return process.env.STRIPE_CREDITS_50_PRICE_ID!; },
    credits: 50,
    label: '50 credits',
    price: '$16',
  },
} as const;

export type CreditPackKey = keyof typeof STRIPE_CREDIT_PACKS;

/** Map a Stripe price ID back to a tier name */
export function priceIdToTier(priceId: string): 'pro' | 'unlimited' | null {
  if (priceId === STRIPE_PRICES.pro) return 'pro';
  if (priceId === STRIPE_PRICES.unlimited) return 'unlimited';
  return null;
}

/** Map a Stripe price ID to the number of credits in a pack */
export function priceIdToCreditPack(priceId: string): number | null {
  for (const pack of Object.values(STRIPE_CREDIT_PACKS)) {
    if (pack.priceId === priceId) return pack.credits;
  }
  return null;
}
