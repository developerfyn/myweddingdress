import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('[Stripe] STRIPE_SECRET_KEY is not set');
  // Don't throw during build, but log error
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
});

/**
 * Verify Stripe configuration is valid
 */
export async function verifyStripeConfig(): Promise<{
  valid: boolean;
  error?: string;
}> {
  if (!process.env.STRIPE_SECRET_KEY) {
    return { valid: false, error: 'STRIPE_SECRET_KEY not configured' };
  }

  if (!process.env.STRIPE_PRICE_ID) {
    return { valid: false, error: 'STRIPE_PRICE_ID not configured' };
  }

  try {
    // Verify the price exists
    const price = await stripe.prices.retrieve(process.env.STRIPE_PRICE_ID);
    if (!price.active) {
      return { valid: false, error: 'Stripe price is not active' };
    }
    return { valid: true };
  } catch (error: any) {
    return { valid: false, error: error.message };
  }
}
