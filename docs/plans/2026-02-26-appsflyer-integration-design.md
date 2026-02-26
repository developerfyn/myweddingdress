# AppsFlyer Integration Design

## Goal

Track paid ad attribution from Meta and TikTok ads through the full conversion funnel: signup → first try-on → purchase.

## Approach

Hybrid integration using AppsFlyer Web SDK for client-side attribution and S2S API for server-side purchase events.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      User's Browser                         │
│  ┌─────────────────┐    ┌──────────────────────────────┐   │
│  │ AppsFlyer SDK   │───▶│ Captures: click_id, utm_*    │   │
│  │ (Web SDK)       │    │ Fires: signup, first_tryon   │   │
│  └─────────────────┘    └──────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Next.js Server                          │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Stripe Webhook (/api/stripe/webhook)                    ││
│  │ → On successful payment, call AppsFlyer S2S API         ││
│  │ → Send: af_purchase event with revenue                  ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     AppsFlyer                               │
│  → Attributes events to Meta/TikTok campaigns              │
│  → Reports in AppsFlyer dashboard                          │
└─────────────────────────────────────────────────────────────┘
```

## New Files

| File | Purpose |
|------|---------|
| `components/appsflyer-provider.tsx` | Initialize Web SDK, expose `trackEvent()` via React context |
| `lib/appsflyer.ts` | Shared constants, S2S API helper for server-side calls |

## Modified Files

| File | Changes |
|------|---------|
| `app/layout.tsx` | Add AppsFlyerProvider to provider tree |
| `app/api/stripe/webhook/route.ts` | Add S2S call on `checkout.session.completed` |

## Environment Variables

| Variable | Scope | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_APPSFLYER_DEV_KEY` | Client | Web SDK initialization |
| `APPSFLYER_DEV_KEY` | Server | S2S API authentication |

## Events

| Event | Trigger | Method | AppsFlyer Event Name |
|-------|---------|--------|---------------------|
| Signup | User creates account | Web SDK | `af_complete_registration` |
| First try-on | User completes first virtual try-on | Web SDK | `af_content_view` with `content_type: first_tryon` |
| Purchase | Stripe payment succeeds | S2S API | `af_purchase` with `af_revenue` |

## Data Flow

1. User clicks Meta/TikTok ad → lands on site with click attribution params
2. AppsFlyer Web SDK captures and stores the click ID in cookies/localStorage
3. User signs up → SDK fires `af_complete_registration` with attribution attached
4. User completes first try-on → SDK fires `af_content_view` event
5. User purchases → Stripe webhook fires → server sends `af_purchase` to AppsFlyer S2S API

## Integration Points

- **PostHog**: Share user identification (email) for cross-platform analysis
- **Stripe**: Webhook triggers S2S purchase event with revenue data
- **Auth Provider**: Trigger signup event on successful registration
- **TryOn Provider**: Trigger first try-on event on completion (check if first)
