# Credit System Implementation Plan

## Phase 1: Database Schema Updates

### 1.1 Update subscriptions table
```sql
ALTER TABLE subscriptions ADD COLUMN credits_balance INT DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN credits_purchased INT DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN period_start TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN timezone VARCHAR(50) DEFAULT 'UTC';
```

### 1.2 Update usage_logs credits_used values
- Try-on: 2 credits
- Video: 8 credits

### 1.3 New RPC Functions
- `get_user_credits()` - Get current credit state
- `deduct_credits()` - Atomic deduction
- `refund_credits()` - Refund on failure

---

## Phase 2: Backend Updates

### 2.1 Update lib/usage-tracking.ts
- New credit constants (2 for try-on, 8 for video)
- New functions to interact with RPC

### 2.2 Update API routes
- `/api/tryon` - Use new credit system
- `/api/generate-video` - Use new credit system, block free users

### 2.3 Create credit API endpoint
- `GET /api/credits` - Fetch current credit state

---

## Phase 3: Frontend Components

### 3.1 Credit Display Component
- `components/credit-display.tsx` - Reusable credit counter

### 3.2 Update Sidebar
- Show credits in sidebar

### 3.3 Update Try-on Modal
- Show credits before generating
- Block if insufficient

### 3.4 Update Settings Page
- Detailed credit info and usage

### 3.5 Upgrade Prompt Component
- Show when credits exhausted

---

## Phase 4: Timezone Handling

### 4.1 Detect timezone on login
- Store in subscriptions.timezone

### 4.2 Settings page
- Allow timezone override

---

## Credit Values

| Action | Credits |
|--------|---------|
| Try-on | 2 |
| Video | 8 |

| Plan | Allocation | Reset |
|------|------------|-------|
| Free | 2/day | Daily (user timezone) |
| Quarterly | 400/quarter | Monthly (subscription date) |
