# AppsFlyer Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Track paid ad attribution from Meta/TikTok through the full conversion funnel (signup → first try-on → purchase).

**Architecture:** Hybrid integration - AppsFlyer Web SDK for client-side attribution and signup/try-on events, S2S API for server-side purchase events from Stripe webhook.

**Tech Stack:** AppsFlyer Web SDK (`appsflyer-web-sdk`), AppsFlyer S2S API, Next.js 16, React 19, TypeScript

---

## Task 1: Install AppsFlyer Web SDK

**Files:**
- Modify: `package.json`

**Step 1: Install the package**

Run:
```bash
npm install appsflyer-web-sdk
```

Expected: Package added to dependencies

**Step 2: Verify installation**

Run:
```bash
grep "appsflyer-web-sdk" package.json
```

Expected: `"appsflyer-web-sdk": "^X.X.X"` in dependencies

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install appsflyer-web-sdk"
```

---

## Task 2: Add Environment Variables

**Files:**
- Modify: `.env.local` (local only, not committed)
- Modify: `.env.example` (if exists, or create)

**Step 1: Add env vars to local environment**

Add to `.env.local`:
```
NEXT_PUBLIC_APPSFLYER_DEV_KEY=your_dev_key_here
APPSFLYER_DEV_KEY=your_dev_key_here
```

**Step 2: Document env vars**

Create or update `.env.example`:
```
# AppsFlyer
NEXT_PUBLIC_APPSFLYER_DEV_KEY=  # Web SDK (client-side)
APPSFLYER_DEV_KEY=              # S2S API (server-side)
```

**Step 3: Verify env loading**

Run:
```bash
echo "Env vars documented"
```

Note: Do NOT commit actual keys. Only commit `.env.example`.

---

## Task 3: Create AppsFlyer Provider

**Files:**
- Create: `components/appsflyer-provider.tsx`

**Step 1: Create the provider file**

```tsx
'use client';

