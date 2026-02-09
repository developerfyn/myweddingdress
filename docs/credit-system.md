# Credit System Documentation

## Overview

My Wedding Dress uses a unified credit system to control access to AI-powered try-on and video generation features.

---

## Pricing & Credits

### Subscription Tiers

| Tier | Price | Credits | Reset |
|------|-------|---------|-------|
| Free | $0 | 2 credits/day | Daily (midnight, user's local timezone) |
| Quarterly | $39.99/quarter | 400 credits | On subscription start date each month |

### Credit Costs per Action

| Action | Credits Required | Available To |
|--------|-----------------|--------------|
| Try-on Generation | 2 credits | Free + Paid |
| Video Generation | 8 credits | Paid only |

---

## API Costs & Profit Margins

### Per-Action Economics

| Action | Credits | User Pays | API Cost | Profit | Margin |
|--------|---------|-----------|----------|--------|--------|
| 1 Try-on | 2 | $0.20 | $0.075 (FASHN) | $0.125 | **62.5%** |
| 1 Video | 8 | $0.80 | $0.35 (KLING) | $0.45 | **56.25%** |

### Quarterly Subscription Scenarios (400 credits)

| Usage Pattern | Generations | API Cost | Profit | Margin |
|---------------|-------------|----------|--------|--------|
| All try-ons | 200 try-ons | $15.00 | $24.99 | **62.5%** |
| All videos | 50 videos | $17.50 | $22.49 | **56.2%** |
| Mixed (70/30) | 140 try-ons + 15 videos | ~$15.75 | ~$24.24 | **~60%** |

### With Typical Utilization

Assuming 60% credit utilization (industry average):
- **Cost**: ~$9.45
- **Profit**: ~$30.54
- **Margin**: **~76%**

---

## Credit Rules

### Free Users
- Receive **2 credits per day**
- Can only perform **try-ons** (no video generation)
- Credits reset at **midnight in user's local timezone**
- **No accumulation** - unused daily credits do not carry over

### Paid Users (Quarterly)
- Receive **400 credits** upon subscription
- Can perform both **try-ons and video generation**
- Credits reset on **subscription start date** each month
- **Unused credits roll over** to next quarter if subscription is renewed
- On renewal: **400 fresh credits + remaining credits** from previous quarter

### Credit Expiration
- Credits **expire** if user does not renew their subscription
- No refunds for unused credits

### Failed Generations
- If a try-on or video generation **fails** (API error, timeout, etc.)
- Credits are **automatically refunded**

---

## API Providers

| Feature | Provider | Cost per Call | Documentation |
|---------|----------|---------------|---------------|
| Virtual Try-on | FASHN API | $0.075 | [fashn.ai](https://fashn.ai) |
| Video Generation | KLING | $0.35 | [klingai.com](https://klingai.com) |

---

## UI Display Locations

Credits are displayed in:
1. **Sidebar** - Always visible
2. **Try-on Modal** - Before generating
3. **Settings Page** - With detailed usage history

---

## Future Considerations

- **Credit top-ups**: Allow users to purchase additional credits without subscribing
- **Multiple tiers**: Basic vs Pro with different allocations
- **Annual plans**: Discounted annual subscriptions

---

## Technical Implementation

### Database Tables
- `subscriptions` - Stores plan type, start date, credit balance
- `usage_logs` - Tracks all generations for analytics and credit deduction

### Key Functions
- `can_user_perform_action()` - RPC to check if user has sufficient credits
- Credit deduction happens on successful generation
- Credit refund happens on failed generation

---

*Last updated: February 2026*
