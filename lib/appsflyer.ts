/**
 * AppsFlyer Server-to-Server API helper
 * Used for server-side events (purchases) that bypass ad blockers
 */

const APPSFLYER_S2S_ENDPOINT = 'https://api2.appsflyer.com/inappevent/app.myweddingdress.app';

interface AppsFlyerS2SEvent {
  appsflyer_id?: string;
  customer_user_id: string;
  eventName: string;
  eventValue: string;
  eventCurrency?: string;
  eventTime?: string;
  ip?: string;
}

export async function trackServerEvent(
  userId: string,
  eventName: string,
  eventValues: Record<string, any>
): Promise<boolean> {
  const devKey = process.env.APPSFLYER_DEV_KEY;

  if (!devKey) {
    console.warn('[AppsFlyer S2S] APPSFLYER_DEV_KEY not configured');
    return false;
  }

  const event: AppsFlyerS2SEvent = {
    customer_user_id: userId,
    eventName,
    eventValue: JSON.stringify(eventValues),
    eventCurrency: 'USD',
    eventTime: new Date().toISOString(),
  };

  try {
    const response = await fetch(APPSFLYER_S2S_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'authentication': devKey,
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('[AppsFlyer S2S] Error:', response.status, text);
      return false;
    }

    console.log('[AppsFlyer S2S] Event sent:', eventName);
    return true;
  } catch (error) {
    console.error('[AppsFlyer S2S] Failed to send event:', error);
    return false;
  }
}

export async function trackPurchase(
  userId: string,
  revenue: number,
  currency: string = 'USD',
  orderId?: string
): Promise<boolean> {
  return trackServerEvent(userId, 'af_purchase', {
    af_revenue: revenue,
    af_currency: currency,
    af_order_id: orderId,
    af_content_type: 'subscription',
    af_content_id: 'quarterly_plan',
  });
}
