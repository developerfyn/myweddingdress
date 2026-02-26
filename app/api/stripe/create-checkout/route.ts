import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { checkRateLimit } from '@/lib/rate-limiter';

export async function POST() {
  try {
    // Validate environment variables
    if (!process.env.STRIPE_PRICE_ID) {
      console.error('[Stripe] STRIPE_PRICE_ID not configured');
      return NextResponse.json(
        { error: 'Payment system not configured' },
        { status: 500 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[Stripe] Auth error:', authError?.message);
      return NextResponse.json(
        { error: 'Please log in to subscribe' },
        { status: 401 }
      );
    }

    console.log(`[Stripe] Creating checkout for user ${user.id}`);

    // Rate limit: 5 checkout attempts per minute (prevent Stripe API spam)
    const rateLimit = checkRateLimit(user.id, 'stripe_checkout', 5, 60000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many checkout attempts. Please wait a moment.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.resetInSeconds) } }
      );
    }

    // Check if user already has an active subscription
    const { data: existingSub, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('plan', 'quarterly')
      .eq('status', 'active')
      .maybeSingle();

    if (subError) {
      console.error('[Stripe] Error checking subscription:', subError.message);
      // Continue anyway - might be first time user
    }

    if (existingSub?.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'You already have an active subscription' },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    let customerId: string;

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (profile?.stripe_customer_id) {
      // Verify customer still exists in Stripe
      try {
        await stripe.customers.retrieve(profile.stripe_customer_id);
        customerId = profile.stripe_customer_id;
        console.log(`[Stripe] Using existing customer: ${customerId}`);
      } catch {
        // Customer doesn't exist, create new one
        console.log('[Stripe] Stored customer not found, creating new one');
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            supabase_user_id: user.id,
          },
        });
        customerId = customer.id;

        await supabase
          .from('profiles')
          .update({ stripe_customer_id: customerId })
          .eq('id', user.id);
      }
    } else {
      // Create new Stripe customer
      console.log('[Stripe] Creating new customer');
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      customerId = customer.id;

      // Save customer ID to profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);

      if (updateError) {
        console.error('[Stripe] Failed to save customer ID:', updateError.message);
        // Continue anyway - not critical
      }
    }

    // Determine success/cancel URLs
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    // Create checkout session
    console.log(`[Stripe] Creating checkout session with price: ${process.env.STRIPE_PRICE_ID}`);
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/try-on?checkout=success`,
      cancel_url: `${baseUrl}/try-on?checkout=cancelled`,
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
        },
      },
      allow_promotion_codes: true,
    });

    console.log(`[Stripe] Checkout session created: ${session.id}`);
    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('[Stripe] Checkout error:', error);

    // Provide more specific error messages
    if (error.type === 'StripeInvalidRequestError') {
      if (error.message.includes('price')) {
        return NextResponse.json(
          { error: 'Invalid price configuration. Please contact support.' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