import { createContext, useContext, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/components/auth-provider';

// AppsFlyer Web SDK types
declare global {
  interface Window {
    AF_SDK?: {
      PLUGINS: {
        PBA: any;
      };
    };
    AF?: (command: string, ...args: any[]) => void;
  }
}

interface AppsFlyerContextValue {
  trackEvent: (eventName: string, eventValues?: Record<string, any>) => void;
  setCustomerUserId: (userId: string) => void;
}

const AppsFlyerContext = createContext<AppsFlyerContextValue>({
  trackEvent: () => {},
  setCustomerUserId: () => {},
});

export function useAppsFlyer() {
  return useContext(AppsFlyerContext);
}

function AppsFlyerIdentify() {
  const { user } = useAuth();
  const { setCustomerUserId } = useAppsFlyer();

  useEffect(() => {
    if (user?.id) {
      setCustomerUserId(user.id);
    }
  }, [user?.id, setCustomerUserId]);

  return null;
}

export function AppsFlyerProvider({ children }: { children: React.ReactNode }) {
  const isInitialized = useRef(false);
  const devKey = process.env.NEXT_PUBLIC_APPSFLYER_DEV_KEY;

  useEffect(() => {
    if (typeof window === 'undefined' || !devKey || isInitialized.current) {
      return;
    }

    // Load AppsFlyer Web SDK
    const script = document.createElement('script');
    script.src = 'https://websdk.appsflyer.com/web-sdk/v2.0/web-sdk.min.js';
    script.async = true;
    script.onload = () => {
      if (window.AF) {
        window.AF('pba', 'init', {
          devKey,
          appId: 'myweddingdress.com',
        });
        isInitialized.current = true;
        console.log('[AppsFlyer] SDK initialized');
      }
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup if needed
    };
  }, [devKey]);

  const trackEvent = useCallback((eventName: string, eventValues?: Record<string, any>) => {
    if (typeof window !== 'undefined' && window.AF) {
      window.AF('pba', 'event', {
        eventType: 'EVENT',
        eventName,
        eventValue: eventValues,
      });
      console.log('[AppsFlyer] Event tracked:', eventName, eventValues);
    }
  }, []);

  const setCustomerUserId = useCallback((userId: string) => {
    if (typeof window !== 'undefined' && window.AF) {
      window.AF('pba', 'setCustomerUserId', userId);
      console.log('[AppsFlyer] Customer user ID set:', userId);
    }
  }, []);

  return (
    <AppsFlyerContext.Provider value={{ trackEvent, setCustomerUserId }}>
      <AppsFlyerIdentify />
      {children}
    </AppsFlyerContext.Provider>
  );
}
```

**Step 2: Verify file created**

Run:
```bash
ls -la components/appsflyer-provider.tsx
```

Expected: File exists

**Step 3: Commit**

```bash
git add components/appsflyer-provider.tsx
git commit -m "feat: add AppsFlyer provider with Web SDK initialization"
```

---

## Task 4: Add AppsFlyer Provider to Layout

**Files:**
- Modify: `app/layout.tsx:42` (inside PostHogProvider)

**Step 1: Import AppsFlyerProvider**

Add import at top of file:
```tsx
import { AppsFlyerProvider } from '@/components/appsflyer-provider'
```

**Step 2: Wrap children with AppsFlyerProvider**

Change the provider tree from:
```tsx
<PostHogProvider>
  {children}
</PostHogProvider>
```

To:
```tsx
<PostHogProvider>
  <AppsFlyerProvider>
    {children}
  </AppsFlyerProvider>
</PostHogProvider>
```

**Step 3: Verify build**

Run:
```bash
npm run build 2>&1 | head -20
```

Expected: Build succeeds (or only unrelated warnings)

**Step 4: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: integrate AppsFlyer provider into app layout"
```

---

## Task 5: Track Signup Event

**Files:**
- Modify: `components/auth-provider.tsx:133-138`

**Step 1: Import useAppsFlyer hook**

Add import:
```tsx
import { useAppsFlyer } from '@/components/appsflyer-provider';
```

**Step 2: Get trackEvent from context**

Inside `AuthProvider` component, after the existing state declarations, add:
```tsx
const { trackEvent } = useAppsFlyer();
```

Wait - this won't work because AppsFlyerProvider is a child of AuthProvider in the layout. We need a different approach.

**Step 2 (revised): Track signup in a separate component**

Create a new component inside auth-provider.tsx that uses both hooks:

After the `AuthProvider` component, add a new internal component and modify the provider:

Actually, let's handle this differently. We'll track the signup event from within the `onAuthStateChange` callback by calling a global function.

**Step 2 (final approach): Fire event via window.AF directly**

In `components/auth-provider.tsx`, inside the `onAuthStateChange` callback (around line 135), after `SIGNED_IN`:

```tsx
if (event === 'SIGNED_IN' && session?.user) {
  setUser(session.user);
  setIsLoading(false);
  fetchUserData(session.user.id);

  // Track signup with AppsFlyer
  if (typeof window !== 'undefined' && window.AF) {
    window.AF('pba', 'setCustomerUserId', session.user.id);
    window.AF('pba', 'event', {
      eventType: 'EVENT',
      eventName: 'af_complete_registration',
      eventValue: {
        af_registration_method: session.user.app_metadata?.provider || 'email',
      },
    });
  }
}
```

**Step 3: Add Window type declaration**

At top of file, add:
```tsx
declare global {
  interface Window {
    AF?: (command: string, ...args: any[]) => void;
  }
}
```

**Step 4: Verify build**

Run:
```bash
npm run build 2>&1 | head -20
```

Expected: Build succeeds

**Step 5: Commit**

```bash
git add components/auth-provider.tsx
git commit -m "feat: track signup event with AppsFlyer"
```

---

## Task 6: Track First Try-On Event

**Files:**
- Modify: `components/tryon-generation-provider.tsx:274-284`

**Step 1: Add Window type declaration**

At top of file (after imports), add:
```tsx
declare global {
  interface Window {
    AF?: (command: string, ...args: any[]) => void;
  }
}
```

**Step 2: Track first try-on on completion**

Inside the `doGenerate` async function, after success handling (around line 274), add AppsFlyer tracking:

Find this block:
```tsx
if (data.success && data.image) {
  // Update job with success
  updateJob(jobId, {
    status: 'completed',
    result: data.image,
  });
```

Add after the `updateJob` call:
```tsx
  // Track first try-on with AppsFlyer (fire for all completions, AppsFlyer dedupes)
  if (typeof window !== 'undefined' && window.AF) {
    window.AF('pba', 'event', {
      eventType: 'EVENT',
      eventName: 'af_content_view',
      eventValue: {
        af_content_type: 'first_tryon',
        af_content_id: gown.id,
        af_content: gown.name,
      },
    });
  }
```

**Step 3: Verify build**

Run:
```bash
npm run build 2>&1 | head -20
```

Expected: Build succeeds

**Step 4: Commit**

```bash
git add components/tryon-generation-provider.tsx
git commit -m "feat: track try-on completion with AppsFlyer"
```

---

## Task 7: Create S2S API Helper

**Files:**
- Create: `lib/appsflyer.ts`

**Step 1: Create the helper file**

```typescript
/**
 * AppsFlyer Server-to-Server API helper
 * Used for server-side events (purchases) that bypass ad blockers
 */

const APPSFLYER_S2S_ENDPOINT = 'https://api2.appsflyer.com/inappevent/app.myweddingdress.com';

interface AppsFlyerS2SEvent {
  appsflyer_id?: string;
  customer_user_id: string;
  eventName: string;
  eventValue: string; // JSON stringified
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

/**
 * Track a purchase event via S2S API
 */
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
```

**Step 2: Verify file created**

Run:
```bash
ls -la lib/appsflyer.ts
```

Expected: File exists

**Step 3: Commit**

```bash
git add lib/appsflyer.ts
git commit -m "feat: add AppsFlyer S2S API helper for server-side events"
```

---

## Task 8: Track Purchase in Stripe Webhook

**Files:**
- Modify: `app/api/stripe/webhook/route.ts:87-134`

**Step 1: Import AppsFlyer helper**

Add import at top:
```typescript
import { trackPurchase } from '@/lib/appsflyer';
```

**Step 2: Add AppsFlyer tracking to checkout handler**

In the `handleCheckoutComplete` function, after the successful database upsert (around line 131), add:

```typescript
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
```

**Step 3: Verify build**

Run:
```bash
npm run build 2>&1 | head -20
```

Expected: Build succeeds

**Step 4: Commit**

```bash
git add app/api/stripe/webhook/route.ts
git commit -m "feat: track purchases with AppsFlyer S2S from Stripe webhook"
```

---

## Task 9: Test Integration End-to-End

**Files:** None (manual testing)

**Step 1: Start dev server**

Run:
```bash
npm run dev
```

**Step 2: Open browser dev tools**

Navigate to the site. Open Console tab.

Expected: `[AppsFlyer] SDK initialized` in console

**Step 3: Test signup event**

Create a new account or log in.

Expected: `[AppsFlyer] Customer user ID set: <user_id>` and `[AppsFlyer] Event tracked: af_complete_registration` in console

**Step 4: Test try-on event**

Complete a virtual try-on.

Expected: `[AppsFlyer] Event tracked: af_content_view` in console

**Step 5: Verify in AppsFlyer dashboard**

Log into AppsFlyer dashboard and verify events appear (may take a few minutes).

---

## Task 10: Final Commit and Cleanup

**Step 1: Verify all changes**

Run:
```bash
git status
git log --oneline -5
```

Expected: All tasks committed separately

**Step 2: Create summary commit (optional)**

If any uncommitted changes remain:
```bash
git add -A
git commit -m "chore: AppsFlyer integration complete"
```

---

## Environment Variables Checklist

Before deploying to production, ensure these are set:

| Variable | Where | Required |
|----------|-------|----------|
| `NEXT_PUBLIC_APPSFLYER_DEV_KEY` | Vercel env vars | Yes |
| `APPSFLYER_DEV_KEY` | Vercel env vars | Yes |

## Events Summary

| Event | Where Tracked | AppsFlyer Event |
|-------|--------------|-----------------|
| Signup | `auth-provider.tsx` (client) | `af_complete_registration` |
| Try-on | `tryon-generation-provider.tsx` (client) | `af_content_view` |
| Purchase | `stripe/webhook/route.ts` (server) | `af_purchase` |
