import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { trackPurchase } from '@/lib/appsflyer';

// Credits for quarterly plan
const QUARTERLY_CREDITS = 400;

// Use service role for webhook (no user context)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    console.error('[Webhook] No signature provided');
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('[Webhook] STRIPE_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    console.error('[Webhook] Signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  console.log(`[Webhook] Received event: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(session);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentSucceeded(invoice);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCancelled(subscription);
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Webhook] Error processing event:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle initial checkout completion
 */
async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  console.log('[Webhook] Processing checkout.session.completed');

  if (session.mode !== 'subscription') {
    console.log('[Webhook] Not a subscription checkout, skipping');
    return;
  }

  const subscriptionId = session.subscription as string;
  if (!subscriptionId) {
    console.error('[Webhook] No subscription ID in session');
    return;
  }

  // Get subscription details from Stripe
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const userId = subscription.metadata.supabase_user_id;

  if (!userId) {
    console.error('[Webhook] No user ID in subscription metadata');
    return;
  }

  // Create/update subscription in database
  const { error } = await supabaseAdmin
    .from('subscriptions')
    .upsert({
      user_id: userId,
      stripe_subscription_id: subscriptionId,
      stripe_customer_id: session.customer as string,
      plan: 'quarterly',
      status: 'active',
      credits_balance: QUARTERLY_CREDITS,
      credits_purchased: QUARTERLY_CREDITS,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    });

  if (error) {
    console.error('[Webhook] Failed to create subscription:', error);
    throw error;
  }

  // Track purchase with AppsFlyer S2S
  const amountTotal = session.amount_total ? session.amount_total / 100 : 0;
  await trackPurchase(
    userId,
    amountTotal,
    session.currency?.toUpperCase() || 'USD',
    session.id
  );

  console.log(`[Webhook] Subscription activated for user ${userId} with ${QUARTERLY_CREDITS} credits`);
}

/**
 * Handle invoice payment (including renewals)
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('[Webhook] Processing invoice.payment_succeeded');

  // Only process subscription invoices
  if (!invoice.subscription) {
    console.log('[Webhook] Not a subscription invoice, skipping');
    return;
  }

  const subscriptionId = invoice.subscription as string;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const userId = subscription.metadata.supabase_user_id;

  if (!userId) {
    console.error('[Webhook] No user ID in subscription metadata');
    return;
  }

  // Check if this is a renewal (not the first invoice)
  // billing_reason: 'subscription_create' for first, 'subscription_cycle' for renewals
  const isRenewal = invoice.billing_reason === 'subscription_cycle';

  if (isRenewal) {
    console.log(`[Webhook] Processing renewal for user ${userId}`);

    // Get current subscription to preserve rollover credits
    const { data: currentSub } = await supabaseAdmin
      .from('subscriptions')
      .select('credits_balance')
      .eq('user_id', userId)
      .single();

    // Add new credits (with rollover from previous period, max 2x allocation)
    const rolloverCredits = Math.min(currentSub?.credits_balance || 0, QUARTERLY_CREDITS);
    const newBalance = rolloverCredits + QUARTERLY_CREDITS;

    const { error } = await supabaseAdmin
      .from('subscriptions')
      .update({
        credits_balance: newBalance,
        credits_purchased: QUARTERLY_CREDITS,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      console.error('[Webhook] Failed to update subscription for renewal:', error);
      throw error;
    }

    console.log(`[Webhook] Renewal complete for user ${userId}: ${rolloverCredits} rollover + ${QUARTERLY_CREDITS} new = ${newBalance} credits`);
  } else {
    console.log('[Webhook] First invoice, handled by checkout.session.completed');
  }
}

/**
 * Handle subscription updates (status changes, etc.)
 */
async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  console.log('[Webhook] Processing customer.subscription.updated');

  const userId = subscription.metadata.supabase_user_id;

  if (!userId) {
    console.error('[Webhook] No user ID in subscription metadata');
    return;
  }

  // Map Stripe status to our status
  let status: 'active' | 'inactive' | 'past_due' | 'canceled';
  switch (subscription.status) {
    case 'active':
    case 'trialing':
      status = 'active';
      break;
    case 'past_due':
      status = 'past_due';
      break;
    case 'canceled':
    case 'unpaid':
      status = 'canceled';
      break;
    default:
      status = 'inactive';
  }

  const updateData: Record<string, any> = {
    status,
    updated_at: new Date().toISOString(),
  };

  // Only include period_end if it exists
  if (subscription.current_period_end) {
    updateData.current_period_end = new Date(subscription.current_period_end * 1000).toISOString();
  }

  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update(updateData)
    .eq('user_id', userId);

  if (error) {
    console.error('[Webhook] Failed to update subscription:', error);
    throw error;
  }

  console.log(`[Webhook] Subscription updated for user ${userId}: status=${status}`);
}

/**
 * Handle subscription cancellation
 */
async function handleSubscriptionCancelled(subscription: Stripe.Subscription) {
  console.log('[Webhook] Processing customer.subscription.deleted');

  const userId = subscription.metadata.supabase_user_id;

  if (!userId) {
    console.error('[Webhook] No user ID in subscription metadata');
    return;
  }

  // Downgrade to free plan
  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update({
      plan: 'free',
      status: 'active',
      credits_balance: 2,
      credits_purchased: 2,
      stripe_subscription_id: null,
      current_period_end: null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    console.error('[Webhook] Failed to cancel subscription:', error);
    throw error;
  }

  console.log(`[Webhook] Subscription cancelled for user ${userId}, downgraded to free`);
}
