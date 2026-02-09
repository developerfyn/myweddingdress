import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Use service role for webhook (no user context)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('[Webhook] Signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(session);
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

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const userId = session.subscription
    ? (await stripe.subscriptions.retrieve(session.subscription as string))
        .metadata.supabase_user_id
    : session.metadata?.supabase_user_id;

  if (!userId) {
    console.error('[Webhook] No user ID found in session');
    return;
  }

  const subscriptionId = session.subscription as string;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  // Update or create subscription in database
  const { error } = await supabaseAdmin
    .from('subscriptions')
    .upsert({
      user_id: userId,
      stripe_subscription_id: subscriptionId,
      stripe_customer_id: session.customer as string,
      plan: 'quarterly',
      status: 'active',
      credits_balance: 400,
      credits_purchased: 400,
      period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    }, {
      onConflict: 'user_id',
    });

  if (error) {
    console.error('[Webhook] Failed to update subscription:', error);
    throw error;
  }

  console.log(`[Webhook] Subscription activated for user ${userId}`);
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.supabase_user_id;

  if (!userId) {
    console.error('[Webhook] No user ID in subscription metadata');
    return;
  }

  const status = subscription.status === 'active' ? 'active' : 'inactive';

  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update({
      status,
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    console.error('[Webhook] Failed to update subscription:', error);
  }

  console.log(`[Webhook] Subscription updated for user ${userId}: ${status}`);
}

async function handleSubscriptionCancelled(subscription: Stripe.Subscription) {
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
    })
    .eq('user_id', userId);

  if (error) {
    console.error('[Webhook] Failed to cancel subscription:', error);
  }

  console.log(`[Webhook] Subscription cancelled for user ${userId}`);
}
